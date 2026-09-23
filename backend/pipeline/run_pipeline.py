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
import dask
import shutil

# Configure Dask to limit memory and CPU usage on 16GB laptops
dask.config.set({
    "distributed.worker.memory.target": 0.60,
    "distributed.worker.memory.spill": 0.70,
    "distributed.worker.memory.pause": 0.80,
    "scheduler": "threads",
    "num_workers": 2  # limit to 2 concurrent tasks
})

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


def process_dataset(config_path: Path, choice: str):
    with open(config_path, "r") as f:
        config = yaml.safe_load(f)

    downloader = DataDownloader(str(config_path))
    processor = GridProcessor(config)
    generator = TensorGenerator()

    logger.info("=" * 60)
    logger.info(f"PROCESSING {choice.upper()}")
    logger.info("=" * 60)

    try:
        if choice == "sst":
            raw_path = downloader.raw_dir / "sst.nc"
            ds = OSTIAAdapter(str(raw_path), processor).load()
            generator.generate_feature(ds, "sst")
            del ds
            if raw_path.exists():
                raw_path.unlink()
                logger.info(f"Deleted raw data: {raw_path}")

        elif choice == "sss":
            raw_path = downloader.raw_dir / "sss.nc"
            ds = CMEMSAdapter(str(raw_path), processor).load()
            generator.generate_feature(ds, "sss")
            del ds
            if raw_path.exists():
                raw_path.unlink()
                logger.info(f"Deleted raw data: {raw_path}")

        elif choice == "ssh":
            raw_path = downloader.raw_dir / "ssh.nc"
            ds = DUACSAdapter(str(raw_path), processor).load()
            generator.generate_feature(ds, "ssh")
            del ds
            if raw_path.exists():
                raw_path.unlink()
                logger.info(f"Deleted raw data: {raw_path}")

        elif choice == "currents":
            base_name = "currents"
            single_path = downloader.raw_dir / f"{base_name}.nc"
            chunked_files = sorted(list(downloader.raw_dir.glob(f"{base_name}_*.nc")))
            
            if chunked_files:
                path_to_load = [str(p) for p in chunked_files]
                paths_to_delete = chunked_files
            else:
                path_to_load = str(single_path)
                paths_to_delete = [single_path] if single_path.exists() else []

            ds = OSCARAdapter(path_to_load, processor).load()
            generator.generate_feature(ds, "currents")
            del ds
            for p in paths_to_delete:
                if p.exists():
                    p.unlink()
                    logger.info(f"Deleted raw data: {p}")

        elif choice == "winds":
            base_name = "winds"
            single_path = downloader.raw_dir / f"{base_name}.nc"
            chunked_files = sorted(list(downloader.raw_dir.glob(f"{base_name}_*.nc")))
            
            if chunked_files:
                path_to_load = [str(p) for p in chunked_files]
                paths_to_delete = chunked_files
            else:
                path_to_load = str(single_path)
                paths_to_delete = [single_path] if single_path.exists() else []

            ds = CCMPAdapter(path_to_load, processor).load()
            generator.generate_feature(ds, "winds")
            del ds
            for p in paths_to_delete:
                if p.exists():
                    p.unlink()
                    logger.info(f"Deleted raw data: {p}")

        elif choice == "target_glorys":
            base_name = "target_glorys"
            single_path = downloader.raw_dir / f"{base_name}.nc"
            chunked_files = sorted(list(downloader.raw_dir.glob(f"{base_name}_*.nc")))
            
            if chunked_files:
                path_to_load = [str(p) for p in chunked_files]
                paths_to_delete = chunked_files
            else:
                path_to_load = str(single_path)
                paths_to_delete = [single_path] if single_path.exists() else []

            target_depths = config.get("depths", [0, 5, 10, 20, 30, 50, 75, 100, 125, 150, 200, 300, 500, 700, 1000])
            ds = GLORYSAdapter(path_to_load, processor, target_depths).load()
            generator.generate_targets(ds)
            del ds
            for p in paths_to_delete:
                if p.exists():
                    p.unlink()
                    logger.info(f"Deleted raw data: {p}")

    except Exception as e:
        logger.error(f"Failed to process {choice}: {e}")

def main():
    script_dir = Path(__file__).resolve().parent
    config_path = script_dir / "pipeline_config.yaml"

    print("\n" + "="*50)
    print("OceanEmbed Preprocessing Pipeline")
    print("="*50)
    print("Available datasets to preprocess:")
    print("  1. sst")
    print("  2. sss")
    print("  3. ssh")
    print("  4. currents")
    print("  5. winds")
    print("  6. target_glorys")
    print("  7. all (Process all downloaded data sequentially)")
    print("  0. exit")
    print("="*50)

    choice = input("Enter the number or name of the dataset to preprocess: ").strip().lower()

    mapping = {
        "1": "sst", "sst": "sst",
        "2": "sss", "sss": "sss",
        "3": "ssh", "ssh": "ssh",
        "4": "currents", "currents": "currents",
        "5": "winds", "winds": "winds",
        "6": "target_glorys", "target_glorys": "target_glorys",
        "7": "all", "all": "all"
    }

    selected = mapping.get(choice)

    if not selected:
        if choice in ["0", "exit", "quit"]:
            print("Exiting.")
        else:
            print("Invalid choice.")
        return

    if selected == "all":
        for ds_name in ["sst", "sss", "ssh", "currents", "winds", "target_glorys"]:
            process_dataset(config_path, ds_name)
    else:
        process_dataset(config_path, selected)

if __name__ == "__main__":
    main()
