"""
ClimatologyService — Fast Day-of-Year climatology lookup.
Supports local disk Zarr and streaming from Cloudflare R2 with lazy caching.
"""

from __future__ import annotations

import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional, Tuple

import numpy as np
import xarray as xr

from ocean_embed.grid import SIH_DEPTHS

logger = logging.getLogger(__name__)


class ClimatologyService:
    """Singleton service for fast climatology lookups."""

    _instance: Optional[ClimatologyService] = None

    def __init__(self, climatology_path: Path | str):
        path_str = str(climatology_path)
        self._cache: Dict[int, np.ndarray] = {}

        # If remote S3 path or local path missing -> stream from Cloudflare R2
        if path_str.startswith("s3://") or not Path(path_str).exists():
            from backend.storage.r2 import get_s3fs, settings
            import s3fs

            fs = get_s3fs()
            clean_s3 = (
                path_str.replace("s3://", "")
                if path_str.startswith("s3://")
                else f"{settings.r2_bucket_name}/zarr/climatology_2010_2020.zarr"
            )
            logger.info("Opening Climatology Zarr stream from Cloudflare R2: s3://%s...", clean_s3)
            mapper = s3fs.S3Map(root=clean_s3, s3=fs, check=False)
            self._ds = xr.open_zarr(mapper, consolidated=True)
            self._clim_arr = None  # Lazy loading per day requested

            self.lats = self._ds.latitude.values.astype(np.float32)
            self.lons = self._ds.longitude.values.astype(np.float32)
            self.depths = self._ds.depth.values.astype(np.float32)
            # Surface ocean mask (101, 241)
            self.ocean_mask = np.isfinite(self._ds["climatology"].isel(doy=0, depth=0).values)
        else:
            logger.info("Loading Climatology Zarr into memory from local disk: %s...", path_str)
            self._ds = xr.open_zarr(path_str).load()
            self._clim_arr = self._ds["climatology"].values.astype(np.float32)
            self.lats = self._ds.latitude.values.astype(np.float32)
            self.lons = self._ds.longitude.values.astype(np.float32)
            self.depths = self._ds.depth.values.astype(np.float32)
            self.ocean_mask = np.isfinite(self._clim_arr[0, 0, :, :])

        logger.info(
            "Climatology initialized successfully: %d ocean points",
            int(self.ocean_mask.sum()),
        )

    @classmethod
    def get_instance(cls, path: Optional[Path | str] = None) -> ClimatologyService:
        if cls._instance is None:
            if path is None:
                root = Path(__file__).resolve().parents[3]
                local_path = root / "data" / "processed" / "climatology_2010_2020.zarr"
                if not local_path.exists():
                    from backend.config import settings

                    bucket = settings.r2_bucket_name or "oceanembed"
                    path = f"s3://{bucket}/zarr/climatology_2010_2020.zarr"
                else:
                    path = local_path
            cls._instance = cls(path)
        return cls._instance

    @staticmethod
    def date_to_doy_index(date_str: str) -> int:
        """Convert 'YYYY-MM-DD' to 0-based day of year index [0..364]."""
        dt = datetime.strptime(date_str[:10], "%Y-%m-%d")
        doy = dt.timetuple().tm_yday
        return min(doy - 1, 364)

    def get_climatology_3d(self, date_str: str) -> np.ndarray:
        """Get full (15, 101, 241) climatology field for a date."""
        doy_idx = self.date_to_doy_index(date_str)
        if doy_idx not in self._cache:
            if self._clim_arr is not None:
                self._cache[doy_idx] = self._clim_arr[doy_idx]
            else:
                # Fetch only this 1 day slice from Cloudflare R2
                self._cache[doy_idx] = self._ds["climatology"].isel(doy=doy_idx).values.astype(np.float32)
        return self._cache[doy_idx]

    def get_climatology_profile(self, date_str: str, lat_idx: int, lon_idx: int) -> np.ndarray:
        """Get (15,) temperature profile at specific grid point."""
        arr_3d = self.get_climatology_3d(date_str)
        return arr_3d[:, lat_idx, lon_idx]
