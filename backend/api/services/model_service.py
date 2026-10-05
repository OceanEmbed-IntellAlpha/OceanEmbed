"""
ModelService — Production inference singleton for OceanEmbed v2.

Loads:
  - runs/_final_v2/model_v2.pt (BaselineModel U-Net, 7 surface channels)
  - data/processed/surface_features.zarr
  - data/processed/normalization_stats_v3.json
  - ClimatologyService (climatology_2010_2020.zarr)

Supports:
  - Vertical profile reconstruction at arbitrary (lat, lon, date)
  - 2D horizontal map slices at arbitrary depth and date
  - Timeseries extraction across date ranges
  - Regional statistics aggregation
  - Frontend surface field queries
"""

from __future__ import annotations

import base64
from collections import OrderedDict
from concurrent.futures import ThreadPoolExecutor
import logging
import os
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import torch
import xarray as xr

_BACKEND = Path(__file__).resolve().parents[2]
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

import json

SURFACE_VARS = ["analysed_sst", "sos", "sla", "u", "v", "uwnd", "vwnd"]

def load_normalization_stats(path):
    with open(path) as f:
        return json.load(f)

def apply_surface_norm(data, stats, channel_names):
    out = data.copy()
    for i, c in enumerate(channel_names):
        # Support both nested ('surface') and flat stats formats
        c_stats = stats["surface"][c] if "surface" in stats else stats[c]
        m = c_stats["mean"]
        s = c_stats["std"]
        if s > 0:
            out[:, i] = (out[:, i] - m) / s
        else:
            out[:, i] = out[:, i] - m
    return out
from ocean_embed.grid import SIH_STANDARD_DEPTHS, GLORYS_NATIVE_DEPTHS, SIH_DEPTHS
from ocean_embed.models.baseline import BaselineModel
from backend.api.services.climatology_service import ClimatologyService

logger = logging.getLogger(__name__)


# Predefined oceanographic regions in North Indian Ocean
PREDEFINED_REGIONS = {
    "arabian_sea": {
        "name": "Arabian Sea",
        "lat_range": (8.0, 26.0),
        "lon_range": (50.0, 77.0),
    },
    "bay_of_bengal": {
        "name": "Bay of Bengal",
        "lat_range": (8.0, 23.0),
        "lon_range": (78.0, 98.0),
    },
    "open_ocean": {
        "name": "Equatorial Open Ocean",
        "lat_range": (5.0, 10.0),
        "lon_range": (60.0, 95.0),
    },
}


