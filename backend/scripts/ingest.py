#!/usr/bin/env python
"""
CLI Script for running the data preprocessing pipeline.

Wraps the pipeline/run_pipeline.py logic into a simple CLI.
Use this after downloading raw data to preprocess it into training-ready Zarr stores.

Usage:
  python backend/scripts/ingest.py
  python backend/scripts/ingest.py --config backend/pipeline/pipeline_config.yaml
"""

import argparse
import logging
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(project_root))

from backend.pipeline.run_pipeline import main as run_pipeline

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("IngestCLI")


def main():
    parser = argparse.ArgumentParser(
        description="Run the OceanEmbed data ingestion and preprocessing pipeline."
    )
    parser.add_argument(
        "--config",
        type=str,
        default="backend/pipeline/pipeline_config.yaml",
        help="Path to pipeline_config.yaml (default: backend/pipeline/pipeline_config.yaml)",
    )
    parser.add_argument(
        "--skip-download",
        action="store_true",
        help="Skip downloading, only run preprocessing on existing raw data.",
    )

    args = parser.parse_args()

    config_path = Path(args.config)
    if not config_path.exists():
        logger.error(f"Config file not found: {config_path}")
        sys.exit(1)

    logger.info(f"Starting OceanEmbed ingestion pipeline with config: {config_path}")

    try:
        run_pipeline()
        logger.info("Pipeline completed successfully!")
    except Exception as e:
        logger.error(f"Pipeline failed: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
