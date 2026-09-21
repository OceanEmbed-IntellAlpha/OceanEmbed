"""
OceanEmbed — Friend Zarr Data Consolidation Script.

Consolidates the 13-year (2010–2023, 5,113 days) dataset from friend_check/
into canonical OceanEmbed format under data/processed/:
  - data/processed/surface_features.zarr (Zarr V2, consolidated, 7 channels)
  - data/processed/target_glorys.zarr   (Zarr V2, consolidated, 15 depths)

Conversions applied:
  1. currents.zarr transposed from (time, lon, lat) to (time, lat, lon)
  2. sss.zarr squeezed along singleton depth=1 dimension
  3. All data arrays cast to float32
  4. Target depth coordinates kept at native GLORYS levels (last level 902.34 m, not 1062.44)
  5. Saved as consolidated Zarr V2 format (with .zmetadata) for PyTorch Dataloader compatibility
"""

import sys
import time
import shutil
import logging
from pathlib import Path
import numpy as np
import xarray as xr

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("ConsolidateFriendData")
sys.stdout.reconfigure(encoding='utf-8')

# Expected canonical dimensions & coordinates
EXPECTED_TIME_STEPS = 5113
EXPECTED_LAT_POINTS = 101
EXPECTED_LON_POINTS = 241
EXPECTED_DEPTH_LEVELS = 15

CANONICAL_GLORYS_DEPTHS = np.array([
    0.494025, 5.078224, 9.572997, 18.49556, 29.44473,
    47.37369, 77.85385, 92.32607, 130.6660, 155.8507,
    186.1256, 318.1274, 541.0889, 643.5668, 902.3393
], dtype=np.float32)

SURFACE_VARS = ["analysed_sst", "sos", "sla", "u", "v", "uwnd", "vwnd"]


def get_dir_size_bytes(path: Path) -> int:
    return sum(f.stat().st_size for f in path.rglob('*') if f.is_file())


def clean_encoding(ds: xr.Dataset, chunk_dict: dict) -> xr.Dataset:
    """Clear Zarr V3 encoding artifacts and apply canonical chunking."""
    for var_name in list(ds.variables):
        ds[var_name].encoding.clear()
        # Ensure proper chunking for data vars
        if var_name in ds.data_vars:
            chunks = tuple(chunk_dict[d] for d in ds[var_name].dims)
            ds[var_name].encoding["chunks"] = chunks
    return ds


