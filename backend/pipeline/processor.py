import xarray as xr
import numpy as np
import logging

logger = logging.getLogger("Processor")

class GridProcessor:
    """
    Handles robust regridding (0.25 deg) and domain subsetting (NIO).
    Uses xarray's built-in interpolation for production-grade reliability
    without complex C++ dependencies like xESMF.
    """
    def __init__(self, config: dict):
        self.domain = config["domain"]
        
        # Define the target 0.25 degree grid based on the domain
        self.target_lats = np.arange(
            self.domain["lat_min"], 
            self.domain["lat_max"] + self.domain["resolution"] / 2, 
            self.domain["resolution"]
        )
        self.target_lons = np.arange(
            self.domain["lon_min"], 
            self.domain["lon_max"] + self.domain["resolution"] / 2, 
            self.domain["resolution"]
        )
        
    def subset(self, ds: xr.Dataset, lat_name="latitude", lon_name="longitude") -> xr.Dataset:
        """Slices the dataset to the NIO domain."""
        logger.info(f"Subsetting domain to lat=[{self.domain['lat_min']}, {self.domain['lat_max']}], lon=[{self.domain['lon_min']}, {self.domain['lon_max']}]")
        
        # Handle different naming conventions (e.g., lat vs latitude)
        lat_slice = slice(self.domain["lat_min"], self.domain["lat_max"])
        lon_slice = slice(self.domain["lon_min"], self.domain["lon_max"])
        
        # Ensure coordinates are sorted before slicing (some raw data is inverted)
        if ds[lat_name][0] > ds[lat_name][-1]:
            ds = ds.sortby(lat_name)
        if ds[lon_name][0] > ds[lon_name][-1]:
            ds = ds.sortby(lon_name)
            
        kwargs = {lat_name: lat_slice, lon_name: lon_slice}
        return ds.sel(**kwargs)

    def regrid(self, ds: xr.Dataset, lat_name="latitude", lon_name="longitude", method="linear") -> xr.Dataset:
        """
        Regrids the dataset to the target 0.25 degree grid.
        Uses xarray's interp which is fast and native.
        """
        logger.info(f"Regridding dataset to 0.25 deg resolution using {method} interpolation...")
        
        # Rename dimensions temporarily if they are not 'latitude' and 'longitude'
        rename_dict = {}
        if lat_name != "latitude": rename_dict[lat_name] = "latitude"
        if lon_name != "longitude": rename_dict[lon_name] = "longitude"
        if rename_dict:
            ds = ds.rename(rename_dict)
            
        # Perform interpolation
        ds_regridded = ds.interp(
            latitude=self.target_lats,
            longitude=self.target_lons,
            method=method
        )
        
        return ds_regridded
        
    def align_time(self, ds: xr.Dataset, time_name="time") -> xr.Dataset:
        """Resamples time to Daily (1D) taking the mean."""
        logger.info("Aligning time dimension to daily resolution (1D mean)...")
        import pandas as pd
        
        # Convert cftime to standard datetime64 to avoid xarray merge TypeError
        if hasattr(ds.indexes[time_name], "to_datetimeindex"):
            ds[time_name] = ds.indexes[time_name].to_datetimeindex()
        elif ds.indexes[time_name].dtype == 'O':
            ds[time_name] = pd.to_datetime(ds.indexes[time_name].astype(str))
            
        return ds.resample({time_name: "1D"}).mean(dim=time_name, keep_attrs=True)
