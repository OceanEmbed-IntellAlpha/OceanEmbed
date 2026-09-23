"""
ClimatologyService — Fast in-memory Day-of-Year climatology lookup.
"""

from __future__ import annotations

import logging
from datetime import datetime
from pathlib import Path
from typing import Optional, Tuple

import numpy as np
import xarray as xr

from ocean_embed.grid import SIH_DEPTHS

logger = logging.getLogger(__name__)


class ClimatologyService:
    """Singleton service for fast climatology lookups."""

    _instance: Optional[ClimatologyService] = None

    def __init__(self, climatology_path: Path | str):
        self.climatology_path = Path(climatology_path)
        if not self.climatology_path.exists():
            raise FileNotFoundError(f"Climatology zarr not found at: {self.climatology_path}")

        logger.info(f"Loading Climatology Zarr into memory from {self.climatology_path}...")
        self._ds = xr.open_zarr(str(self.climatology_path)).load()
        
        # Array shape: (365, 15, 101, 241) float32
        self._clim_arr = self._ds["climatology"].values.astype(np.float32)
        self.lats = self._ds.latitude.values.astype(np.float32)
        self.lons = self._ds.longitude.values.astype(np.float32)
        self.depths = self._ds.depth.values.astype(np.float32)

        # Land mask: where climatology is non-NaN at surface
        self.ocean_mask = np.isfinite(self._clim_arr[0, 0, :, :])
        logger.info(
            f"Climatology loaded successfully: shape={self._clim_arr.shape}, "
            f"ocean_points={int(self.ocean_mask.sum())}"
        )

    @classmethod
    def get_instance(cls, path: Optional[Path | str] = None) -> ClimatologyService:
        if cls._instance is None:
            if path is None:
                root = Path(__file__).resolve().parents[3]
                path = root / "data" / "processed" / "climatology_2010_2020.zarr"
            cls._instance = cls(path)
        return cls._instance

    @staticmethod
    def date_to_doy_index(date_str: str) -> int:
        """Convert 'YYYY-MM-DD' to 0-based day of year index [0..364]."""
        dt = datetime.strptime(date_str[:10], "%Y-%m-%d")
        doy = dt.timetuple().tm_yday
        # Clamp leap year day 366 to index 364
        return min(doy - 1, 364)

    def get_climatology_3d(self, date_str: str) -> np.ndarray:
        """Get full (15, 101, 241) climatology field for a date."""
        doy_idx = self.date_to_doy_index(date_str)
        return self._clim_arr[doy_idx]  # (15, 101, 241)

    def get_climatology_profile(self, date_str: str, lat_idx: int, lon_idx: int) -> np.ndarray:
        """Get (15,) temperature profile at specific grid point."""
        doy_idx = self.date_to_doy_index(date_str)
        return self._clim_arr[doy_idx, :, lat_idx, lon_idx]  # (15,)
