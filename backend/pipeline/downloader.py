"""
Production-grade downloader for Satellite & Ocean datasets.

Supports:
  - Copernicus Marine Service (CMEMS) — SST, SSS, SSH, GLORYS
  - NASA Earthdata / PO.DAAC — OSCAR currents, CCMP winds
  - IFREMER GDAC — Argo float profiles (for validation)
  - INCOIS LAS/ERDDAP — Gridded Argo products

All downloads are spatially subsetted to the North Indian Ocean domain
and temporally filtered to the configured time range. Includes multithreading
for faster file retrieval and robust resumability.
"""

import os
import time
import yaml
import logging
import re
import ssl
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from dotenv import load_dotenv
from tqdm import tqdm

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

# Workaround for SSL certificate verification issues on some systems (e.g. INCOIS ERDDAP)
if hasattr(ssl, '_create_unverified_context'):
    ssl._create_default_https_context = ssl._create_unverified_context


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
        """Downloads data from Copernicus Marine Service using subsetting.
        
        For SSS data, this method automatically handles the SMOS→SMAP satellite
        transition at 2015-04-01. Before that date, SSS is downloaded from the
        SMOS-only product (cmems_obs-mob_glo_phy-sss_my_smos_P1D). From
        2015-04-01 onward, the merged SMAP+SMOS product is used. The two
        segments are saved as separate files (sss_smos.nc and sss_smap.nc)
        and merged by the SSS adapter during preprocessing.
        """
        if copernicusmarine is None:
            logger.error("copernicusmarine package is not installed. Run: pip install copernicusmarine")
            return

        config_entry = self.config["cmems_products"][product_key]
        dataset_id = config_entry["dataset_id"]
        domain = self.config["domain"]
        time_range = self.config["time_range"]

        # ── SSS: Handle SMOS/SMAP satellite transition ──────────────────────
        # SMAP launched 2015-04-01. Before that date, only SMOS provides SSS.
        # The config defines a fallback dataset ID and switchover date.
        smos_dataset_id = config_entry.get("smos_only_dataset_id")
        smap_start_date = config_entry.get("smap_start_date")

        if product_key == "sss" and smos_dataset_id and smap_start_date:
            self._download_sss_with_smos_fallback(
                config_entry, domain, time_range, smos_dataset_id, smap_start_date
            )
            return

        output_file = self.raw_dir / f"{product_key}.nc"
        if output_file.exists():
            logger.info(f"File {output_file} already exists. Skipping download.")
            return

        logger.info(f"Downloading CMEMS {product_key} ({dataset_id}) to {output_file}")

        kwargs = self._build_cmems_kwargs(config_entry, domain, time_range, output_file)

        # Using copernicusmarine subset to only download the NIO domain + variables + depths
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
        else:
            copernicusmarine.subset(**kwargs)
            logger.info(f"Successfully downloaded {product_key}.")

    def _build_cmems_kwargs(self, config_entry: dict, domain: dict, time_range: dict, output_file: Path) -> dict:
        """Builds the kwargs dict for copernicusmarine.subset()."""
        kwargs = {
            "dataset_id": config_entry["dataset_id"],
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

        return kwargs

    def _download_sss_with_smos_fallback(
        self,
        config_entry: dict,
        domain: dict,
        time_range: dict,
        smos_dataset_id: str,
        smap_start_date: str,
    ):
        """Downloads SSS data with automatic SMOS/SMAP satellite switching.

        SMAP satellite data is only available from 2015-04-01 onward. For dates
        before the switchover, SSS is downloaded from the SMOS-only product.
        After the switchover, the merged SMAP+SMOS multi-observation product is
        used. The two segments are saved as separate files and later merged by
        the SSS preprocessing adapter.

        Produces:
          - data/raw/sss_smos.nc   (pre-SMAP period, if applicable)
          - data/raw/sss_smap.nc   (post-SMAP period, if applicable)
          - OR data/raw/sss.nc     (if the entire range falls within one product)
        """
        merged_dataset_id = config_entry["dataset_id"]
        start_date = time_range["start_date"]
        end_date = time_range["end_date"]

        needs_smos = start_date < smap_start_date
        needs_smap = end_date >= smap_start_date

        # ── Case 1: Entire range is pre-SMAP → download SMOS-only as sss.nc ──
        if needs_smos and not needs_smap:
            output_file = self.raw_dir / "sss.nc"
            if output_file.exists():
                logger.info(f"SSS file {output_file} already exists. Skipping.")
                return

            logger.info(
                f"SSS: Entire range ({start_date} → {end_date}) is pre-SMAP. "
                f"Downloading SMOS-only product ({smos_dataset_id})."
            )
            smos_entry = config_entry.copy()
            smos_entry["dataset_id"] = smos_dataset_id
            kwargs = self._build_cmems_kwargs(smos_entry, domain, time_range, output_file)
            copernicusmarine.subset(**kwargs)
            logger.info("Successfully downloaded SSS (SMOS-only).")
            return

        # ── Case 2: Entire range is post-SMAP → download merged as sss.nc ──
        if needs_smap and not needs_smos:
            output_file = self.raw_dir / "sss.nc"
            if output_file.exists():
                logger.info(f"SSS file {output_file} already exists. Skipping.")
                return

            logger.info(
                f"SSS: Entire range ({start_date} → {end_date}) is post-SMAP. "
                f"Downloading merged product ({merged_dataset_id})."
            )
            kwargs = self._build_cmems_kwargs(config_entry, domain, time_range, output_file)
            copernicusmarine.subset(**kwargs)
            logger.info("Successfully downloaded SSS (merged SMAP+SMOS).")
            return

        # ── Case 3: Range spans the SMAP transition → split into two files ──
        logger.info(
            f"SSS: Date range ({start_date} → {end_date}) spans the SMAP transition "
            f"at {smap_start_date}. Downloading in two segments:"
        )

        # Compute the day before SMAP start for the SMOS segment end date
        from datetime import datetime, timedelta
        smap_dt = datetime.strptime(smap_start_date, "%Y-%m-%d")
        smos_end_date = (smap_dt - timedelta(days=1)).strftime("%Y-%m-%d")

        # Segment 1: SMOS-only (start_date → day before smap_start_date)
        smos_file = self.raw_dir / "sss_smos.nc"
        if smos_file.exists():
            logger.info(f"SMOS segment {smos_file} already exists. Skipping.")
        else:
            logger.info(
                f"  Segment 1/2: SMOS-only ({start_date} → {smos_end_date}) "
                f"using {smos_dataset_id}"
            )
            smos_entry = config_entry.copy()
            smos_entry["dataset_id"] = smos_dataset_id
            smos_time_range = {"start_date": start_date, "end_date": smos_end_date}
            kwargs = self._build_cmems_kwargs(smos_entry, domain, smos_time_range, smos_file)
            try:
                copernicusmarine.subset(**kwargs)
                logger.info("Successfully downloaded SSS SMOS segment.")
            except Exception as e:
                logger.error(f"Failed to download SMOS SSS segment: {e}")

        # Segment 2: Merged SMAP+SMOS (smap_start_date → end_date)
        smap_file = self.raw_dir / "sss_smap.nc"
        if smap_file.exists():
            logger.info(f"SMAP segment {smap_file} already exists. Skipping.")
        else:
            logger.info(
                f"  Segment 2/2: Merged SMAP+SMOS ({smap_start_date} → {end_date}) "
                f"using {merged_dataset_id}"
            )
            smap_time_range = {"start_date": smap_start_date, "end_date": end_date}
            kwargs = self._build_cmems_kwargs(config_entry, domain, smap_time_range, smap_file)
            try:
                copernicusmarine.subset(**kwargs)
                logger.info("Successfully downloaded SSS merged SMAP+SMOS segment.")
            except Exception as e:
                logger.error(f"Failed to download merged SSS segment: {e}")

        logger.info("SSS download complete (both SMOS and SMAP segments).")

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

        logger.info(f"Downloading PO.DAAC data in {end_year - start_year + 1} yearly chunks...")

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
                
            logger.info(f"Found {len(year_results)} granules for {year}. Downloading locally first...")

            temp_dir = self.raw_dir / f"temp_{product_key}_{year}"
            temp_dir.mkdir(parents=True, exist_ok=True)
            
            batch_size = 30
            downloaded_files = []
            
            for i in tqdm(range(0, len(year_results), batch_size), desc=f"Downloading {product_key} ({year})"):
                batch = year_results[i:i + batch_size]
                batch_retries = 3
                for attempt in range(batch_retries):
                    try:
                        batch_files = earthaccess.download(batch, local_path=str(temp_dir))
                        if batch_files:
                            downloaded_files.extend(batch_files)
                        break
                    except Exception as e:
                        if attempt == batch_retries - 1:
                            logger.error(f"Failed to download batch after {batch_retries} attempts: {e}")
                        else:
                            time.sleep(5)
            
            valid_files = [f for f in downloaded_files if f is not None]
            
            if not valid_files:
                logger.warning(f"All downloads failed for {year}. Skipping.")
                continue

            logger.info(f"Opening {len(valid_files)} local datasets for {year}...")
            ds = xr.open_mfdataset(valid_files, chunks="auto")
            
            lat_col = "latitude" if "latitude" in ds.coords else "lat"
            lon_col = "longitude" if "longitude" in ds.coords else "lon"
            
            ds = ds.sel(
                {
                    lat_col: slice(domain["lat_min"], domain["lat_max"]),
                    lon_col: slice(domain["lon_min"], domain["lon_max"])
                }
            )
            
            logger.info(f"Saving subsetted {product_key} for {year} to {chunk_path}...")
            ds.to_netcdf(chunk_path)
            
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

    def download_argo(self, start_year: int = None, end_year: int = None):
        """Orchestrates Argo downloads (IFREMER and INCOIS)."""
        argo_config = self.config.get("argo", {})
        
        # Override dates if provided
        if start_year is None:
            start_year = int(str(argo_config.get("start_date", "2010")).split("-")[0])
        if end_year is None:
            end_year = int(str(argo_config.get("end_date", "2023")).split("-")[0])

        if argo_config.get("ifremer", {}).get("enabled", True):
            self._download_ifremer_argo(start_year, end_year)
            
        if argo_config.get("incois", {}).get("enabled", True):
            self._download_incois_argo(start_year, end_year)

    def _download_ifremer_argo(self, start_year: int, end_year: int):
        """Downloads raw Argo profiles from IFREMER GDAC using multithreading."""
        argo_config = self.config.get("argo", {})
        ifremer_config = argo_config.get("ifremer", {})
        
        gdac_url = ifremer_config.get("gdac_url", "https://data-argo.ifremer.fr/geo/indian_ocean")
        local_dir = ifremer_config.get("local_dir", "argo_profiles/ifremer")
        
        output_dir = self.raw_dir / local_dir
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # Use a session with connection pooling and retries
        session = requests.Session()
        retries = Retry(total=3, backoff_factor=0.3, status_forcelist=[500, 502, 503, 504])
        session.mount('https://', HTTPAdapter(max_retries=retries, pool_connections=20, pool_maxsize=20))
        
        logger.info(f"--- IFREMER GDAC Argo Downloader ---")
        logger.info(f"Scraping IFREMER GDAC for years {start_year} to {end_year}...")

        try:
            response = session.get(gdac_url)
            html = response.text
            available_years = re.findall(r'href="(\d{4}/)"', html)

            
            target_years = [
                y for y in sorted(available_years)
                if start_year <= int(y.rstrip("/")) <= end_year
            ]

            nc_links = []
            
            # Scrape file links
            for year_dir in tqdm(target_years, desc="Scraping year directories"):
                year_url = f"{gdac_url.rstrip('/')}/{year_dir}"
                try:
                    html_year = session.get(year_url).text
                except Exception:
                    continue

                available_months = re.findall(r'href="(\d{2}/)"', html_year)
                for month_dir in sorted(available_months):
                    month_url = f"{year_url}{month_dir}"
                    try:
                        html_month = session.get(month_url).text
                        files = re.findall(r'href="([^"]*\.nc)"', html_month)
                        for f in files:
                            nc_links.append(f"{month_url}{f}")
                    except Exception:
                        continue

            logger.info(f"Found {len(nc_links)} IFREMER Argo profile files.")
            if not nc_links:
                return

            # Multithreaded download function
            def fetch_file(file_url):
                filename = file_url.split('/')[-1]
                dest = output_dir / filename
                
                # Check for resumability
                if dest.exists() and dest.stat().st_size > 0:
                    return (True, filename)  # Already downloaded
                    
                max_retries = 3
                for attempt in range(max_retries):
                    try:
                        # Stream the file using the persistent session
                        with session.get(file_url, stream=True, timeout=15) as response:
                            response.raise_for_status()
                            with open(dest, 'wb') as out_file:
                                for chunk in response.iter_content(chunk_size=1048576): # 1MB chunks
                                    if chunk:
                                        out_file.write(chunk)
                        return (True, filename)
                    except Exception as e:
                        if attempt == max_retries - 1:
                            # Delete partial file
                            if dest.exists():
                                dest.unlink()
                            return (False, filename)
                        time.sleep(1)
                return (False, filename)

            # Execute downloads concurrently
            success_count = 0
            failed_count = 0
            
            # Use max 20 workers to take advantage of high bandwidth + connection pool
            max_workers = min(20, (os.cpu_count() or 4) * 2)
            logger.info(f"Downloading with {max_workers} concurrent threads and HTTP Keep-Alive...")
            
            with ThreadPoolExecutor(max_workers=max_workers) as executor:
                futures = {executor.submit(fetch_file, url): url for url in nc_links}
                
                with tqdm(total=len(nc_links), desc="Downloading IFREMER Profiles") as pbar:
                    for future in as_completed(futures):
                        success, fname = future.result()
                        if success:
                            success_count += 1
                        else:
                            failed_count += 1
                        pbar.update(1)

            logger.info(f"IFREMER Download complete: {success_count} succeeded, {failed_count} failed.")
            
        except Exception as e:
            logger.warning(f"Could not scrape IFREMER GDAC: {e}")

    def _download_incois_argo(self, start_year: int, end_year: int):
        """Downloads INCOIS Gridded Argo products."""
        argo_config = self.config.get("argo", {})
        incois_config = argo_config.get("incois", {})
        
        erddap_base = incois_config.get("erddap_base_url", "https://erddap.incois.gov.in/erddap/griddap")
        dataset_id = incois_config.get("dataset_id", "incois_argo_10d_VAM")
        erddap_url = f"{erddap_base}/{dataset_id}.nc"
        
        local_dir = incois_config.get("local_dir", "argo_profiles/incois")
        
        output_dir = self.raw_dir / local_dir
        output_dir.mkdir(parents=True, exist_ok=True)
        
        logger.info(f"--- INCOIS Gridded Argo Downloader ({dataset_id}) ---")
        
        # INCOIS ERDDAP subsetting parameters based on config
        lat_min = argo_config.get("lat_min", 5.0)
        lat_max = argo_config.get("lat_max", 30.0)
        lon_min = argo_config.get("lon_min", 45.0)
        lon_max = argo_config.get("lon_max", 105.0)
        
        for year in range(start_year, end_year + 1):
            dest = output_dir / f"{dataset_id}_{year}.nc"
            if dest.exists() and dest.stat().st_size > 0:
                logger.info(f"INCOIS file {dest.name} already exists. Skipping.")
                continue
                
            # Construct ERDDAP subset URL
            # Format: dataset.nc?var[(time)][(ZAX)][(latitude)][(longitude)]
            time_start = f"{year}-01-01T00:00:00Z"
            time_end = f"{year}-12-31T23:59:59Z"
            
            # Requesting TEMP and SAL. The depth dimension is ZAX, starting at 5.0m
            z_min = 5.0
            z_max = 2000.0
            
            subset_query = (
                f"?TEMP[({time_start}):1:({time_end})][({z_min}):1:({z_max})]"
                f"[({lat_min}):1:({lat_max})][({lon_min}):1:({lon_max})],"
                f"SAL[({time_start}):1:({time_end})][({z_min}):1:({z_max})]"
                f"[({lat_min}):1:({lat_max})][({lon_min}):1:({lon_max})]"
            )
            download_url = f"{erddap_url}{subset_query}"
            
            logger.info(f"Attempting to download INCOIS data for {year}...")
            logger.debug(f"ERDDAP URL: {download_url}")
            
            max_retries = 3
            success = False
            for attempt in range(max_retries):
                try:
                    with requests.get(download_url, stream=True, timeout=60, verify=False) as response:
                        if response.status_code == 404:
                            logger.warning(f"INCOIS dataset not found for {year} (HTTP 404). URL might have changed.")
                            break
                        response.raise_for_status()
                        
                        total_length = response.headers.get('content-length')
                        
                        with open(dest, 'wb') as out_file:
                            if total_length is None:
                                # No content length header
                                for chunk in response.iter_content(chunk_size=1048576):
                                    if chunk: out_file.write(chunk)
                            else:
                                total_length = int(total_length)
                                with tqdm(total=total_length, unit='B', unit_scale=True, desc=f"Downloading {dest.name}") as pbar:
                                    for chunk in response.iter_content(chunk_size=1048576): # 1MB chunk size
                                        if chunk:
                                            out_file.write(chunk)
                                            pbar.update(len(chunk))
                    success = True
                    logger.info(f"Successfully downloaded INCOIS data for {year}.")
                    break
                except requests.exceptions.HTTPError as e:
                    logger.warning(f"HTTP Error {e.response.status_code} for INCOIS {year}. Retrying...")
                    time.sleep(2)
                except Exception as e:
                    if attempt == max_retries - 1:
                        logger.error(f"Failed to download INCOIS data for {year}: {e}")
                        if dest.exists():
                            dest.unlink()
                    else:
                        logger.warning(f"Connection issue: {e}. Retrying...")
                        time.sleep(5)
            
            if not success:
                logger.warning(f"Could not download INCOIS data for {year}.")


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
    print("  7. argo (Validation Profiles - IFREMER + INCOIS)")
    print("  8. all (Download all of the above)")
    print("  0. exit")
    print("="*50)
    
    choice = input("Enter the number or name of the dataset to download: ").strip().lower()
    
    def prompt_years():
        """Helper to prompt for custom years for Argo."""
        print("\nArgo data supports interactive year selection (e.g., 2010 to 2023).")
        print("Leave blank to use defaults from config.")
        start = input("Enter start year [default: from config]: ").strip()
        end = input("Enter end year [default: from config]: ").strip()
        
        s_year = int(start) if start.isdigit() else None
        e_year = int(end) if end.isdigit() else None
        return s_year, e_year

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
        s_year, e_year = prompt_years()
        downloader.download_argo(start_year=s_year, end_year=e_year)
    elif choice in ["8", "all"]:
        s_year, e_year = prompt_years()
        downloader.download_cmems("sst")
        downloader.download_cmems("sss")
        downloader.download_cmems("ssh")
        downloader.download_cmems("target_glorys")
        downloader.download_podaac("currents")
        downloader.download_podaac("winds")
        downloader.download_argo(start_year=s_year, end_year=e_year)
    elif choice in ["0", "exit", "quit"]:
        print("Exiting.")
    else:
        print("Invalid choice.")
