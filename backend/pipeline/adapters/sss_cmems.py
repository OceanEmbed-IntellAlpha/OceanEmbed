"""
Adapter for CMEMS Sea Surface Salinity (SSS) Data.

Source: CMEMS Multi-Observation SSS (cmems_obs-mob_glo_phy-sss_my_multi_P1D)
Native resolution: ~0.125°, daily
Output variable: sos (PSU)

Preprocessing:
  1. Load with Dask chunking
  2. Spatial subset to NIO domain
  3. Regrid to 0.25° via bilinear interpolation
  4. Align time to daily mean
  5. Apply QC range check (20–42 PSU)
"""

import xarray as xr
import logging
from backend.pipeline.processor import GridProcessor

logger = logging.getLogger("Adapter.SSS")

SSS_VALID_MIN = 20.0
SSS_VALID_MAX = 42.0


class CMEMSAdapter:
    """Adapter for CMEMS Sea Surface Salinity (SSS) Data"""

    def __init__(self, data_path: str, processor: GridProcessor):
        self.data_path = data_path
        self.processor = processor

    def load(self) -> xr.Dataset:
        ds = xr.open_dataset(self.data_path, chunks={"time": "auto"})

        ds = self.processor.subset(ds, lat_name="latitude", lon_name="longitude")
        ds = self.processor.regrid(ds, lat_name="latitude", lon_name="longitude", method="linear")
        ds = self.processor.align_time(ds, time_name="time")

        ds = ds[["sos"]]

        # QC: flag values outside oceanographic range
        ds["sos"] = ds["sos"].where(
            (ds["sos"] >= SSS_VALID_MIN) & (ds["sos"] <= SSS_VALID_MAX)
        )
        logger.info(f"SSS preprocessing complete. Shape: {dict(ds.dims)}")

        return ds
