"""
Run Phase 2+3 of the pipeline (preprocess + Zarr write) without
re-downloading raw data. Useful for fast iteration.
"""

import sys
from pathlib import Path
import logging
import yaml

backend_dir = Path(__file__).resolve().parent.parent.parent
sys.path.append(str(backend_dir))

from backend.pipeline.downloader import DataDownloader
from backend.pipeline.processor import GridProcessor
from backend.pipeline.generator import TensorGenerator

from backend.pipeline.adapters.sst_ostia import OSTIAAdapter
from backend.pipeline.adapters.sss_cmems import CMEMSAdapter
from backend.pipeline.adapters.ssh_duacs import DUACSAdapter
from backend.pipeline.adapters.currents_oscar import OSCARAdapter
from backend.pipeline.adapters.winds_ccmp import CCMPAdapter
from backend.pipeline.adapters.target_glorys import GLORYSAdapter

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("RunZarrOnly")


def main():
    script_dir = Path(__file__).resolve().parent
    config_path = script_dir / "pipeline_config.yaml"
    with open(config_path, "r") as f:
        config = yaml.safe_load(f)

    downloader = DataDownloader(str(config_path))
    processor = GridProcessor(config)
    generator = TensorGenerator()

    logger.info("=" * 60)
    logger.info("PHASE 2: PREPROCESSING (Subset → Regrid 0.25° → QC → Align Time)")
    logger.info("=" * 60)

    logger.info("Processing SST (OSTIA)...")
    sst_ds = OSTIAAdapter(str(downloader.raw_dir / "sst.nc"), processor).load()

    logger.info("Processing SSS (CMEMS)...")
    sss_ds = CMEMSAdapter(str(downloader.raw_dir / "sss.nc"), processor).load()

    logger.info("Processing SSH (DUACS)...")
    ssh_ds = DUACSAdapter(str(downloader.raw_dir / "ssh.nc"), processor).load()

    logger.info("Processing Currents (OSCAR)...")
    currents_ds = OSCARAdapter(str(downloader.raw_dir / "currents"), processor).load()

    logger.info("Processing Winds (CCMP)...")
    winds_ds = CCMPAdapter(str(downloader.raw_dir / "winds"), processor).load()

    # Log shapes before merge
    for name, ds in [("SST", sst_ds), ("SSS", sss_ds), ("SSH", ssh_ds),
                     ("Currents", currents_ds), ("Winds", winds_ds)]:
        logger.info(f"  {name} dims: {dict(ds.sizes)}")
        for var in ds.data_vars:
            logger.info(f"    {var}: dims={ds[var].dims}  shape={ds[var].shape}")

    surface_datasets = {
        "sst": sst_ds,
        "sss": sss_ds,
        "ssh": ssh_ds,
        "currents": currents_ds,
        "winds": winds_ds,
    }

    logger.info("=" * 60)
    logger.info("PHASE 3: GENERATING TRAINING-READY ZARR STORES")
    logger.info("=" * 60)

    generator.generate_surface_features(surface_datasets)

    logger.info("Processing Target (GLORYS12V1)...")
    target_depths = config.get("depths", [0, 5, 10, 20, 30, 50, 75, 100, 125, 150, 200, 300, 500, 700, 1000])
    glorys_ds = GLORYSAdapter(str(downloader.raw_dir / "target_glorys.nc"), processor, target_depths).load()
    generator.generate_targets(glorys_ds)

    logger.info("=" * 60)
    logger.info("ZARR GENERATION COMPLETE")
    logger.info("  Surface features: data/processed/surface_features.zarr")
    logger.info("  Target GLORYS:    data/processed/target_glorys.zarr")
    logger.info("=" * 60)


if __name__ == "__main__":
    main()
