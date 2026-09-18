import xarray as xr
import logging
from pathlib import Path

logger = logging.getLogger("Generator")

class TensorGenerator:
    """
    Merges preprocessed surface adapters into a single [time, channels, lat, lon] Zarr store.
    """
    def __init__(self, output_dir: str = "./data/processed"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
    def generate_surface_features(self, datasets: dict) -> xr.Dataset:
        """
        Takes a dictionary of {variable_name: xr.Dataset}.
        Merges them along the 'time', 'latitude', and 'longitude' coordinates.
        Exports the result as a Zarr store for rapid Deep Learning DataLoader access.
        """
        logger.info("Merging surface feature datasets...")
        
        # Ensure all datasets have the same spatial and temporal coordinates
        # We can just merge the datasets directly, preserving all variables (e.g. u, v, uwnd, vwnd)
        data_arrays = list(datasets.values())
        
        # Merge into a single Dataset
        merged_ds = xr.merge(data_arrays, compat="override")
        
        # Rechunk for optimal reading along the time dimension (useful for training batches)
        # e.g., chunks of (time: 30, lat: 101, lon: 241)
        merged_ds = merged_ds.chunk({"time": 30, "latitude": -1, "longitude": -1})
        
        out_path = self.output_dir / "surface_features.zarr"
        logger.info(f"Saving merged tensor to {out_path}")
        
        # Save to Zarr store (overwriting if exists)
        merged_ds.to_zarr(out_path, mode="w")
        logger.info("Successfully generated surface_features.zarr")
        
        return merged_ds
        
    def generate_targets(self, glorys_ds: xr.Dataset) -> xr.Dataset:
        """
        Saves the processed GLORYS target dataset (3D) to a Zarr store.
        """
        out_path = self.output_dir / "target_glorys.zarr"
        
        # Rechunk for optimal reading
        glorys_ds = glorys_ds.chunk({"time": 30, "depth": -1, "latitude": -1, "longitude": -1})
        
        logger.info(f"Saving target tensor to {out_path}")
        glorys_ds.to_zarr(out_path, mode="w")
        logger.info("Successfully generated target_glorys.zarr")
        
        return glorys_ds
