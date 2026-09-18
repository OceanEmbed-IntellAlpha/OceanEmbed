"""
OceanEmbed — Harmonization pipeline.

Implements:
1. Spatial subsetting
2. Coordinate normalization and longitude normalization
3. Unit normalization
4. Quality control (range checks)
5. Invalid-value handling (NaN masking)
6. Explicit missing-data masks
7. Spatial regridding to 0.25° grid
8. Daily temporal harmonization
9. Common grid alignment

Uses xarray + numpy. Dask lazy loading for large datasets.
Interpolation choice: bilinear (documented in configs/data_config.yaml).
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Dict, Optional, Tuple

import numpy as np
import xarray as xr

from ocean_embed.grid import DOMAIN, make_grid

logger = logging.getLogger(__name__)


# ── QC thresholds ─────────────────────────────────────────────────────────────

QC_THRESHOLDS: Dict[str, Tuple[float, float]] = {
    "sst":          (-2.5,  40.0),
    "sss":          (20.0,  42.0),
    "ssh":          (-2.0,   2.0),
    "current_u":    (-5.0,   5.0),
    "current_v":    (-5.0,   5.0),
    "wind_u":       (-50.0, 50.0),
    "wind_v":       (-50.0, 50.0),
    "target_temp":  (-5.0,  40.0),
}


def subset_to_domain(
    ds: xr.Dataset,
    lat_name: str = "latitude",
    lon_name: str = "longitude",
) -> xr.Dataset:
    """Subset dataset to the North Indian Ocean domain.

    Domain: 5–30°N, 45–105°E.
    """
    ds = ds.sel(
        {
            lat_name: slice(DOMAIN["lat_min"], DOMAIN["lat_max"]),
            lon_name: slice(DOMAIN["lon_min"], DOMAIN["lon_max"]),
        }
    )
    return ds


def normalize_longitudes(ds: xr.Dataset, lon_name: str = "longitude") -> xr.Dataset:
    """Ensure longitudes are in [0, 360) → converted to [-180, 180] if needed.

    CMEMS data is typically 0–360; we convert to -180–180 then subset.
    """
    if lon_name not in ds.coords:
        return ds

    lons = ds[lon_name].values
    if lons.max() > 180:
        # Convert 0-360 → -180..180
        ds = ds.assign_coords({lon_name: ((lons + 180) % 360) - 180})
        ds = ds.sortby(lon_name)
    return ds


def apply_qc(
    da: xr.DataArray,
    var_name: str,
    fill_value: float = np.nan,
) -> Tuple[xr.DataArray, xr.DataArray]:
    """Apply range QC and return (cleaned DataArray, validity mask DataArray).

    Mask: 1 = valid, 0 = missing/flagged.
    """
    if var_name not in QC_THRESHOLDS:
        logger.debug(f"No QC thresholds for {var_name}; skipping range check.")
        mask = xr.where(np.isfinite(da), 1, 0).rename(f"{var_name}_mask")
        return da, mask

    lo, hi = QC_THRESHOLDS[var_name]
    out_of_range = (da < lo) | (da > hi)
    is_nan = ~np.isfinite(da)
    invalid = out_of_range | is_nan

    n_invalid = int(invalid.sum())
    n_total = int(da.size)
    if n_invalid > 0:
        pct = 100.0 * n_invalid / max(n_total, 1)
        logger.debug(f"  {var_name}: {n_invalid}/{n_total} ({pct:.1f}%) values flagged/missing.")

    cleaned = da.where(~invalid, other=fill_value)
    mask = xr.where(~invalid, 1, 0).astype(np.int8)
    mask.name = f"{var_name}_mask"
    return cleaned, mask


def regrid_to_025(
    da: xr.DataArray,
    target_lats: Optional[np.ndarray] = None,
    target_lons: Optional[np.ndarray] = None,
    method: str = "linear",
    lat_name: str = "latitude",
    lon_name: str = "longitude",
) -> xr.DataArray:
    """Regrid a DataArray to the canonical 0.25° grid using bilinear interpolation.

    Method choice: linear (bilinear) is chosen for spatial smoothness.
    Conservative regridding would require xESMF + ESMPy (not installed).
    This is documented in configs/data_config.yaml.
    """
    if target_lats is None or target_lons is None:
        target_lats, target_lons = make_grid()

    out = da.interp(
        {lat_name: target_lats, lon_name: target_lons},
        method=method,
        kwargs={"fill_value": np.nan},
    )
    return out


# Alias
regrid_to_standard = regrid_to_025


def harmonize_to_daily(
    da: xr.DataArray,
    time_name: str = "time",
    method: str = "mean",
) -> xr.DataArray:
    """Resample/aggregate to daily frequency.

    For wind and current components, daily mean is appropriate.
    """
    return da.resample({time_name: "1D"}).mean()


def convert_sst_k_to_c(da: xr.DataArray) -> xr.DataArray:
    """Convert SST from Kelvin to Celsius if needed."""
    if da.attrs.get("units", "").lower() in ("k", "kelvin"):
        da = da - 273.15
        da.attrs["units"] = "°C"
    elif da.values.mean() > 100:
        # Heuristic: if mean > 100, assume Kelvin
        logger.info("SST appears to be in Kelvin; converting to °C.")
        da = da - 273.15
        da.attrs["units"] = "°C"
    return da


def build_surface_sample(
    sst: xr.DataArray,
    sss: xr.DataArray,
    ssh: xr.DataArray,
    current_u: xr.DataArray,
    current_v: xr.DataArray,
    wind_u: xr.DataArray,
    wind_v: xr.DataArray,
    date: str,
) -> Dict[str, np.ndarray]:
    """Build a single-day surface input sample with masks.

    Returns dict with 'inputs' (7, H, W) and 'masks' (7, H, W).
    """
    channels = {
        "sst": sst,
        "sss": sss,
        "ssh": ssh,
        "current_u": current_u,
        "current_v": current_v,
        "wind_u": wind_u,
        "wind_v": wind_v,
    }

    input_arrays = []
    mask_arrays = []

    for name, da in channels.items():
        # Select the specific date
        try:
            day_da = da.sel(time=date, method="nearest")
        except (KeyError, ValueError):
            logger.warning(f"Date {date} not found for {name}; using NaN.")
            target_lats, target_lons = make_grid()
            day_da = xr.DataArray(
                np.full((len(target_lats), len(target_lons)), np.nan),
                dims=["latitude", "longitude"],
            )

        # QC
        cleaned, mask = apply_qc(day_da, name)
        input_arrays.append(cleaned.values.astype(np.float32))
        mask_arrays.append(mask.values.astype(np.float32))

    inputs = np.stack(input_arrays, axis=0)   # (7, H, W)
    masks = np.stack(mask_arrays, axis=0)     # (7, H, W)

    # Fill NaN with 0 where masked (model receives 0 for missing channels)
    inputs = np.where(np.isnan(inputs), 0.0, inputs)

    return {
        "inputs": inputs,
        "masks": masks,
        "date": date,
    }
