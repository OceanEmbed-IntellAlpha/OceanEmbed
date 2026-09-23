import xarray as xr
import logging
from pathlib import Path
from dask.diagnostics import ProgressBar

logger = logging.getLogger("Generator")

class TensorGenerator:
    """
    Merges preprocessed surface adapters into a single [time, channels, lat, lon] Zarr store.
    """
    def __init__(self, output_dir: str = "./data/processed"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
    def generate_feature(self, ds: xr.Dataset, feature_name: str) -> xr.Dataset:
        """
        Takes a single xr.Dataset and saves it as an individual Zarr store.
        """
        logger.info(f"Generating Zarr store for {feature_name}...")
        
        # Rechunk for optimal reading along the time dimension (useful for training batches)
        # e.g., chunks of (time: 30, lat: 101, lon: 241)
        # Handle cases where spatial dimensions might differ slightly by not specifying exact chunk sizes for lat/lon initially
        if "depth" in ds.dims:
            ds = ds.chunk({"time": 30, "depth": -1, "latitude": -1, "longitude": -1})
        else:
            ds = ds.chunk({"time": 30, "latitude": -1, "longitude": -1})
        
        out_path = self.output_dir / f"{feature_name}.zarr"
        logger.info(f"Saving {feature_name} tensor to {out_path}")
        
        # Save to Zarr store (overwriting if exists)
        with ProgressBar():
            ds.to_zarr(out_path, mode="w")
        logger.info(f"Successfully generated {feature_name}.zarr")
        
        return ds
        
    def generate_targets(self, glorys_ds: xr.Dataset) -> xr.Dataset:
        """
        Saves the processed GLORYS target dataset (3D) to a Zarr store.
        """
        out_path = self.output_dir / "target_glorys.zarr"
        
        # Rechunk for optimal reading
        glorys_ds = glorys_ds.chunk({"time": 30, "depth": -1, "latitude": -1, "longitude": -1})
        
        logger.info(f"Saving target tensor to {out_path}")
        with ProgressBar():
            glorys_ds.to_zarr(out_path, mode="w")
        logger.info("Successfully generated target_glorys.zarr")
        
        return glorys_ds