def consolidate_data(
    input_dir: Path,
    output_dir: Path
):
    start_time = time.time()
    logger.info("=" * 75)
    logger.info("STARTING CONSOLIDATION OF FRIEND ZARR DATASET")
    logger.info(f"Source Directory: {input_dir}")
    logger.info(f"Target Directory: {output_dir}")
    logger.info("=" * 75)

    if not input_dir.exists():
        raise FileNotFoundError(f"Input directory does not exist: {input_dir}")

    output_dir.mkdir(parents=True, exist_ok=True)

    # -------------------------------------------------------------------------
    # 1. Open Source Datasets
    # -------------------------------------------------------------------------
    logger.info("Step 1: Opening source Zarr stores (lazy)...")
    sst_ds = xr.open_zarr(input_dir / "sst.zarr")
    sss_ds = xr.open_zarr(input_dir / "sss.zarr")
    ssh_ds = xr.open_zarr(input_dir / "ssh.zarr")
    currents_ds = xr.open_zarr(input_dir / "currents.zarr")
    winds_ds = xr.open_zarr(input_dir / "winds.zarr")
    target_ds = xr.open_zarr(input_dir / "target_glorys.zarr")

    # -------------------------------------------------------------------------
    # 2. Apply Conversions
    # -------------------------------------------------------------------------
    logger.info("Step 2: Applying schema conversions...")

    # Conversion 1: Squeeze singleton depth dimension in sss
    if "depth" in sss_ds.dims:
        logger.info("  -> Squeezing singleton depth dimension in sss.zarr")
        sss_ds = sss_ds.squeeze("depth", drop=True)

    # Conversion 2: Transpose currents from (time, lon, lat) to (time, lat, lon)
    if currents_ds["u"].dims != ("time", "latitude", "longitude"):
        logger.info(f"  -> Transposing currents from {currents_ds['u'].dims} to ('time', 'latitude', 'longitude')")
        currents_ds = currents_ds.transpose("time", "latitude", "longitude")

    # Conversion 3: Cast all surface variables to float32
    logger.info("  -> Casting surface variables to float32...")
    analysed_sst = sst_ds["analysed_sst"].astype(np.float32)
    sos = sss_ds["sos"].astype(np.float32)
    sla = ssh_ds["sla"].astype(np.float32)
    u = currents_ds["u"].astype(np.float32)
    v = currents_ds["v"].astype(np.float32)
    uwnd = winds_ds["uwnd"].astype(np.float32)
    vwnd = winds_ds["vwnd"].astype(np.float32)

    # Reference coordinates
    ref_time = sst_ds.time
    ref_lat = sst_ds.latitude
    ref_lon = sst_ds.longitude

    # -------------------------------------------------------------------------
    # 3. Build & Validate Merged Surface Dataset
    # -------------------------------------------------------------------------
    logger.info("Step 3: Merging 7 surface variables into a single dataset...")
    surface_ds = xr.Dataset(
        data_vars={
            "analysed_sst": analysed_sst,
            "sos": sos,
            "sla": sla,
            "u": u,
            "v": v,
            "uwnd": uwnd,
            "vwnd": vwnd,
        },
        coords={
            "time": ref_time,
            "latitude": ref_lat,
            "longitude": ref_lon,
        },
        attrs=sst_ds.attrs
    )

    # Strict Validation: Dimensions
    expected_surface_sizes = {
        "time": EXPECTED_TIME_STEPS,
        "latitude": EXPECTED_LAT_POINTS,
        "longitude": EXPECTED_LON_POINTS
    }
    actual_surface_sizes = dict(surface_ds.sizes)
    if actual_surface_sizes != expected_surface_sizes:
        raise ValueError(
            f"Surface Dataset dimension mismatch! Expected {expected_surface_sizes}, got {actual_surface_sizes}"
        )

    # Strict Validation: Variable list
    if sorted(list(surface_ds.data_vars)) != sorted(SURFACE_VARS):
        raise ValueError(
            f"Surface variable mismatch! Expected {sorted(SURFACE_VARS)}, got {sorted(list(surface_ds.data_vars))}"
        )

    # Strict Validation: All dtypes float32
    for var in SURFACE_VARS:
        if surface_ds[var].dtype != np.float32:
            raise TypeError(f"Variable {var} dtype is {surface_ds[var].dtype}, expected float32")

    # -------------------------------------------------------------------------
    # 4. Process & Validate Target GLORYS Dataset
    # -------------------------------------------------------------------------
    logger.info("Step 4: Processing 3D Target GLORYS dataset...")
    thetao = target_ds["thetao"].astype(np.float32)

    # Keep native GLORYS depth coordinates (do NOT relabel 902.34 as 1062.44).
    logger.info("  -> Assigning native GLORYS depth coordinates (last level 902.34 m)...")
    thetao = thetao.assign_coords(depth=CANONICAL_GLORYS_DEPTHS)
    thetao.depth.attrs.update({
        "units": "m",
        "standard_name": "depth",
        "axis": "Z",
        "long_name": "Depth",
        "positive": "down"
    })

    target_out_ds = xr.Dataset(
        data_vars={
            "thetao": thetao
        },
        attrs=target_ds.attrs
    )

    expected_target_sizes = {
        "time": EXPECTED_TIME_STEPS,
        "depth": EXPECTED_DEPTH_LEVELS,
        "latitude": EXPECTED_LAT_POINTS,
        "longitude": EXPECTED_LON_POINTS
    }
    actual_target_sizes = dict(target_out_ds.sizes)
    if actual_target_sizes != expected_target_sizes:
        raise ValueError(
            f"Target Dataset dimension mismatch! Expected {expected_target_sizes}, got {actual_target_sizes}"
        )

    if target_out_ds["thetao"].dtype != np.float32:
        raise TypeError(f"Target thetao dtype is {target_out_ds['thetao'].dtype}, expected float32")

    if not np.allclose(target_out_ds.depth.values, CANONICAL_GLORYS_DEPTHS):
        raise ValueError("Depth coordinates do not match canonical GLORYS depths!")

    # -------------------------------------------------------------------------
    # 5. Write Consolidated Zarr V2 Stores
    # -------------------------------------------------------------------------
    surface_chunks = {"time": 30, "latitude": 101, "longitude": 241}
    target_chunks = {"time": 30, "depth": 15, "latitude": 101, "longitude": 241}

    surface_out_path = output_dir / "surface_features.zarr"
    target_out_path = output_dir / "target_glorys.zarr"

    # Clean old stores if present (e.g. 5-day backup already made)
    if surface_out_path.exists():
        logger.info(f"Removing old {surface_out_path}...")
        shutil.rmtree(surface_out_path)

    if target_out_path.exists():
        logger.info(f"Removing old {target_out_path}...")
        shutil.rmtree(target_out_path)

    # Chunk and clean encoding
    logger.info("Step 5a: Writing surface_features.zarr (Zarr V2, consolidated)...")
    surface_ds = clean_encoding(surface_ds, surface_chunks)
    surface_ds = surface_ds.chunk(surface_chunks)
    t_surf_0 = time.time()
    surface_ds.to_zarr(surface_out_path, mode="w", zarr_format=2, consolidated=True)
    logger.info(f"Successfully written surface_features.zarr in {time.time() - t_surf_0:.1f}s")

    logger.info("Step 5b: Writing target_glorys.zarr (Zarr V2, consolidated)...")
    target_out_ds = clean_encoding(target_out_ds, target_chunks)
    target_out_ds = target_out_ds.chunk(target_chunks)
    t_targ_0 = time.time()
    target_out_ds.to_zarr(target_out_path, mode="w", zarr_format=2, consolidated=True)
    logger.info(f"Successfully written target_glorys.zarr in {time.time() - t_targ_0:.1f}s")

    # -------------------------------------------------------------------------
    # 6. Verification & Logging
    # -------------------------------------------------------------------------
    logger.info("=" * 75)
    logger.info("CONSOLIDATION VERIFICATION & LOGGING")
    logger.info("=" * 75)

    # Reopen to verify
    sf_verify = xr.open_zarr(surface_out_path)
    tg_verify = xr.open_zarr(target_out_path)

    logger.info(f"surface_features.zarr shape: {dict(sf_verify.sizes)}")
    logger.info(f"target_glorys.zarr shape:   {dict(tg_verify.sizes)}")

    surf_size = get_dir_size_bytes(surface_out_path)
    targ_size = get_dir_size_bytes(target_out_path)
    total_size = surf_size + targ_size
    logger.info(f"Disk size surface_features.zarr: {surf_size:,} bytes ({surf_size / 1e9:.3f} GB)")
    logger.info(f"Disk size target_glorys.zarr:   {targ_size:,} bytes ({targ_size / 1e9:.3f} GB)")
    logger.info(f"Total disk size:                 {total_size:,} bytes ({total_size / 1e9:.3f} GB)")

    logger.info("\nPer-Variable Summary:")
    for v in SURFACE_VARS:
        da = sf_verify[v]
        # Quick sample-based or chunk-based NaN fraction
        sample_slice = da.isel(time=0).values
        nan_frac = float(np.isnan(sample_slice).mean())
        logger.info(f"  {v:14s} | dtype: {str(da.dtype):8s} | sample NaN: {nan_frac*100:.2f}% | dims: {da.dims}")

    tg_da = tg_verify["thetao"]
    sample_tgt = tg_da.isel(time=0).values
    nan_tgt = float(np.isnan(sample_tgt).mean())
    logger.info(f"  {'thetao':14s} | dtype: {str(tg_da.dtype):8s} | sample NaN: {nan_tgt*100:.2f}% | dims: {tg_da.dims}")

    total_wall_time = time.time() - start_time
    logger.info(f"\nConsolidation complete in {total_wall_time:.1f}s ({total_wall_time/60:.2f} mins).")
    return total_wall_time


if __name__ == "__main__":
    project_root = Path(__file__).resolve().parents[2]
    in_dir = project_root / "friend_check"
    out_dir = project_root / "data" / "processed"
    consolidate_data(in_dir, out_dir)
