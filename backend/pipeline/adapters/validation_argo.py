"""
Adapter for Argo Float Validation Data.

Source: IFREMER GDAC or INCOIS ERDDAP Argo float profiles
Output: pd.DataFrame with columns [platform_id, cycle, lat, lon, date, depth, temperature]

Preprocessing:
  1. Load Argo NetCDF profile files from a directory
  2. Filter profiles to the North Indian Ocean domain (5–30°N, 45–105°E)
  3. Apply QC flags (keep only QC=1 'good' and QC=2 'probably good')
  4. Filter depth range to 0–1000m
  5. Return a flat DataFrame ready for validation against model predictions
"""

import logging
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd

logger = logging.getLogger("Adapter.Argo")

# North Indian Ocean domain bounds
NIO_LAT_MIN = 5.0
NIO_LAT_MAX = 30.0
NIO_LON_MIN = 45.0
NIO_LON_MAX = 105.0


class ArgoAdapter:
    """Adapter for Argo Float Validation Data"""

    def __init__(self, data_path: str, max_profiles: Optional[int] = None):
        self.data_path = Path(data_path)
        self.max_profiles = max_profiles

    def load(self) -> pd.DataFrame:
        """Load and preprocess Argo float profiles from NetCDF files.

        Returns:
            pd.DataFrame with columns:
                platform_id, cycle, lat, lon, date, depth, temperature
        """
        if not self.data_path.exists():
            logger.warning(f"Argo data directory does not exist: {self.data_path}")
            return pd.DataFrame()

        nc_files = sorted(self.data_path.glob("*.nc"))
        if not nc_files:
            logger.warning(f"No NetCDF files found in {self.data_path}")
            return pd.DataFrame()

        logger.info(f"Found {len(nc_files)} Argo NetCDF files in {self.data_path}")

        all_records = []
        profiles_loaded = 0

        try:
            import xarray as xr
        except ImportError:
            logger.error("xarray is required to load Argo NetCDF files.")
            return pd.DataFrame()

        for fpath in nc_files:
            if self.max_profiles and profiles_loaded >= self.max_profiles:
                break

            try:
                with xr.open_dataset(fpath) as ds:
                    lat = float(ds["LATITUDE"].values.flat[0])
                    lon = float(ds["LONGITUDE"].values.flat[0])

                    # Filter to NIO domain
                    if not (NIO_LAT_MIN <= lat <= NIO_LAT_MAX and NIO_LON_MIN <= lon <= NIO_LON_MAX):
                        continue

                    platform_id = str(ds.attrs.get("platform_code", fpath.stem))
                    cycle = int(ds.attrs.get("cycle_number", 0))

                    # Extract date
                    if "JULD" in ds:
                        date_str = str(ds["JULD"].values.flat[0])[:10]
                    else:
                        date_str = "unknown"

                    # Extract pressure (depth) and temperature
                    pres = ds["PRES"].values.squeeze().astype(np.float64)
                    temp = ds["TEMP"].values.squeeze().astype(np.float64)

                    # Apply QC if available
                    if "TEMP_QC" in ds:
                        qc = ds["TEMP_QC"].values.squeeze()
                        # Keep only QC=1 (good) and QC=2 (probably good)
                        # QC flags may be stored as bytes/chars
                        try:
                            qc_int = np.array([int(q) for q in qc.flat])
                            valid_qc = np.isin(qc_int, [1, 2])
                        except (ValueError, TypeError):
                            valid_qc = np.ones(len(pres), dtype=bool)
                    else:
                        valid_qc = np.ones(len(pres), dtype=bool)

                    # Filter: valid QC, finite values, depth 0–1000m
                    valid = (
                        valid_qc
                        & np.isfinite(pres)
                        & np.isfinite(temp)
                        & (pres >= 0.0)
                        & (pres <= 1000.0)
                    )

                    pres_valid = pres[valid]
                    temp_valid = temp[valid]

                    if len(pres_valid) < 3:
                        continue

                    for d, t in zip(pres_valid, temp_valid):
                        all_records.append({
                            "platform_id": platform_id,
                            "cycle": cycle,
                            "lat": lat,
                            "lon": lon,
                            "date": date_str,
                            "depth": float(d),
                            "temperature": float(t),
                        })

                    profiles_loaded += 1

            except Exception as e:
                logger.debug(f"Could not parse {fpath.name}: {e}")
                continue

        df = pd.DataFrame(all_records)
        logger.info(
            f"Loaded {profiles_loaded} Argo profiles "
            f"({len(df)} depth-temperature records) from {self.data_path}"
        )
        return df
