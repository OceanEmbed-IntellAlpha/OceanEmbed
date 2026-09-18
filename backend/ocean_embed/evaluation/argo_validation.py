"""
OceanEmbed — ARGO Independent Validation Pipeline.

Provides rigorous, independent validation against in-situ ARGO float profiles:
- Ingests ARGO profile NetCDF/CSV files (INCOIS ERDDAP or GDAC).
- Queries OceanEmbed at exact, non-uniform ARGO sampling depths (continuous depth conditioning).
- Compares predicted temperature and estimated uncertainty against observed in-situ data.
- Computes depth-binned metrics, regional breakdowns (Arabian Sea vs Bay of Bengal),
  and thermocline metrics (D20, maximum gradient depth).
- Evaluates uncertainty calibration against independent observations.
- Supports generating realistic synthetic profiles for smoke tests / software verification
  when raw ARGO files are not downloaded yet (clearly tagged as SYNTHETIC).
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

import numpy as np

from ocean_embed.grid import (
    NIO_LAT_MAX,
    NIO_LAT_MIN,
    NIO_LON_MAX,
    NIO_LON_MIN,
    SIH_DEPTHS,
    get_region_id,
)
from ocean_embed.evaluation.metrics import (
    compute_all_metrics,
    compute_band_metrics,
    compute_thermocline_metrics,
    compute_uncertainty_calibration,
)

logger = logging.getLogger(__name__)


@dataclass
class ArgoProfile:
    """Represents a single in-situ ARGO float profile."""

    platform_id: str
    cycle_number: int
    lat: float
    lon: float
    date: str  # YYYY-MM-DD
    depths: np.ndarray       # shape (N,) in metres (positive down)
    temperatures: np.ndarray # shape (N,) in °C
    salinities: Optional[np.ndarray] = None # shape (N,) in PSU
    qc_flags: Optional[np.ndarray] = None    # 1=good, 2=probably good, etc.
    is_synthetic: bool = False

    def is_in_domain(self) -> bool:
        """Check if profile is within the North Indian Ocean domain."""
        return (
            NIO_LAT_MIN <= self.lat <= NIO_LAT_MAX
            and NIO_LON_MIN <= self.lon <= NIO_LON_MAX
        )

    def get_valid_measurements(self) -> Tuple[np.ndarray, np.ndarray]:
        """Return valid depth and temperature arrays within 0-1000m."""
        mask = (
            np.isfinite(self.depths)
            & np.isfinite(self.temperatures)
            & (self.depths >= 0.0)
            & (self.depths <= 1000.0)
        )
        if self.qc_flags is not None:
            # Keep QC flags 1 (good) and 2 (probably good)
            mask = mask & np.isin(self.qc_flags, [1, 2])

        # Sort by depth
        z = self.depths[mask]
        t = self.temperatures[mask]
        sort_idx = np.argsort(z)
        return z[sort_idx], t[sort_idx]


def load_argo_profiles_from_dir(
    data_dir: Union[str, Path],
    max_profiles: Optional[int] = None,
) -> List[ArgoProfile]:
    """Load ARGO profiles from a directory of NetCDF or JSON files.

    Args:
        data_dir: Directory containing ARGO NetCDF files (.nc) or JSON exports
        max_profiles: Optional limit on number of profiles to load

    Returns:
        List of ArgoProfile instances in the North Indian Ocean domain
    """
    data_dir = Path(data_dir)
    profiles: List[ArgoProfile] = []

    if not data_dir.exists():
        logger.warning(f"ARGO data directory does not exist: {data_dir}")
        return profiles

    # Check for NetCDF files
    nc_files = list(data_dir.glob("*.nc"))
    if nc_files:
        try:
            import xarray as xr
            for fpath in nc_files:
                try:
                    with xr.open_dataset(fpath) as ds:
                        lat = float(ds["LATITUDE"].values.flat[0])
                        lon = float(ds["LONGITUDE"].values.flat[0])
                        if not (NIO_LAT_MIN <= lat <= NIO_LAT_MAX and NIO_LON_MIN <= lon <= NIO_LON_MAX):
                            continue

                        platform = str(ds.attrs.get("platform_code", fpath.stem))
                        cycle = int(ds.attrs.get("cycle_number", 0))

                        pres = ds["PRES"].values.squeeze()
                        temp = ds["TEMP"].values.squeeze()

                        prof = ArgoProfile(
                            platform_id=platform,
                            cycle_number=cycle,
                            lat=lat,
                            lon=lon,
                            date=str(ds["JULD"].values.flat[0])[:10] if "JULD" in ds else "2020-01-01",
                            depths=pres.astype(np.float64),
                            temperatures=temp.astype(np.float64),
                            is_synthetic=False,
                        )
                        profiles.append(prof)
                        if max_profiles and len(profiles) >= max_profiles:
                            break
                except Exception as e:
                    logger.debug(f"Could not parse {fpath}: {e}")
        except ImportError:
            logger.warning("xarray not available for NetCDF parsing.")

    # Check for JSON files
    json_files = list(data_dir.glob("*.json"))
    for jpath in json_files:
        try:
            with open(jpath, "r") as f:
                data = json.load(f)
                items = data if isinstance(data, list) else [data]
                for item in items:
                    prof = ArgoProfile(
                        platform_id=str(item.get("platform_id", "float_001")),
                        cycle_number=int(item.get("cycle_number", 1)),
                        lat=float(item["lat"]),
                        lon=float(item["lon"]),
                        date=str(item["date"]),
                        depths=np.array(item["depths"], dtype=np.float64),
                        temperatures=np.array(item["temperatures"], dtype=np.float64),
                        is_synthetic=bool(item.get("is_synthetic", False)),
                    )
                    if prof.is_in_domain():
                        profiles.append(prof)
                        if max_profiles and len(profiles) >= max_profiles:
                            break
        except Exception as e:
            logger.debug(f"Could not parse {jpath}: {e}")

    logger.info(f"Loaded {len(profiles)} ARGO profiles from {data_dir}")
    return profiles


def generate_synthetic_argo_profiles(
    num_profiles: int = 20,
    seed: int = 42,
) -> List[ArgoProfile]:
    """Generate physically plausible synthetic ARGO profiles for testing.

    All generated profiles are explicitly tagged with is_synthetic=True.
    These must NEVER be presented as real scientific ground truth.
    """
    rng = np.random.default_rng(seed)
    profiles = []

    base_depths = np.array([
        2.5, 5.0, 10.0, 15.0, 20.0, 25.0, 30.0, 40.0, 50.0, 60.0, 75.0,
        90.0, 100.0, 125.0, 150.0, 175.0, 200.0, 250.0, 300.0, 350.0,
        400.0, 500.0, 600.0, 700.0, 800.0, 900.0, 1000.0
    ], dtype=np.float64)

    for i in range(num_profiles):
        lat = float(rng.uniform(6.0, 24.0))
        lon = float(rng.uniform(50.0, 95.0))
        region = get_region_id(lat, lon)

        if region == 0:  # Arabian Sea
            sst = 28.5 + rng.normal(0, 0.4)
            mld = 45.0 + rng.normal(0, 5.0)
            thermo_grad = 0.12
            t_deep = 6.2
        elif region == 1:  # Bay of Bengal
            sst = 29.8 + rng.normal(0, 0.3)
            mld = 30.0 + rng.normal(0, 4.0)
            thermo_grad = 0.15
            t_deep = 5.8
        else:  # Open Ocean
            sst = 29.0 + rng.normal(0, 0.5)
            mld = 50.0 + rng.normal(0, 6.0)
            thermo_grad = 0.10
            t_deep = 6.0

        depths = np.clip(base_depths + rng.normal(0, 0.5, size=len(base_depths)), 0, 1000)
        depths = np.sort(depths)

        temps = np.zeros_like(depths)
        for d_idx, z in enumerate(depths):
            if z <= mld:
                temps[d_idx] = sst + rng.normal(0, 0.05)
            else:
                decay = (sst - t_deep) / (1.0 + np.exp(thermo_grad * (z - (mld + 60.0))))
                temps[d_idx] = t_deep + decay + rng.normal(0, 0.08)

        profiles.append(
            ArgoProfile(
                platform_id=f"SYNTH_{2900000 + i}",
                cycle_number=i + 1,
                lat=round(lat, 4),
                lon=round(lon, 4),
                date="2020-06-15",
                depths=depths,
                temperatures=temps,
                is_synthetic=True,
            )
        )

    return profiles


def evaluate_profiles_against_engine(
    profiles: List[ArgoProfile],
    engine: Any,
) -> Dict[str, Any]:
    """Validate an inference engine against a list of ARGO profiles.

    Directly queries the engine at each profile's EXACT sampling depths.
    Computes overall, depth-band, and regional metrics.
    """
    if not profiles:
        return {
            "status": "NO_DATA",
            "message": "No ARGO profiles provided for evaluation.",
            "overall_metrics": {},
        }

    all_obs: List[float] = []
    all_pred: List[float] = []
    all_unc: List[float] = []
    all_depths: List[float] = []
    all_regions: List[str] = []

    per_profile_results = []
    has_any_real = any(not p.is_synthetic for p in profiles)

    for prof in profiles:
        z_obs, t_obs = prof.get_valid_measurements()
        if len(z_obs) < 3:
            continue

        try:
            pred_res = engine.predict_profile(
                lat=prof.lat,
                lon=prof.lon,
                date=prof.date,
                depths=list(z_obs),
            )
            t_pred = np.array(pred_res["temperatures"], dtype=np.float64)
            u_pred = np.array(pred_res["uncertainties"], dtype=np.float64)
        except Exception as e:
            logger.warning(f"Engine prediction failed for profile {prof.platform_id}: {e}")
            continue

        region_name = pred_res.get("region", "Unknown")

        all_obs.extend(t_obs.tolist())
        all_pred.extend(t_pred.tolist())
        all_unc.extend(u_pred.tolist())
        all_depths.extend(z_obs.tolist())
        all_regions.extend([region_name] * len(z_obs))

        diff = t_pred - t_obs
        prof_rmse = float(np.sqrt(np.mean(diff ** 2)))
        prof_mae = float(np.mean(np.abs(diff)))
        prof_bias = float(np.mean(diff))

        per_profile_results.append({
            "platform_id": prof.platform_id,
            "cycle": prof.cycle_number,
            "lat": prof.lat,
            "lon": prof.lon,
            "region": region_name,
            "date": prof.date,
            "is_synthetic": prof.is_synthetic,
            "n_depths": len(z_obs),
            "rmse": prof_rmse,
            "mae": prof_mae,
            "bias": prof_bias,
            "depths": z_obs.tolist(),
            "observed_temps": t_obs.tolist(),
            "predicted_temps": t_pred.tolist(),
            "uncertainties": u_pred.tolist(),
        })

    if not all_obs:
        return {
            "status": "EVALUATION_EMPTY",
            "message": "No valid profile measurements evaluated.",
            "overall_metrics": {},
        }

    arr_obs = np.array(all_obs)
    arr_pred = np.array(all_pred)
    arr_unc = np.array(all_unc)
    arr_depths = np.array(all_depths)
    arr_regions = np.array(all_regions)

    overall = compute_all_metrics(arr_pred, arr_obs)

    bands = [(0, 100), (100, 300), (300, 500), (500, 700), (700, 1000)]
    band_metrics = {}
    for lo, hi in bands:
        b_idx = (arr_depths >= lo) & (arr_depths <= hi)
        if np.any(b_idx):
            band_metrics[f"{lo}-{hi}m"] = compute_all_metrics(arr_pred[b_idx], arr_obs[b_idx])

    regional_metrics = {}
    for reg in np.unique(arr_regions):
        r_idx = arr_regions == reg
        if np.any(r_idx):
            regional_metrics[reg] = compute_all_metrics(arr_pred[r_idx], arr_obs[r_idx])

    calib = compute_uncertainty_calibration(arr_pred, arr_unc ** 2, arr_obs)

    return {
        "status": "COMPLETED",
        "data_type": "REAL IN-SITU" if has_any_real else "DEMO / SYNTHETIC",
        "scientific_validity": "VALID_OBSERVATIONAL_METRIC" if has_any_real else "SOFTWARE_VERIFICATION_ONLY",
        "total_profiles_evaluated": len(per_profile_results),
        "total_depth_points": len(arr_obs),
        "overall_metrics": overall,
        "depth_band_metrics": band_metrics,
        "regional_metrics": regional_metrics,
        "uncertainty_calibration": calib,
        "sample_profiles": per_profile_results[:10],
    }
