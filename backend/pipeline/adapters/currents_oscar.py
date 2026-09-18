"""
Adapter for OSCAR Ocean Currents (U, V) Data.

Source: OSCAR L4 Ocean Currents v2.0 (PO.DAAC / NASA Earthdata)
Native resolution: 0.25°, 5-day → daily interpolated
Output variables: u, v (m/s)

Preprocessing:
  1. Load multiple granules via open_mfdataset
  2. Rename lon/lat to longitude/latitude (OSCAR naming convention)
  3. Spatial subset to NIO domain
  4. Regrid to 0.25° for exact coordinate alignment
  5. Align time to daily mean
  6. Apply QC range check (-5 to 5 m/s)
"""

import xarray as xr
import logging
from backend.pipeline.processor import GridProcessor

logger = logging.getLogger("Adapter.Currents")

CURRENT_VALID_MIN = -5.0
CURRENT_VALID_MAX = 5.0


class OSCARAdapter:
    """Adapter for OSCAR Ocean Currents (U, V) Data"""

    def __init__(self, data_path: str, processor: GridProcessor):
        self.data_path = data_path
        self.processor = processor

    def load(self) -> xr.Dataset:
        # Load multiple granules if data_path is a directory
        ds = xr.open_mfdataset(f"{self.data_path}/*.nc", combine="by_coords")

        # OSCAR variables are lon/lat but dimensions are longitude/latitude.
        # Rename and index to promote them to proper Dimension Coordinates
        ds = ds.rename({"lon": "longitude", "lat": "latitude"}).set_index(
            longitude="longitude", latitude="latitude"
        ).chunk({"time": "auto"})

        # Regrid to exact target coordinate grid to align with others
        ds = self.processor.subset(ds, lat_name="latitude", lon_name="longitude")
        ds = self.processor.regrid(ds, lat_name="latitude", lon_name="longitude", method="linear")
        ds = self.processor.align_time(ds, time_name="time")

        ds = ds[["u", "v"]]

        # QC: flag unrealistic current speeds
        for var in ["u", "v"]:
            ds[var] = ds[var].where(
                (ds[var] >= CURRENT_VALID_MIN) & (ds[var] <= CURRENT_VALID_MAX)
            )
        logger.info(f"Currents preprocessing complete. Shape: {dict(ds.dims)}")

        return ds
