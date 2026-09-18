"""
Adapter for GLORYS 3D Target Data (Potential Temperature at Depth).

Source: GLORYS Global Ocean Reanalysis (cmems_mod_glo_phy_my_0.083deg_P1D-m)
DOI: https://doi.org/10.48670/moi-00021
Native resolution: 0.083°, daily, 50 depth levels
Output variable: thetao (°C) at 15 standard SIH depths

Preprocessing:
  1. Load with Dask chunking
  2. Spatial subset to NIO domain
  3. Regrid from 0.083° to 0.25° via bilinear interpolation
  4. Select 15 standard SIH depths via nearest-neighbor along z-axis
  5. Align time to daily mean
  6. Apply QC range check (-5°C to 40°C)
"""

import xarray as xr
import logging
from backend.pipeline.processor import GridProcessor

logger = logging.getLogger("Adapter.GLORYS")

TEMP_VALID_MIN = -5.0
TEMP_VALID_MAX = 40.0


class GLORYSAdapter:
    """Adapter for GLORYS 3D Target Data (Temp, Salinity at Depth)"""

    def __init__(self, data_path: str, processor: GridProcessor, target_depths: list):
        self.data_path = data_path
        self.processor = processor
        self.target_depths = target_depths

    def load(self) -> xr.Dataset:
        ds = xr.open_dataset(self.data_path, chunks={"time": "auto"})

        # GLORYS is 0.083 deg, so we must aggressively regrid
        ds = self.processor.subset(ds, lat_name="latitude", lon_name="longitude")
        ds = self.processor.regrid(ds, lat_name="latitude", lon_name="longitude", method="linear")

        # Subset depths to the 15 standard SIH depths using nearest neighbor
        ds = ds.sel(depth=self.target_depths, method="nearest")

        ds = self.processor.align_time(ds, time_name="time")

        ds = ds[["thetao"]]

        # QC: flag values outside physical range
        ds["thetao"] = ds["thetao"].where(
            (ds["thetao"] >= TEMP_VALID_MIN) & (ds["thetao"] <= TEMP_VALID_MAX)
        )
        logger.info(f"GLORYS preprocessing complete. Shape: {dict(ds.dims)}")

        return ds
