"""Test streaming directly from Supabase and Cloudflare R2."""
from __future__ import annotations
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import s3fs
import xarray as xr
from backend.storage.catalog import list_datasets
from backend.storage.r2 import get_s3fs

def main():
    print("=== 1. Checking Datasets Registered in Supabase ===")
    datasets = list_datasets()
    for d in datasets:
        print(f"  • {d['dataset_name']} ({d['dataset_type']}) -> {d['r2_url']}")

    print("\n=== 2. Testing Direct Cloud Stream from Cloudflare R2 via s3fs ===")
    fs = get_s3fs()
    mapper = s3fs.S3Map(root="oceanembed/zarr/surface_features.zarr", s3=fs, check=False)
    ds = xr.open_zarr(mapper, consolidated=True)
    
    print("Successfully connected to Cloudflare R2!")
    print("  Variables in Cloud Zarr:", list(ds.data_vars.keys()))
    print("  Time steps available:", len(ds.time))
    print("  Lat range:", float(ds.latitude.min()), "to", float(ds.latitude.max()))
    print("  Lon range:", float(ds.longitude.min()), "to", float(ds.longitude.max()))

    # Read a single spatial point from the cloud store
    sample_sst = float(ds["analysed_sst"].isel(time=0, latitude=50, longitude=50).values)
    print(f"  Sample SST streamed from R2 at index (time=0, lat=50, lon=50): {sample_sst:.2f} K ({sample_sst - 273.15:.2f} °C)")
    print("\nCLOUD STREAMING FROM R2 + SUPABASE CATALOG IS FULLY VERIFIED!")

if __name__ == "__main__":
    main()
