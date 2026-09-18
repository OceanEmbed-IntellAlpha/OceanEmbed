"""
Adapter for OSTIA Sea Surface Temperature (SST) Data.

Source: OSTIA L4 Reprocessed (METOFFICE-GLO-SST-L4-REP-OBS-SST)
Native resolution: 0.05°, daily
Output variable: analysed_sst (°C)

Preprocessing:
  1. Load with Dask for out-of-core computation
  2. Convert Kelvin → Celsius if needed (OSTIA stores in Kelvin)
  3. Spatial subset to NIO domain
  4. Regrid to 0.25° via bilinear interpolation
  5. Align time to daily mean
  6. Apply QC range check (-2.5°C to 40°C)
"""

import numpy as np
import xarray as xr
import logging
from backend.pipeline.processor import GridProcessor

logger = logging.getLogger("Adapter.SST")

SST_VALID_MIN = -2.5
SST_VALID_MAX = 40.0


class OSTIAAdapter:
    """Adapter for OSTIA Sea Surface Temperature (SST) Data"""

    def __init__(self, data_path: str, processor: GridProcessor):
        self.data_path = data_path
        self.processor = processor

    def load(self) -> xr.Dataset:
        # Load NetCDF (using dask for out-of-core computation)
        ds = xr.open_dataset(self.data_path, chunks={"time": "auto"})

        # Kelvin → Celsius conversion (OSTIA stores analysed_sst in Kelvin)
        if "analysed_sst" in ds:
            sst_values = ds["analysed_sst"]
            # Heuristic: if mean > 100, it's in Kelvin
            sample_mean = float(sst_values.isel(time=0).mean(skipna=True).compute())
            if sample_mean > 100:
                logger.info(f"SST mean={sample_mean:.1f} — converting Kelvin → Celsius")
                ds["analysed_sst"] = sst_values - 273.15
                ds["analysed_sst"].attrs["units"] = "°C"
            else:
                logger.info(f"SST mean={sample_mean:.1f} — already in Celsius")

        # 1. Spatial subset (domain crop)
        ds = self.processor.subset(ds, lat_name="latitude", lon_name="longitude")

        # 2. Regrid to 0.25°
        ds = self.processor.regrid(ds, lat_name="latitude", lon_name="longitude", method="linear")

        # 3. Align time to daily mean
        ds = self.processor.align_time(ds, time_name="time")

        # 4. Extract and QC
        ds = ds[["analysed_sst"]]
        ds["analysed_sst"] = ds["analysed_sst"].where(
            (ds["analysed_sst"] >= SST_VALID_MIN) & (ds["analysed_sst"] <= SST_VALID_MAX)
        )
        logger.info(f"SST preprocessing complete. Shape: {dict(ds.dims)}")

        return ds
