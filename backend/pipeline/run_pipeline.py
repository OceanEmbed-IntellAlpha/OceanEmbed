"""
OceanEmbed — End-to-End Data Pipeline Runner.

Orchestrates the full ETL pipeline:
  Phase 1: Download raw satellite data from CMEMS and PO.DAAC
  Phase 2: Preprocess each dataset through adapters (subset, regrid 0.25°, QC, align time)
  Phase 3: Merge surface variables and generate training-ready Zarr stores
  Phase 4: (Optional) Download Argo profiles for validation

Output:
  data/processed/surface_features.zarr — 7 surface input channels (SST, SSS, SSH, U, V, UWND, VWND)
  data/processed/target_glorys.zarr    — 3D subsurface temperature at 15 standard depths
"""

import sys
from pathlib import Path
import logging
import yaml

# Add backend to path
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
logger = logging.getLogger("RunPipeline")


def main():
    # Resolve config path relative to this script, not CWD
    script_dir = Path(__file__).resolve().parent
    config_path = script_dir / "pipeline_config.yaml"
    with open(config_path, "r") as f:
        config = yaml.safe_load(f)

    downloader = DataDownloader(str(config_path))
    processor = GridProcessor(config)
    generator = TensorGenerator()

    # ── Phase 1: Download all required datasets ───────────────────────────────
    logger.info("=" * 60)
    logger.info("PHASE 1: DOWNLOADING RAW DATA")
    logger.info("=" * 60)

    downloader.download_cmems("sst")
    downloader.download_cmems("sss")
    downloader.download_cmems("ssh")
    downloader.download_cmems("target_glorys")
    downloader.download_podaac("currents")
    downloader.download_podaac("winds")

    # ── Phase 2: Preprocess and Load all datasets ─────────────────────────────
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

    surface_datasets = {
        "sst": sst_ds,
        "sss": sss_ds,
        "ssh": ssh_ds,
        "currents": currents_ds,
        "winds": winds_ds,
    }

    # ── Phase 3: Generate training-ready Zarr Tensors ─────────────────────────
    logger.info("=" * 60)
    logger.info("PHASE 3: GENERATING TRAINING-READY ZARR STORES")
    logger.info("=" * 60)

    generator.generate_surface_features(surface_datasets)

    logger.info("Processing Target (GLORYS12V1)...")
    target_depths = config.get("depths", [0, 5, 10, 20, 30, 50, 75, 100, 125, 150, 200, 300, 500, 700, 1000])
    glorys_ds = GLORYSAdapter(str(downloader.raw_dir / "target_glorys.nc"), processor, target_depths).load()
    generator.generate_targets(glorys_ds)

    # ── Phase 4: Download Argo validation data (optional) ─────────────────────
    logger.info("=" * 60)
    logger.info("PHASE 4: DOWNLOADING ARGO VALIDATION DATA")
    logger.info("=" * 60)

    try:
        downloader.download_argo()
    except Exception as e:
        logger.warning(f"Argo download skipped or failed: {e}. Validation data can be added later.")

    # ── Done ──────────────────────────────────────────────────────────────────
    logger.info("=" * 60)
    logger.info("PIPELINE COMPLETED SUCCESSFULLY")
    logger.info("Output files:")
    logger.info("  Surface features: data/processed/surface_features.zarr")
    logger.info("  Target GLORYS:    data/processed/target_glorys.zarr")
    logger.info("=" * 60)


if __name__ == "__main__":
    main()
