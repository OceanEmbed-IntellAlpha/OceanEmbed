import os
import sys
import yaml
import logging
from datetime import datetime, timedelta
from pathlib import Path

# Add project root to path
project_root = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(project_root))

from backend.pipeline.run_pipeline import main as run_pipeline

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("DailyCron")

def main():
    logger.info("Starting automated daily ingestion cron job...")
    
    # (The SSS dataset cmems_obs-mob_glo_phy-sss_my_multi_P1D ends in 2024-12-15)
    # Let's use a date in late 2023 which is guaranteed to be available across all 6 datasets.
    start_str = "2023-12-01"
    end_str = "2023-12-02"
    
    # 2. Update pipeline_config.yaml dynamically
    config_path = Path(project_root) / "backend" / "pipeline" / "pipeline_config.yaml"
    
    with open(config_path, 'r') as f:
        config = yaml.safe_load(f)
        
    config['time_range']['start_date'] = start_str
    config['time_range']['end_date'] = end_str
    
    with open(config_path, 'w') as f:
        yaml.dump(config, f)
        
    logger.info(f"Updated config for dates: {start_str} to {end_str}")
    
    # 3. Download the data first!
    from backend.pipeline.downloader import DataDownloader
    downloader = DataDownloader(str(config_path))
    
    logger.info("Downloading satellite data...")
    try:
        downloader.download_cmems("sst")
        downloader.download_cmems("sss")
        downloader.download_cmems("ssh")
        downloader.download_cmems("target_glorys")
        downloader.download_podaac("currents")
        downloader.download_podaac("winds")
    except Exception as e:
        logger.error(f"Download phase failed! Check your .env credentials: {e}")
        sys.exit(1)
        
    # 4. Run the processing pipeline
    try:
        # Override the input() function to automatically select 'all' so it doesn't block waiting for typing
        import builtins
        original_input = builtins.input
        builtins.input = lambda _: 'all'
        
        run_pipeline()
        
        # 5. Merge all individual zarrs into the final surface_features.zarr
        import xarray as xr
        logger.info("Merging individual Zarrs into surface_features.zarr...")
        try:
            processed_dir = Path("C:/OceanEmbed/data/processed")
            sst = xr.open_zarr(processed_dir / 'sst.zarr')
            sss = xr.open_zarr(processed_dir / 'sss.zarr')
            ssh = xr.open_zarr(processed_dir / 'ssh.zarr')
            currents = xr.open_zarr(processed_dir / 'currents.zarr')
            winds = xr.open_zarr(processed_dir / 'winds.zarr')
            
            if 'depth' in sss.dims:
                sss = sss.squeeze('depth', drop=True)
            if 'depth' in currents.dims:
                currents = currents.squeeze('depth', drop=True)
                
            merged = xr.merge([sst, sss, ssh, currents, winds], compat='override')
            merged.to_zarr(processed_dir / 'surface_features.zarr', mode='w', zarr_format=2, consolidated=True)
            logger.info("Successfully created surface_features.zarr!")
        except Exception as e:
            logger.error(f"Failed to merge zarrs: {e}")
            
        logger.info("Daily pipeline completed successfully!")
        
        # 6. Optional: Sync to Cloudflare R2 if configured
        if os.getenv("SYNC_TO_R2") == "true":
            logger.info("Syncing updated Zarr store to Cloudflare R2...")
            # Example: os.system('aws s3 sync data/processed/surface_features.zarr s3://oceanroot-data/models/surface_features.zarr --endpoint-url ...')
            
    except Exception as e:
        logger.error(f"Pipeline failed: {e}", exc_info=True)
        sys.exit(1)

if __name__ == "__main__":
    main()
