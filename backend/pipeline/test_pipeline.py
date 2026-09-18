import sys
from pathlib import Path
import logging
import numpy as np

# Add backend to path
backend_dir = Path(__file__).resolve().parent.parent.parent
sys.path.append(str(backend_dir))

from backend.pipeline.downloader import DataDownloader
from backend.pipeline.processor import GridProcessor
from backend.pipeline.adapters.target_glorys import GLORYSAdapter
import yaml

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("TestPipeline_GLORYS")

def test_glorys_pipeline():
    logger.info("Initializing Downloader...")
    downloader = DataDownloader("backend/pipeline/pipeline_config.yaml")
    
    logger.info("Downloading 1 day of ACTUAL GLORYS data from CMEMS...")
    downloader.download_cmems("target_glorys")
    
    logger.info("Initializing Processor and Adapter...")
    with open("backend/pipeline/pipeline_config.yaml", "r") as f:
        config = yaml.safe_load(f)
        
    processor = GridProcessor(config)
    glorys_file = downloader.raw_dir / "target_glorys.nc"
    
    # Standard depths from requirement
    target_depths = config.get("depths", [0, 5, 10, 20, 30, 50, 75, 100, 125, 150, 200, 300, 500, 700, 1000])
    
    adapter = GLORYSAdapter(str(glorys_file), processor, target_depths)
    
    logger.info("Running preprocessing (Subsetting, Regridding, Depth Selection, Time Alignment)...")
    ds = adapter.load()
    
    logger.info(f"Processed Dataset:\n{ds}")
    
    # Assertions for 0.25 deg NIO grid
    assert np.isclose(ds.latitude.values[0], 5.0), f"Expected lat min 5.0, got {ds.latitude.values[0]}"
    assert np.isclose(ds.latitude.values[-1], 30.0), f"Expected lat max 30.0, got {ds.latitude.values[-1]}"
    assert len(ds.latitude) == 101, f"Expected 101 lats, got {len(ds.latitude)}"
    
    assert np.isclose(ds.longitude.values[0], 45.0), f"Expected lon min 45.0, got {ds.longitude.values[0]}"
    assert np.isclose(ds.longitude.values[-1], 105.0), f"Expected lon max 105.0, got {ds.longitude.values[-1]}"
    assert len(ds.longitude) == 241, f"Expected 241 lons, got {len(ds.longitude)}"
    
    # Assertions for 15 standard depths
    assert len(ds.depth) == 15, f"Expected 15 depths, got {len(ds.depth)}"
    
    logger.info("SUCCESS: The ACTUAL GLORYS data preprocessing passed all shape, domain, and depth assertions!")

if __name__ == "__main__":
    test_glorys_pipeline()
