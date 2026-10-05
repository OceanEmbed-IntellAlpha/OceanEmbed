"""
Adapter for CMEMS Sea Surface Salinity (SSS) Data.

Supports two source products with automatic transition handling:
  - Pre-2015-04-01: SMOS-only (cmems_obs-mob_glo_phy-sss_my_smos_P1D)
  - Post-2015-04-01: Merged SMAP+SMOS (cmems_obs-mob_glo_phy-sss_my_multi_P1D)

When the download pipeline spans the SMAP launch date, two separate files are
produced (sss_smos.nc and sss_smap.nc). This adapter detects both segments,
loads them individually, and concatenates along the time dimension to produce
a seamless, continuous SSS record.

Native resolution: ~0.125°, daily
Output variable: sos (PSU)

Preprocessing:
  1. Load with Dask chunking (single file or SMOS+SMAP segments)
  2. Temporal concatenation if split files detected
  3. Spatial subset to NIO domain
  4. Regrid to 0.25° via bilinear interpolation
  5. Align time to daily mean
  6. Apply QC range check (20–42 PSU)
"""

import xarray as xr
import logging
from pathlib import Path
from backend.pipeline.processor import GridProcessor

logger = logging.getLogger("Adapter.SSS")

SSS_VALID_MIN = 20.0
SSS_VALID_MAX = 42.0


class CMEMSAdapter:
    """Adapter for CMEMS Sea Surface Salinity (SSS) Data.

    Handles both single-file and split SMOS/SMAP download layouts
    transparently. The adapter first checks for segment files
    (sss_smos.nc, sss_smap.nc) produced by the downloader's SMOS
    fallback logic. If found, they are concatenated. Otherwise,
    falls back to loading a single sss.nc file.
    """

    def __init__(self, data_path: str, processor: GridProcessor):
        self.data_path = data_path
        self.processor = processor

    def _detect_sss_files(self) -> list[str]:
        """Detect available SSS data files (single or split segments).

        Returns a list of file paths to load and concatenate.
        """
        data_dir = Path(self.data_path).parent
        smos_file = data_dir / "sss_smos.nc"
        smap_file = data_dir / "sss_smap.nc"
        single_file = Path(self.data_path)

        files = []

        # Prefer split files if they exist (produced by SMOS fallback downloader)
        if smos_file.exists():
            files.append(str(smos_file))
            logger.info(f"Detected SMOS SSS segment: {smos_file}")
        if smap_file.exists():
            files.append(str(smap_file))
            logger.info(f"Detected SMAP SSS segment: {smap_file}")

        # Fall back to single file if no split segments found
        if not files and single_file.exists():
            files.append(str(single_file))
            logger.info(f"Using single SSS file: {single_file}")

        if not files:
            raise FileNotFoundError(
                f"No SSS data files found. Expected either "
                f"'{single_file}' or split segments "
                f"'{smos_file}' / '{smap_file}'."
            )

        return files

    def load(self) -> xr.Dataset:
        files = self._detect_sss_files()

        if len(files) == 1:
            ds = xr.open_dataset(files[0], chunks={"time": "auto"})
            logger.info(f"Loaded single SSS file: {files[0]}")
        else:
            # Concatenate SMOS and SMAP segments along the time dimension.
            # Both products share the same variable name (sos) and coordinate
            # system, so xr.open_mfdataset handles alignment automatically.
            ds = xr.open_mfdataset(
                files,
                chunks={"time": "auto"},
                combine="by_coords",
                join="outer",
            )
            logger.info(
                f"Loaded and concatenated {len(files)} SSS segments "
                f"(SMOS + SMAP). Combined time range: "
                f"{str(ds.time.values[0])[:10]} → {str(ds.time.values[-1])[:10]}"
            )

        ds = self.processor.subset(ds, lat_name="latitude", lon_name="longitude")
        ds = self.processor.regrid(ds, lat_name="latitude", lon_name="longitude", method="linear")
        ds = self.processor.align_time(ds, time_name="time")

        ds = ds[["sos"]]

        # CMEMS SSS includes a singleton depth dim (shape=1); squeeze it to (time, lat, lon)
        if "depth" in ds.dims:
            ds = ds.squeeze("depth", drop=True)

        # QC: flag values outside oceanographic range
        ds["sos"] = ds["sos"].where(
            (ds["sos"] >= SSS_VALID_MIN) & (ds["sos"] <= SSS_VALID_MAX)
        )
        logger.info(f"SSS preprocessing complete. Shape: {dict(ds.sizes)}")

        return ds
