"""
Adapter for INCOIS Gridded Argo Data (Temperature & Salinity at Depth).

Source: INCOIS ERDDAP (e.g., incois_argo_10d_VAM or incois_argo_mnt_VAM)
Output variables: temperature (°C), salinity (PSU) at standard SIH depths

Preprocessing:
  1. Load with xarray
  2. Rename dimensions/variables (ZAX -> depth, TEMP -> temperature, SAL -> salinity)
  3. Spatial subset to NIO domain
  4. Regrid to 0.25° via bilinear interpolation
  5. Select standard SIH depths via nearest-neighbor along z-axis
  6. Align time to the standard temporal domain
"""

import xarray as xr
import logging
from backend.pipeline.processor import GridProcessor

logger = logging.getLogger("Adapter.ArgoGridded")

TEMP_VALID_MIN = -5.0
TEMP_VALID_MAX = 40.0
SAL_VALID_MIN = 0.0
SAL_VALID_MAX = 45.0


class INCOISGriddedArgoAdapter:
    """Adapter for INCOIS Gridded Argo Data (Temperature & Salinity at Depth)"""

    def __init__(self, data_path: str, processor: GridProcessor, target_depths: list):
        self.data_path = data_path
        self.processor = processor
        self.target_depths = target_depths

    def load(self) -> xr.Dataset:
        if isinstance(self.data_path, list):
            ds = xr.open_mfdataset(self.data_path, chunks={"time": "auto"})
        else:
            ds = xr.open_dataset(self.data_path, chunks={"time": "auto"})

        # INCOIS ERDDAP dimensions are time, ZAX, latitude, longitude
        # Rename dimensions and variables to standard names
        rename_dict = {}
        if "ZAX" in ds.dims or "ZAX" in ds.coords:
            rename_dict["ZAX"] = "depth"
        
        # Variables
        if "TEMP" in ds.variables:
            rename_dict["TEMP"] = "temperature"
        if "SAL" in ds.variables:
            rename_dict["SAL"] = "salinity"
            
        ds = ds.rename(rename_dict)
        
        # Ensure we have dimension coordinates correctly set
        if "longitude" not in ds.dims and "lon" in ds.dims:
            ds = ds.rename({"lon": "longitude"})
        if "latitude" not in ds.dims and "lat" in ds.dims:
            ds = ds.rename({"lat": "latitude"})
            
        # Regrid to exact target coordinate grid to align with others
        ds = self.processor.subset(ds, lat_name="latitude", lon_name="longitude")
        ds = self.processor.regrid(ds, lat_name="latitude", lon_name="longitude", method="linear")
        
        # Subset depths to the standard SIH depths using nearest neighbor
        if "depth" in ds.dims:
            ds = ds.sel(depth=self.target_depths, method="nearest")
        
        ds = self.processor.align_time(ds, time_name="time")
        
        # Extract the variables we care about (handling case where one might be missing)
        vars_to_keep = [v for v in ["temperature", "salinity"] if v in ds.variables]
        ds = ds[vars_to_keep]
        
        # QC: flag values outside physical range
        if "temperature" in ds:
            ds["temperature"] = ds["temperature"].where(
                (ds["temperature"] >= TEMP_VALID_MIN) & (ds["temperature"] <= TEMP_VALID_MAX)
            )
        if "salinity" in ds:
            ds["salinity"] = ds["salinity"].where(
                (ds["salinity"] >= SAL_VALID_MIN) & (ds["salinity"] <= SAL_VALID_MAX)
            )
            
        logger.info(f"Gridded Argo preprocessing complete. Shape: {dict(ds.dims)}")

        return ds
