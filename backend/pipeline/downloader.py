"""
Production-grade downloader for Satellite & Ocean datasets.

Supports:
  - Copernicus Marine Service (CMEMS) — SST, SSS, SSH, GLORYS
  - NASA Earthdata / PO.DAAC — OSCAR currents, CCMP winds
  - IFREMER GDAC — Argo float profiles (for validation)

All downloads are spatially subsetted to the North Indian Ocean domain
and temporally filtered to the configured time range.
"""

import os
import time
import yaml
import logging
from pathlib import Path
from dotenv import load_dotenv

# Optional imports for downloading
try:
    import copernicusmarine
except ImportError:
    copernicusmarine = None

try:
    import earthaccess
except ImportError:
    earthaccess = None

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("Downloader")


class DataDownloader:
    """Production-grade downloader for Satellite & Ocean datasets."""

    def __init__(self, config_path: str = "pipeline_config.yaml"):
        # Load environment variables
        load_dotenv()

        # Load YAML configuration
        with open(config_path, "r") as f:
            self.config = yaml.safe_load(f)

        self.raw_dir = Path(os.getenv("RAW_DATA_DIR", "./data/raw"))
        self.raw_dir.mkdir(parents=True, exist_ok=True)

    def download_cmems(self, product_key: str):
        """Downloads data from Copernicus Marine Service using subsetting."""
        if copernicusmarine is None:
            logger.error("copernicusmarine package is not installed. Run: pip install copernicusmarine")
            return

        dataset_id = self.config["cmems_products"][product_key]["dataset_id"]
        domain = self.config["domain"]
        time_range = self.config["time_range"]

        output_file = self.raw_dir / f"{product_key}.nc"
        if output_file.exists():
            logger.info(f"File {output_file} already exists. Skipping download.")
            return

        logger.info(f"Downloading CMEMS {product_key} ({dataset_id}) to {output_file}")

        # Using copernicusmarine subset to only download the NIO domain
        copernicusmarine.subset(
            dataset_id=dataset_id,
            username=os.getenv("COPERNICUSMARINE_SERVICE_USERNAME"),
            password=os.getenv("COPERNICUSMARINE_SERVICE_PASSWORD"),
            start_datetime=time_range["start_date"],
            end_datetime=time_range["end_date"],
            minimum_longitude=domain["lon_min"],
            maximum_longitude=domain["lon_max"],
            minimum_latitude=domain["lat_min"],
            maximum_latitude=domain["lat_max"],
            output_filename=output_file.name,
            output_directory=str(self.raw_dir),
            force_download=True
        )
        logger.info(f"Successfully downloaded {product_key}.")

    def download_podaac(self, product_key: str):
        """Downloads data from NASA Earthdata (PO.DAAC)."""
        if earthaccess is None:
            logger.error("earthaccess package is not installed. Run: pip install earthaccess")
            return

        short_name = self.config["podaac_products"][product_key]["short_name"]
        output_dir = self.raw_dir / product_key
        if output_dir.exists() and any(output_dir.iterdir()):
            logger.info(f"Directory {output_dir} already contains data. Skipping {product_key}.")
            return
        time_range = self.config["time_range"]
        domain = self.config["domain"]
        bbox = (domain["lon_min"], domain["lat_min"], domain["lon_max"], domain["lat_max"])

        logger.info(f"Authenticating with Earthdata for {product_key}...")
        max_retries = 3
        for attempt in range(max_retries):
            try:
                earthaccess.login(strategy="environment")
                break
            except Exception as e:
                if attempt == max_retries - 1:
                    logger.error(f"Failed to authenticate with Earthdata after {max_retries} attempts.")
                    raise
                logger.warning(f"Earthdata login timeout/error: {e}. Retrying ({attempt+1}/{max_retries})...")
                time.sleep(5)

        logger.info(f"Searching PO.DAAC for {short_name}...")
        results = earthaccess.search_data(
            short_name=short_name,
            bounding_box=bbox,
            temporal=(time_range["start_date"], time_range["end_date"])
        )

        logger.info(f"Found {len(results)} granules. Downloading...")

        out_path = self.raw_dir / product_key
        out_path.mkdir(exist_ok=True)
        earthaccess.download(results, local_path=str(out_path))
        logger.info(f"Successfully downloaded {product_key}.")

    def download_argo(self):
        """Downloads Argo float profiles from IFREMER GDAC for validation.

        Downloads all available profiles in the NIO domain.
        Requires internet access to the IFREMER GDAC HTTPS server.
        """
        argo_config = self.config.get("argo", {})
        gdac_url = argo_config.get("gdac_url", "https://data-argo.ifremer.fr/geo/indian_ocean")
        local_dir_name = argo_config.get("local_dir", "argo_profiles")

        output_dir = self.raw_dir / local_dir_name
        if output_dir.exists() and any(output_dir.glob("*.nc")):
            logger.info(f"Argo profiles already exist in {output_dir}. Skipping.")
            return

        output_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"Downloading Argo profiles from {gdac_url} to {output_dir}")

        try:
            import urllib.request
            import re

            # Fetch the index page to find .nc file links
            response = urllib.request.urlopen(gdac_url)
            html = response.read().decode("utf-8")

            # Parse links to .nc files
            nc_links = re.findall(r'href="([^"]*\.nc)"', html)
            logger.info(f"Found {len(nc_links)} Argo profile files.")

            downloaded = 0
            for link in nc_links[:100]:  # Limit to first 100 for validation
                file_url = f"{gdac_url}/{link}" if not link.startswith("http") else link
                dest = output_dir / Path(link).name
                try:
                    urllib.request.urlretrieve(file_url, str(dest))
                    downloaded += 1
                except Exception as e:
                    logger.debug(f"Failed to download {link}: {e}")
                    continue

            logger.info(f"Successfully downloaded {downloaded} Argo profiles.")

        except Exception as e:
            logger.warning(
                f"Could not auto-download Argo profiles: {e}. "
                f"Please manually place Argo .nc files in {output_dir}"
            )


if __name__ == "__main__":
    downloader = DataDownloader()
    # Example: downloader.download_cmems("sst")
    # Example: downloader.download_podaac("currents")
    # Example: downloader.download_argo()
