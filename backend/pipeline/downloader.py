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

        config_entry = self.config["cmems_products"][product_key]
        dataset_id = config_entry["dataset_id"]
        domain = self.config["domain"]
        time_range = self.config["time_range"]

        output_file = self.raw_dir / f"{product_key}.nc"
        if output_file.exists():
            logger.info(f"File {output_file} already exists. Skipping download.")
            return

        logger.info(f"Downloading CMEMS {product_key} ({dataset_id}) to {output_file}")

        kwargs = {
            "dataset_id": dataset_id,
            "username": os.getenv("COPERNICUSMARINE_SERVICE_USERNAME"),
            "password": os.getenv("COPERNICUSMARINE_SERVICE_PASSWORD"),
            "start_datetime": time_range["start_date"],
            "end_datetime": time_range["end_date"],
            "minimum_longitude": domain["lon_min"],
            "maximum_longitude": domain["lon_max"],
            "minimum_latitude": domain["lat_min"],
            "maximum_latitude": domain["lat_max"],
            "output_filename": output_file.name,
            "output_directory": str(self.raw_dir)
        }

        # Filter by variables if specified
        variables = config_entry.get("variables")
        if not variables and "variable" in config_entry:
            variables = [config_entry["variable"]]
        if variables:
            kwargs["variables"] = variables

        # Filter by depth if specified
        if "depth_min" in config_entry:
            kwargs["minimum_depth"] = float(config_entry["depth_min"])
        if "depth_max" in config_entry:
            kwargs["maximum_depth"] = float(config_entry["depth_max"])

        # Using copernicusmarine subset to only download the NIO domain + variables + depths
        # For large datasets (like GLORYS), subsetting the whole time range in memory can freeze a 16GB RAM laptop.
        # We process in 1-year chunks to keep memory usage low.
        start_year = int(time_range["start_date"].split("-")[0])
        end_year = int(time_range["end_date"].split("-")[0])
        
        if end_year > start_year and product_key == "target_glorys":
            logger.info(f"GLORYS is very large. Downloading in {end_year - start_year + 1} yearly chunks to prevent memory freezing...")
            for year in range(start_year, end_year + 1):
                year_start = max(f"{year}-01-01", time_range["start_date"])
                year_end = min(f"{year}-12-31", time_range["end_date"])
                
                chunk_filename = f"{product_key}_{year}.nc"
                chunk_path = self.raw_dir / chunk_filename
                
                if chunk_path.exists():
                    logger.info(f"Chunk {year} already exists. Skipping download.")
                    continue
                
                logger.info(f"Downloading chunk for {year}...")
                chunk_kwargs = kwargs.copy()
                chunk_kwargs["start_datetime"] = year_start
                chunk_kwargs["end_datetime"] = year_end
                chunk_kwargs["output_filename"] = chunk_filename
                
                try:
                    copernicusmarine.subset(**chunk_kwargs)
                    logger.info(f"Successfully downloaded {chunk_filename}.")
                except Exception as e:
                    logger.error(f"Failed to download chunk {year}: {e}")
                    
            logger.info(f"Finished downloading all yearly chunks for {product_key}.")
            logger.info(f"NOTE: Data is saved as yearly chunks to prevent memory issues.")
        else:
            copernicusmarine.subset(**kwargs)
            logger.info(f"Successfully downloaded {product_key}.")

    def download_podaac(self, product_key: str):
        """Downloads and subsets data from NASA Earthdata (PO.DAAC) in yearly chunks."""
        if earthaccess is None:
            logger.error("earthaccess package is not installed. Run: pip install earthaccess")
            return

        try:
            import xarray as xr
        except ImportError:
            logger.error("xarray package is not installed. Run: pip install xarray")
            return

        short_name = self.config["podaac_products"][product_key]["short_name"]
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

        start_year = int(time_range["start_date"].split("-")[0])
        end_year = int(time_range["end_date"].split("-")[0])

        logger.info(f"Downloading PO.DAAC data in {end_year - start_year + 1} yearly chunks to prevent massive disk space usage...")

        for year in range(start_year, end_year + 1):
            year_start = max(f"{year}-01-01", time_range["start_date"])
            year_end = min(f"{year}-12-31", time_range["end_date"])
            
            chunk_filename = f"{product_key}_{year}.nc"
            chunk_path = self.raw_dir / chunk_filename
            
            if chunk_path.exists():
                logger.info(f"Chunk {year} already exists. Skipping download.")
                continue
                
            logger.info(f"Searching PO.DAAC for {short_name} for year {year}...")
            year_results = earthaccess.search_data(
                short_name=short_name,
                bounding_box=bbox,
                temporal=(year_start, year_end)
            )
            
            if not year_results:
                logger.warning(f"No granules found for {year}. Skipping.")
                continue
                
            logger.info(f"Found {len(year_results)} granules for {year}. Downloading locally first for faster processing...")

            # Download files locally to avoid slow network streaming
            temp_dir = self.raw_dir / f"temp_{product_key}_{year}"
            temp_dir.mkdir(parents=True, exist_ok=True)
            downloaded_files = earthaccess.download(year_results, local_path=str(temp_dir))
            
            # Filter out any None values (failed downloads)
            valid_files = [f for f in downloaded_files if f is not None]
            
            if not valid_files:
                logger.warning(f"All downloads failed for {year}. Skipping.")
                continue

            logger.info(f"Opening {len(valid_files)} local datasets for {year}...")
            # Open multi-file dataset lazily from local storage
            ds = xr.open_mfdataset(valid_files, chunks="auto")
            
            # Spatial subset depending on variable names (OSCAR uses lat/lon, CCMP might use latitude/longitude)
            lat_col = "latitude" if "latitude" in ds.coords else "lat"
            lon_col = "longitude" if "longitude" in ds.coords else "lon"
            
            # Crop to the bounding box
            ds = ds.sel(
                {
                    lat_col: slice(domain["lat_min"], domain["lat_max"]),
                    lon_col: slice(domain["lon_min"], domain["lon_max"])
                }
            )
            
            logger.info(f"Saving subsetted {product_key} for {year} to {chunk_path}...")
            # Write only the sliced data to disk
            ds.to_netcdf(chunk_path)
            
            # Clean up temporary files
            logger.info(f"Cleaning up temporary downloaded global files for {year}...")
            ds.close()
            for f in valid_files:
                try:
                    Path(f).unlink(missing_ok=True)
                except Exception as e:
                    logger.warning(f"Failed to delete temp file {f}: {e}")
            try:
                temp_dir.rmdir()
            except Exception:
                pass
            
            logger.info(f"Successfully processed chunk for {year}.")

        logger.info(f"Finished processing all yearly chunks for {product_key}.")

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
    from pathlib import Path
    script_dir = Path(__file__).resolve().parent
    config_path = script_dir / "pipeline_config.yaml"
    downloader = DataDownloader(str(config_path))
    
    print("\n" + "="*50)
    print("OceanEmbed Data Downloader")
    print("="*50)
    print("Available datasets to download:")
    print("  1. sst (Copernicus OSTIA)")
    print("  2. sss (Copernicus CMEMS)")
    print("  3. ssh (Copernicus DUACS)")
    print("  4. currents (PO.DAAC OSCAR)")
    print("  5. winds (PO.DAAC CCMP)")
    print("  6. target_glorys (Copernicus GLORYS12V1)")
    print("  7. argo (Validation Profiles)")
    print("  8. all (Download all of the above)")
    print("  0. exit")
    print("="*50)
    
    choice = input("Enter the number or name of the dataset to download: ").strip().lower()
    
    if choice in ["1", "sst"]:
        downloader.download_cmems("sst")
    elif choice in ["2", "sss"]:
        downloader.download_cmems("sss")
    elif choice in ["3", "ssh"]:
        downloader.download_cmems("ssh")
    elif choice in ["4", "currents"]:
        downloader.download_podaac("currents")
    elif choice in ["5", "winds"]:
        downloader.download_podaac("winds")
    elif choice in ["6", "target_glorys"]:
        downloader.download_cmems("target_glorys")
    elif choice in ["7", "argo"]:
        downloader.download_argo()
    elif choice in ["8", "all"]:
        downloader.download_cmems("sst")
        downloader.download_cmems("sss")
        downloader.download_cmems("ssh")
        downloader.download_cmems("target_glorys")
        downloader.download_podaac("currents")
        downloader.download_podaac("winds")
        downloader.download_argo()
    elif choice in ["0", "exit", "quit"]:
        print("Exiting.")
    else:
        print("Invalid choice.")