class ModelService:
    """Singleton service managing model weights and data stores."""

    _instance: Optional[ModelService] = None

    def __init__(
        self,
        checkpoint_path: Path | str,
        surface_zarr_path: Path | str,
        stats_path: Path | str,
        climatology_path: Path | str,
        device: Optional[str] = None,
    ):
        t0 = time.perf_counter()
        self.root = Path(__file__).resolve().parents[3]
        self.checkpoint_path = Path(checkpoint_path)
        self.surface_zarr_path = surface_zarr_path
        self.stats_path = Path(stats_path)
        self.climatology_path = Path(climatology_path)

        if not self.checkpoint_path.exists():
            raise FileNotFoundError(
                f"Model checkpoint not found at {self.checkpoint_path}. "
                "Ensure production model weights runs/_final_v2/model_v2.pt are downloaded."
            )

        # Device selection
        if device is None:
            self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        else:
            self.device = torch.device(device)
        logger.info(f"ModelService using device: {self.device}")

        # 1. Initialize Climatology Service
        self.clim_service = ClimatologyService.get_instance(self.climatology_path)

        # 2. Load Normalization Stats
        logger.info(f"Loading normalization stats from {self.stats_path}...")
        self.stats = load_normalization_stats(self.stats_path)

        # 3. Open Surface Features Zarr (Supports local disk or Cloudflare R2 streaming)
        zarr_str = str(self.surface_zarr_path)
        if zarr_str.startswith("s3://") or not Path(zarr_str).exists():
            from backend.storage.r2 import get_s3fs, settings
            import s3fs
            fs = get_s3fs()
            clean_s3 = zarr_str.replace("s3://", "") if zarr_str.startswith("s3://") else f"{settings.r2_bucket_name}/zarr/surface_features.zarr"
            logger.info(f"Streaming surface features from Cloudflare R2: s3://{clean_s3}")
            mapper = s3fs.S3Map(root=clean_s3, s3=fs, check=False)
            self._sf_ds = xr.open_zarr(mapper, consolidated=True)
        else:
            local_p = Path(self.surface_zarr_path)
            logger.info(f"Opening surface features store from {local_p}...")
            self._sf_ds = xr.open_zarr(str(local_p))

        self.lats = self._sf_ds.latitude.values.astype(np.float32)   # 101 points (5.0 to 30.0)
        self.lons = self._sf_ds.longitude.values.astype(np.float32) # 241 points (45.0 to 105.0)
        self.depths = np.asarray(GLORYS_NATIVE_DEPTHS, dtype=np.float32)
        self.standard_depths = np.asarray(SIH_STANDARD_DEPTHS, dtype=np.float32)

        # Date lookup table
        time_vals = self._sf_ds.time.values
        self.dates_available: List[str] = [str(t)[:10] for t in time_vals]
        self.date_to_idx: Dict[str, int] = {d: i for i, d in enumerate(self.dates_available)}
        self.date_min: str = self.dates_available[0]
        self.date_max: str = self.dates_available[-1]
        logger.info(
            f"Surface store opened: {len(self.dates_available)} dates available "
            f"({self.date_min} to {self.date_max})"
        )

        # 4. Load Neural Network Weights
        logger.info(f"Loading v2 U-Net weights from {self.checkpoint_path}...")
        self.model = BaselineModel(
            in_channels=7,
            out_depths=15,
            base_channels=32,
            encoder_depth=4,
            dropout=0.0,  # inference mode
        )
        ckpt = torch.load(self.checkpoint_path, map_location="cpu", weights_only=False)
        self.model.load_state_dict(ckpt["model_state_dict"])
        self.model = self.model.to(self.device).eval()

        # In-memory LRU caches for ultra-fast repeated queries
        self._surface_cache: OrderedDict[int, np.ndarray] = OrderedDict()
        self._3d_pred_cache: OrderedDict[str, Tuple[np.ndarray, np.ndarray, np.ndarray, str]] = OrderedDict()

        load_sec = time.perf_counter() - t0
        logger.info(f"ModelService initialization complete in {load_sec:.2f}s!")

    @classmethod
    def get_instance(cls) -> ModelService:
        if cls._instance is None:
            root = Path(__file__).resolve().parents[3]
            from backend.config import settings
            bucket = settings.r2_bucket_name or "oceanembed"

            # 1. Surface Features Zarr (stream from R2 if not local)
            surface_zarr = root / "data" / "processed" / "surface_features.zarr"
            if surface_zarr.exists():
                surface_path = surface_zarr
            else:
                surface_path = f"s3://{bucket}/zarr/surface_features.zarr"

            # 2. Climatology Zarr (stream from R2 if not local)
            clim_zarr = root / "data" / "processed" / "climatology_2010_2020.zarr"
            if clim_zarr.exists():
                clim_path = clim_zarr
            else:
                clim_path = f"s3://{bucket}/zarr/climatology_2010_2020.zarr"

            # 3. Normalization stats (fetch from R2 if not local)
            stats_file = root / "data" / "processed" / "normalization_stats_v3.json"
            if not stats_file.exists():
                from backend.storage.r2 import get_r2_client
                logger.info("Fetching normalization_stats_v3.json from Cloudflare R2...")
                r2 = get_r2_client()
                stats_file.parent.mkdir(parents=True, exist_ok=True)
                r2.download_file(bucket, "metadata/normalization_stats_v3.json", str(stats_file))

            # 4. Model checkpoint (fetch from R2 if not local)
            model_file = root / "runs" / "_final_v2" / "model_v2.pt"
            if not model_file.exists():
                from backend.storage.r2 import get_r2_client
                logger.info("Fetching model_v2.pt from Cloudflare R2...")
                r2 = get_r2_client()
                model_file.parent.mkdir(parents=True, exist_ok=True)
                r2.download_file(bucket, "models/model_v2.pt", str(model_file))

            cls._instance = cls(
                checkpoint_path=model_file,
                surface_zarr_path=surface_path,
                stats_path=stats_file,
                climatology_path=clim_path,
            )
        return cls._instance

    # ── Coordinates & Date Helpers ──────────────────────────────────────────

    def find_nearest_lat_lon(self, lat: float, lon: float) -> Tuple[int, int, float, float]:
        """Find nearest grid indices and corresponding coordinates."""
        lat_idx = int(np.argmin(np.abs(self.lats - lat)))
        lon_idx = int(np.argmin(np.abs(self.lons - lon)))
        return lat_idx, lon_idx, float(self.lats[lat_idx]), float(self.lons[lon_idx])

    def find_nearest_date(self, target_date: str) -> Tuple[int, str]:
        """Find exact or nearest available date in the dataset."""
        if target_date in self.date_to_idx:
            return self.date_to_idx[target_date], target_date

        target_dt = datetime.strptime(target_date[:10], "%Y-%m-%d")
        min_dt = datetime.strptime(self.date_min, "%Y-%m-%d")
        max_dt = datetime.strptime(self.date_max, "%Y-%m-%d")

        if target_dt < min_dt or target_dt > max_dt:
            raise ValueError(
                f"Requested date {target_date} is outside the dataset coverage ({self.date_min} to {self.date_max})"
            )

        # Nearest available
        closest_idx = 0
        min_diff = float("inf")
        for i, d in enumerate(self.dates_available):
            dt = datetime.strptime(d, "%Y-%m-%d")
            diff = abs((dt - target_dt).total_seconds())
            if diff < min_diff:
                min_diff = diff
                closest_idx = i

        return closest_idx, self.dates_available[closest_idx]

    def get_surface_channels(self, time_idx: int) -> np.ndarray:
        """Fetch all 7 surface channels in parallel from Cloudflare R2 with LRU cache."""
        if time_idx in self._surface_cache:
            self._surface_cache.move_to_end(time_idx)
            return self._surface_cache[time_idx]

        def _fetch_var(v: str) -> np.ndarray:
            return self._sf_ds[v].isel(time=time_idx).values.astype(np.float32)

        with ThreadPoolExecutor(max_workers=7) as executor:
            raw_surface = np.stack(list(executor.map(_fetch_var, SURFACE_VARS)), axis=0)  # (7, 101, 241)

        self._surface_cache[time_idx] = raw_surface
        if len(self._surface_cache) > 50:
            self._surface_cache.popitem(last=False)

        return raw_surface

    # ── Core 3D Reconstruction ──────────────────────────────────────────────

    def predict_full_3d(self, date_str: str) -> Tuple[np.ndarray, np.ndarray, np.ndarray, str]:
        """Generate full (15, 101, 241) 3D temperature fields in °C.
        Uses in-memory LRU cache and parallel R2 chunk streaming for sub-second latency.
        """
        time_idx, date_used = self.find_nearest_date(date_str)

        # 1. Return immediately if already computed for this date (<0.001 ms)
        if date_used in self._3d_pred_cache:
            self._3d_pred_cache.move_to_end(date_used)
            return self._3d_pred_cache[date_used]

        # 2. Extract 7 surface channels (parallel fetch from R2 or from RAM cache)
        raw_surface = self.get_surface_channels(time_idx)

        # Normalization
        norm_surface = apply_surface_norm(
            raw_surface[np.newaxis, ...], self.stats, channel_names=SURFACE_VARS
        )[0]  # (7, 101, 241)

        # Replace NaNs with 0.0
        np.nan_to_num(norm_surface, copy=False, nan=0.0)

        # Model forward
        x_tensor = torch.from_numpy(norm_surface).unsqueeze(0).to(self.device)  # (1, 7, 101, 241)
        with torch.no_grad():
            pred_anom_tensor = self.model(x_tensor)  # (1, 15, 101, 241)

        anomaly_3d = pred_anom_tensor.squeeze(0).float().cpu().numpy()  # (15, 101, 241)

        # Climatology lookup (cached in ClimatologyService)
        climatology_3d = self.clim_service.get_climatology_3d(date_used).copy()  # (15, 101, 241)

        # Total temperature = climatology + anomaly
        total_temperature_3d = climatology_3d + anomaly_3d

        # Mask land points with NaN
        ocean_mask_2d = self.clim_service.ocean_mask
        for d in range(15):
            total_temperature_3d[d, ~ocean_mask_2d] = np.nan
            climatology_3d[d, ~ocean_mask_2d] = np.nan
            anomaly_3d[d, ~ocean_mask_2d] = np.nan

        res = (total_temperature_3d, climatology_3d, anomaly_3d, date_used)
        self._3d_pred_cache[date_used] = res
        if len(self._3d_pred_cache) > 30:
            self._3d_pred_cache.popitem(last=False)

        return res

    # ── Endpoint Service Methods ────────────────────────────────────────────

    def predict_profile(
        self,
        lat: float,
        lon: float,
        date_str: str,
        custom_depths: Optional[List[float]] = None,
    ) -> Dict[str, Any]:
        """Compute vertical temperature profile at specific point."""
        lat_idx, lon_idx, near_lat, near_lon = self.find_nearest_lat_lon(lat, lon)
        temp_3d, clim_3d, anom_3d, date_used = self.predict_full_3d(date_str)

        native_temps = temp_3d[:, lat_idx, lon_idx]
        native_clims = clim_3d[:, lat_idx, lon_idx]
        native_anoms = anom_3d[:, lat_idx, lon_idx]

        target_depths = custom_depths if custom_depths is not None else list(SIH_STANDARD_DEPTHS)

        # 1D vertical interpolation across standard/custom depths
        profile_list = []
        for z in target_depths:
            z_float = float(z)
            t_val = float(np.interp(z_float, self.depths, native_temps))
            c_val = float(np.interp(z_float, self.depths, native_clims))
            a_val = float(np.interp(z_float, self.depths, native_anoms))

            # Land check
            if np.isnan(t_val):
                raise ValueError(f"Requested coordinate ({lat}, {lon}) is over land or outside valid ocean mask.")

            profile_list.append({
                "depth_m": round(z_float, 2),
                "temperature_c": round(t_val, 3),
                "climatology_c": round(c_val, 3),
                "anomaly_c": round(a_val, 3),
            })

        return {
            "query": {"lat": lat, "lon": lon, "date": date_str},
            "nearest_grid_point": {
                "lat": near_lat,
                "lon": near_lon,
                "date_used": date_used,
                "lat_idx": lat_idx,
                "lon_idx": lon_idx,
            },
            "profile": profile_list,
        }

    def predict_frontend_profile(
        self, lat: float, lon: float, date_str: str
    ) -> Dict[str, Any]:
        """Return profile matching frontend SubsurfaceProfile contract."""
        res = self.predict_profile(lat, lon, date_str, custom_depths=None)
        temps = [p["temperature_c"] for p in res["profile"]]
        anoms = [p["anomaly_c"] for p in res["profile"]]
        clims = [p["climatology_c"] for p in res["profile"]]
        return {
            "lat": lat,
            "lon": lon,
            "date": date_str,
            "depths": [round(float(d), 2) for d in SIH_DEPTHS],
            "temperature": temps,
            "anomaly": anoms,
            "climatology": clims,
            "source": "model",
        }

    def predict_map(
        self,
        date_str: str,
        depth_m: float,
        bbox: Optional[Dict[str, float]] = None,
        fmt: str = "json",
    ) -> Dict[str, Any]:
        """Compute 2D map at a specific depth and date."""
        temp_3d, clim_3d, anom_3d, date_used = self.predict_full_3d(date_str)

        # Interpolate along depth axis if depth_m is between native levels
        d_idx = int(np.argmin(np.abs(self.depths - depth_m)))
        if abs(self.depths[d_idx] - depth_m) < 0.05:
            temp_2d = temp_3d[d_idx]
            clim_2d = clim_3d[d_idx]
            anom_2d = anom_3d[d_idx]
        else:
            from scipy.interpolate import interp1d
            temp_2d = interp1d(self.depths, temp_3d, axis=0, bounds_error=False, fill_value="extrapolate")(depth_m).astype(np.float32)
            clim_2d = interp1d(self.depths, clim_3d, axis=0, bounds_error=False, fill_value="extrapolate")(depth_m).astype(np.float32)
            anom_2d = interp1d(self.depths, anom_3d, axis=0, bounds_error=False, fill_value="extrapolate")(depth_m).astype(np.float32)

        # Sub-select bounding box if requested
        if bbox is not None:
            lat_mask = (self.lats >= bbox.get("lat_min", 5.0)) & (self.lats <= bbox.get("lat_max", 30.0))
            lon_mask = (self.lons >= bbox.get("lon_min", 45.0)) & (self.lons <= bbox.get("lon_max", 105.0))
            sub_lats = self.lats[lat_mask]
            sub_lons = self.lons[lon_mask]
            temp_2d = temp_2d[np.ix_(lat_mask, lon_mask)]
            clim_2d = clim_2d[np.ix_(lat_mask, lon_mask)]
            anom_2d = anom_2d[np.ix_(lat_mask, lon_mask)]
        else:
            sub_lats = self.lats
            sub_lons = self.lons

        # Compute summary stats on valid ocean pixels
        valid_vals = temp_2d[np.isfinite(temp_2d)]
        if len(valid_vals) > 0:
            stats = {
                "min_c": round(float(np.min(valid_vals)), 2),
                "max_c": round(float(np.max(valid_vals)), 2),
                "mean_c": round(float(np.mean(valid_vals)), 2),
                "std_c": round(float(np.std(valid_vals)), 2),
            }
        else:
            stats = {"min_c": 0.0, "max_c": 0.0, "mean_c": 0.0, "std_c": 0.0}

        if fmt == "base64":
            t_b64 = base64.b64encode(temp_2d.astype(np.float32).tobytes()).decode("utf-8")
            c_b64 = base64.b64encode(clim_2d.astype(np.float32).tobytes()).decode("utf-8")
            a_b64 = base64.b64encode(anom_2d.astype(np.float32).tobytes()).decode("utf-8")
            return {
                "date": date_used,
                "depth_m": depth_m,
                "lat": [round(float(x), 2) for x in sub_lats],
                "lon": [round(float(x), 2) for x in sub_lons],
                "stats": stats,
                "format": "base64",
                "temperature_b64": t_b64,
                "climatology_b64": c_b64,
                "anomaly_b64": a_b64,
                "shape": list(temp_2d.shape),
            }
        else:
            # Replace NaNs with None for standard JSON serialization
            def to_json_grid(arr: np.ndarray) -> List[List[Optional[float]]]:
                return [
                    [None if np.isnan(val) else round(float(val), 2) for val in row]
                    for row in arr
                ]

            return {
                "date": date_used,
                "depth_m": depth_m,
                "lat": [round(float(x), 2) for x in sub_lats],
                "lon": [round(float(x), 2) for x in sub_lons],
                "temperature_c": to_json_grid(temp_2d),
                "climatology_c": to_json_grid(clim_2d),
                "anomaly_c": to_json_grid(anom_2d),
                "stats": stats,
                "format": "json",
            }

    def get_anomaly_field(
        self,
        date: str,
        depth_m: float = 0.0,
    ) -> Dict[str, Any]:
        """Return 2D thermal anomaly magnitude field (|T_predicted - T_climatology|) in °C.

        Dynamically scales colorRange max based on the actual maximum anomaly
        present in the model's output for the selected day.
        """
        _, _, anom_3d, date_used = self.predict_full_3d(date)

        # Interpolate along depth axis if depth_m is between native levels
        d_idx = int(np.argmin(np.abs(self.depths - depth_m)))
        if abs(self.depths[d_idx] - depth_m) < 0.05:
            anom_2d = anom_3d[d_idx]
        else:
            from scipy.interpolate import interp1d
            anom_2d = interp1d(self.depths, anom_3d, axis=0, bounds_error=False, fill_value="extrapolate")(depth_m).astype(np.float32)

        # Anomaly magnitude in °C (|T_anomaly|)
        raw = np.abs(anom_2d)
        raw[~self.clim_service.ocean_mask] = np.nan

        valid_vals = raw[np.isfinite(raw)]
        if len(valid_vals) > 0:
            # Use robust 2nd to 98th percentile scaling for vibrant basin-wide contrast
            p_min = float(np.nanpercentile(valid_vals, 2))
            p_max = float(np.nanpercentile(valid_vals, 98))
            vmin = round(p_min, 3)
            vmax = round(p_max, 3)
            if vmax <= vmin + 0.005:
                vmax = vmin + 0.05
        else:
            vmin = 0.0
            vmax = 1.0

        grid = [
            [None if np.isnan(val) else round(float(val), 3) for val in row]
            for row in raw
        ]

        bbox_tuple = (45.0, 5.0, 105.0, 30.0)
        return {
            "variable": "thermal_anomaly",
            "date": date_used,
            "depth_m": depth_m,
            "bbox": bbox_tuple,
            "lat": [round(float(x), 2) for x in self.lats],
            "lon": [round(float(x), 2) for x in self.lons],
            "values": grid,
            "grid": grid,
            "unit": "°C",
            "vmin": vmin,
            "vmax": vmax,
            "colorRange": (vmin, vmax),
            "u": None,
            "v": None,
        }

    def get_frontend_surface_field(
        self,
        variable: str,
        date_str: str,
        depth_m: float = 0.0,
        bbox_str: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Extract raw or reconstructed surface field matching frontend SurfaceField."""
        time_idx, date_used = self.find_nearest_date(date_str)
        var_lower = variable.lower().strip()

        # Variable mapping using parallel cached surface channels
        # Supported: 'sst', 'sss', 'ssh', 'currents', 'winds', 'subsurface_temp', 'thermal_anomaly', 'embedding'
        if var_lower in {"thermal_anomaly", "anomaly"}:
            return self.get_anomaly_field(date=date_str, depth_m=depth_m)
        elif var_lower == "confidence":
            raise ValueError("The 'confidence' variable has been removed. Use 'thermal_anomaly' instead.")
        elif var_lower in {"sst", "analysed_sst"}:
            surf = self.get_surface_channels(time_idx)
            raw = surf[0]
            unit = "°C"
            color_range = (24.0, 32.0)
            u_grid = v_grid = None
        elif var_lower in {"sss", "sos"}:
            surf = self.get_surface_channels(time_idx)
            raw = surf[1]
            unit = "PSU"
            color_range = (32.0, 37.0)
            u_grid = v_grid = None
        elif var_lower in {"ssh", "sla"}:
            surf = self.get_surface_channels(time_idx)
            raw = surf[2]
            unit = "m"
            color_range = (-0.3, 0.3)
            u_grid = v_grid = None
        elif var_lower == "currents":
            surf = self.get_surface_channels(time_idx)
            u_arr = surf[3]
            v_arr = surf[4]
            raw = np.sqrt(u_arr ** 2 + v_arr ** 2)
            # Mask land just in case
            raw[~self.clim_service.ocean_mask] = np.nan
            unit = "m/s"
            color_range = (0.0, 1.5)
            u_grid = [[None if np.isnan(x) else round(float(x), 3) for x in row] for row in u_arr]
            v_grid = [[None if np.isnan(x) else round(float(x), 3) for x in row] for row in v_arr]
        elif var_lower == "winds":
            surf = self.get_surface_channels(time_idx)
            u_arr = surf[5]
            v_arr = surf[6]
            raw = np.sqrt(u_arr ** 2 + v_arr ** 2)
            # Strictly mask land out of atmospheric winds
            raw[~self.clim_service.ocean_mask] = np.nan
            unit = "m/s"
            color_range = (0.0, 15.0)
            u_grid = [[None if np.isnan(x) else round(float(x), 2) for x in row] for row in u_arr]
            v_grid = [[None if np.isnan(x) else round(float(x), 2) for x in row] for row in v_arr]
        elif var_lower in {"subsurface_temp", "subsurface"}:
            temp_3d, _, _, _ = self.predict_full_3d(date_str)
            d_idx = int(np.argmin(np.abs(self.depths - depth_m)))
            if abs(self.depths[d_idx] - depth_m) < 0.05:
                raw = temp_3d[d_idx]
            else:
                from scipy.interpolate import interp1d
                raw = interp1d(self.depths, temp_3d, axis=0, bounds_error=False, fill_value="extrapolate")(depth_m).astype(np.float32)
            unit = "°C"
            color_range = (10.0, 28.0)
            u_grid = v_grid = None
        elif var_lower == "embedding":
            # Extract first layer CNN features
            raw_surface = np.stack([self._sf_ds[var].isel(time=time_idx).values.astype(np.float32) for var in SURFACE_VARS], axis=0)
            norm_surface = apply_surface_norm(raw_surface[np.newaxis, ...], self.stats, channel_names=SURFACE_VARS)[0]
            np.nan_to_num(norm_surface, copy=False, nan=0.0)
            x_tensor = torch.from_numpy(norm_surface).unsqueeze(0).to(self.device)
            with torch.no_grad():
                features, _ = self.model.encoders[0](x_tensor)
                # Mean activation across feature maps
                emb = features.squeeze(0).mean(dim=0).cpu().numpy()
            emb[~self.clim_service.ocean_mask] = np.nan
            raw = emb
            unit = "activation"
            color_range = (float(np.nanmin(raw)), float(np.nanmax(raw)))
            u_grid = v_grid = None
        else:
            raise ValueError(f"Unknown surface variable: {variable}. Supported: sst, sss, ssh, currents, winds, subsurface_temp, thermal_anomaly, embedding")

        grid = [
            [None if np.isnan(val) else round(float(val), 3) for val in row]
            for row in raw
        ]

        bbox_tuple = (45.0, 5.0, 105.0, 30.0)
        return {
            "variable": var_lower,
            "date": date_used,
            "bbox": bbox_tuple,
            "lat": [round(float(x), 2) for x in self.lats],
            "lon": [round(float(x), 2) for x in self.lons],
            "grid": grid,
            "unit": unit,
            "colorRange": color_range,
            "u": u_grid,
            "v": v_grid,
        }

    def predict_timeseries(
        self,
        lat: float,
        lon: float,
        depth_m: float,
        date_start: str,
        date_end: str,
    ) -> Dict[str, Any]:
        """Extract temperature timeseries over a date range."""
        lat_idx, lon_idx, near_lat, near_lon = self.find_nearest_lat_lon(lat, lon)
        d_idx = int(np.argmin(np.abs(self.depths - depth_m)))

        dt_start = datetime.strptime(date_start[:10], "%Y-%m-%d")
        dt_end = datetime.strptime(date_end[:10], "%Y-%m-%d")

        if dt_end < dt_start:
            raise ValueError("date_end must be after date_start")

        # Cap timeseries to at most 365 days per request for performance
        if (dt_end - dt_start).days > 366:
            dt_end = dt_start + timedelta(days=365)

        dates_out = []
        temps_out = []
        clims_out = []
        anoms_out = []

        curr = dt_start
        while curr <= dt_end:
            d_str = curr.strftime("%Y-%m-%d")
            if d_str in self.date_to_idx:
                temp_3d, clim_3d, anom_3d, _ = self.predict_full_3d(d_str)
                t_val = float(np.interp(depth_m, self.depths, temp_3d[:, lat_idx, lon_idx]))
                c_val = float(np.interp(depth_m, self.depths, clim_3d[:, lat_idx, lon_idx]))
                a_val = float(np.interp(depth_m, self.depths, anom_3d[:, lat_idx, lon_idx]))

                dates_out.append(d_str)
                temps_out.append(round(0.0 if np.isnan(t_val) else t_val, 3))
                clims_out.append(round(0.0 if np.isnan(c_val) else c_val, 3))
                anoms_out.append(round(0.0 if np.isnan(a_val) else a_val, 3))

            curr += timedelta(days=1)

        return {
            "lat": near_lat,
            "lon": near_lon,
            "depth_m": round(float(depth_m), 2),
            "dates": dates_out,
            "temperature_c": temps_out,
            "climatology_c": clims_out,
            "anomaly_c": anoms_out,
        }

    def predict_regions(
        self,
        date_str: str,
        depth_m: float,
        region_ids: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """Compute regional summary statistics."""
        temp_3d, clim_3d, anom_3d, date_used = self.predict_full_3d(date_str)
        d_idx = int(np.argmin(np.abs(self.depths - depth_m)))
        if abs(self.depths[d_idx] - depth_m) < 0.05:
            temp_2d = temp_3d[d_idx]
            clim_2d = clim_3d[d_idx]
            anom_2d = anom_3d[d_idx]
        else:
            from scipy.interpolate import interp1d
            temp_2d = interp1d(self.depths, temp_3d, axis=0, bounds_error=False, fill_value="extrapolate")(depth_m).astype(np.float32)
            clim_2d = interp1d(self.depths, clim_3d, axis=0, bounds_error=False, fill_value="extrapolate")(depth_m).astype(np.float32)
            anom_2d = interp1d(self.depths, anom_3d, axis=0, bounds_error=False, fill_value="extrapolate")(depth_m).astype(np.float32)

        selected_regions = region_ids or list(PREDEFINED_REGIONS.keys())
        out_regions = []

        for r_id in selected_regions:
            r_info = PREDEFINED_REGIONS.get(r_id)
            if not r_info:
                continue

            lat_min, lat_max = r_info["lat_range"]
            lon_min, lon_max = r_info["lon_range"]

            lat_mask = (self.lats >= lat_min) & (self.lats <= lat_max)
            lon_mask = (self.lons >= lon_min) & (self.lons <= lon_max)

            sub_temp = temp_2d[np.ix_(lat_mask, lon_mask)]
            sub_clim = clim_2d[np.ix_(lat_mask, lon_mask)]
            sub_anom = anom_2d[np.ix_(lat_mask, lon_mask)]

            valid = np.isfinite(sub_temp)
            if valid.sum() > 0:
                mean_t = float(np.mean(sub_temp[valid]))
                mean_c = float(np.mean(sub_clim[valid]))
                mean_a = float(np.mean(sub_anom[valid]))
                diff = sub_temp[valid] - sub_clim[valid]
                rmse = float(np.sqrt(np.mean(diff ** 2)))
            else:
                mean_t = mean_c = mean_a = rmse = 0.0

            out_regions.append({
                "region_id": r_id,
                "region_name": r_info["name"],
                "mean_temperature_c": round(mean_t, 2),
                "mean_anomaly_c": round(mean_a, 2),
                "mean_climatology_c": round(mean_c, 2),
                "rmse_vs_climatology_c": round(rmse, 3),
                "lat_bounds": [lat_min, lat_max],
                "lon_bounds": [lon_min, lon_max],
                "n_ocean_points": int(valid.sum()),
            })

        return {
            "date": date_used,
            "depth_m": round(float(depth_m), 2),
            "regions": out_regions,
        }
