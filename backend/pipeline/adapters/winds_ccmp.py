"""
Adapter for CCMP Surface Winds (U, V) Data.

Source: CCMP Wind Analysis v3.1 L4 (PO.DAAC / NASA Earthdata)
Native resolution: 0.25°, 6-hourly → daily mean
Output variables: uwnd, vwnd (m/s)

Preprocessing:
  1. Load multiple granules via open_mfdataset
  2. Spatial subset to NIO domain
  3. Regrid to 0.25° for exact coordinate alignment
  4. Align time to daily mean (6-hourly → daily)
  5. Apply QC range check (-50 to 50 m/s)
"""

import xarray as xr
import logging
from backend.pipeline.processor import GridProcessor

logger = logging.getLogger("Adapter.Winds")

WIND_VALID_MIN = -50.0
WIND_VALID_MAX = 50.0


class CCMPAdapter:
    """Adapter for CCMP Surface Winds (U, V) Data"""

    def __init__(self, data_path: str, processor: GridProcessor):
        self.data_path = data_path
        self.processor = processor

    def load(self) -> xr.Dataset:
        # Load multiple granules if data_path is a directory
        ds = xr.open_mfdataset(f"{self.data_path}/*.nc", chunks={"time": "auto"})

        ds = self.processor.subset(ds, lat_name="latitude", lon_name="longitude")
        ds = self.processor.regrid(ds, lat_name="latitude", lon_name="longitude", method="linear")
        ds = self.processor.align_time(ds, time_name="time")

        ds = ds[["uwnd", "vwnd"]]

        # QC: flag unrealistic wind speeds
        for var in ["uwnd", "vwnd"]:
            ds[var] = ds[var].where(
                (ds[var] >= WIND_VALID_MIN) & (ds[var] <= WIND_VALID_MAX)
            )
        logger.info(f"Winds preprocessing complete. Shape: {dict(ds.dims)}")

        return ds
