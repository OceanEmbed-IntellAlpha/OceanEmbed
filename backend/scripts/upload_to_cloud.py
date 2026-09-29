"""
OceanEmbed Cloud Upload Script.

Uploads processed datasets, 3D assets, and model checkpoints to Cloudflare R2,
and automatically registers their metadata in Supabase (dataset_catalog).

Usage:
    python -m backend.scripts.upload_to_cloud --all
    python -m backend.scripts.upload_to_cloud --stats
    python -m backend.scripts.upload_to_cloud --models
    python -m backend.scripts.upload_to_cloud --climatology
    python -m backend.scripts.upload_to_cloud --surface
    python -m backend.scripts.upload_to_cloud --assets
"""
from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path

# Add project root to sys.path
ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.config import settings
from backend.storage.r2 import (
    is_r2_configured,
    upload_file_to_r2,
    upload_zarr_to_r2,
    get_public_url,
)
from backend.storage.catalog import is_supabase_configured, register_dataset

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("upload_to_cloud")


def check_prerequisites():
    if not is_r2_configured():
        logger.error("Cloudflare R2 is not configured in backend/.env!")
        sys.exit(1)
    if not is_supabase_configured():
        logger.error("Supabase is not configured in backend/.env!")
        sys.exit(1)
    logger.info("Credentials check passed: R2 Bucket = '%s', Supabase URL = '%s'", settings.r2_bucket_name, settings.supabase_url)


def upload_stats():
    """Upload normalization stats JSON to R2 and catalog it in Supabase."""
    logger.info("─── Uploading Normalization Stats ───")
    stats_file = ROOT / "data" / "processed" / "normalization_stats_v3.json"
    if not stats_file.exists():
        logger.warning("Stats file not found at %s", stats_file)
        return

    r2_key = "metadata/normalization_stats_v3.json"
    s3_url = upload_file_to_r2(stats_file, r2_key, content_type="application/json")
    public_url = get_public_url(r2_key)

    record = {
        "dataset_name": "normalization_stats_v3",
        "dataset_type": "json_metadata",
        "r2_key": r2_key,
        "r2_url": s3_url,
        "public_url": public_url,
        "size_bytes": stats_file.stat().st_size,
    }
    try:
        register_dataset(record)
        logger.info("Successfully registered normalization_stats_v3 in Supabase!")
    except Exception as e:
        logger.warning("Could not register in Supabase (did you run the SQL migration?): %s", e)


def upload_models():
    """Upload model weights to R2 and catalog in Supabase."""
    logger.info("─── Uploading Model Checkpoints ───")
    model_file = ROOT / "runs" / "_final_v2" / "model_v2.pt"
    if not model_file.exists():
        logger.warning("Model file not found at %s", model_file)
        return

    r2_key = "models/model_v2.pt"
    s3_url = upload_file_to_r2(model_file, r2_key, content_type="application/octet-stream")

    record = {
        "dataset_name": "oceanembed_v2_weights",
        "dataset_type": "pytorch_checkpoint",
        "r2_key": r2_key,
        "r2_url": s3_url,
        "size_bytes": model_file.stat().st_size,
    }
    try:
        register_dataset(record)
        logger.info("Successfully registered model_v2 in Supabase!")
    except Exception as e:
        logger.warning("Could not register in Supabase: %s", e)


def upload_3d_assets():
    """Upload 3D GLB assets for digital twin visualization."""
    logger.info("─── Uploading 3D Digital Twin Assets (.glb) ───")
    glb_files = list(ROOT.glob("frontend/**/argo_float.glb")) + list(ROOT.glob("frontend/**/glider3.glb"))
    unique_paths = set(p.resolve() for p in glb_files)

    for glb_path in unique_paths:
        r2_key = f"assets/{glb_path.name}"
        s3_url = upload_file_to_r2(glb_path, r2_key, content_type="model/gltf-binary")
        pub_url = get_public_url(r2_key)
        logger.info("Uploaded %s -> S3: %s | CDN: %s", glb_path.name, s3_url, pub_url)

        record = {
            "dataset_name": f"asset_3d_{glb_path.stem}",
            "dataset_type": "3d_asset",
            "r2_key": r2_key,
            "r2_url": s3_url,
            "public_url": pub_url,
            "size_bytes": glb_path.stat().st_size,
        }
        try:
            register_dataset(record)
        except Exception as e:
            logger.warning("Could not register %s in Supabase: %s", glb_path.name, e)


def upload_climatology():
    """Upload climatology Zarr (~169 MB)."""
    logger.info("─── Uploading Climatology Zarr Store (~169 MB) ───")
    clim_path = ROOT / "data" / "processed" / "climatology_2010_2020.zarr"
    if not clim_path.exists():
        logger.warning("Climatology zarr not found at %s", clim_path)
        return

    r2_key = "zarr/climatology_2010_2020.zarr"
    s3_url = upload_zarr_to_r2(clim_path, "zarr/climatology_2010_2020")

    record = {
        "dataset_name": "climatology_2010_2020",
        "dataset_type": "zarr",
        "r2_key": r2_key,
        "r2_url": s3_url,
        "lat_min": 5.0,
        "lat_max": 30.0,
        "lon_min": 45.0,
        "lon_max": 105.0,
        "variables": ["climatology"],
    }
    try:
        register_dataset(record)
        logger.info("Successfully registered climatology in Supabase!")
    except Exception as e:
        logger.warning("Could not register in Supabase: %s", e)


def upload_surface():
    """Upload surface_features.zarr (~1.79 GB)."""
    logger.info("─── Uploading Surface Features Zarr Store (~1.79 GB) ───")
    surface_path = ROOT / "data" / "processed" / "surface_features.zarr"
    if not surface_path.exists():
        logger.warning("Surface features zarr not found at %s", surface_path)
        return

    r2_key = "zarr/surface_features.zarr"
    s3_url = upload_zarr_to_r2(surface_path, "zarr/surface_features")

    record = {
        "dataset_name": "surface_features",
        "dataset_type": "zarr",
        "r2_key": r2_key,
        "r2_url": s3_url,
        "start_date": "2010-01-01",
        "end_date": "2023-12-31",
        "lat_min": 5.0,
        "lat_max": 30.0,
        "lon_min": 45.0,
        "lon_max": 105.0,
        "variables": ["analysed_sst", "sos", "sla", "u", "v", "uwnd", "vwnd"],
    }
    try:
        register_dataset(record)
        logger.info("Successfully registered surface_features in Supabase!")
    except Exception as e:
        logger.warning("Could not register in Supabase: %s", e)


def main():
    parser = argparse.ArgumentParser(description="Upload OceanEmbed data to Cloudflare R2 & Supabase")
    parser.add_argument("--all", action="store_true", help="Upload everything")
    parser.add_argument("--stats", action="store_true", help="Upload normalization stats")
    parser.add_argument("--models", action="store_true", help="Upload model weights")
    parser.add_argument("--assets", action="store_true", help="Upload 3D GLB assets")
    parser.add_argument("--climatology", action="store_true", help="Upload climatology Zarr (~169 MB)")
    parser.add_argument("--surface", action="store_true", help="Upload surface features Zarr (~1.79 GB)")

    args = parser.parse_args()

    check_prerequisites()

    if not any([args.all, args.stats, args.models, args.assets, args.climatology, args.surface]):
        logger.info("No specific flag provided. Run with --help to see options.")
        logger.info("Example: python -m backend.scripts.upload_to_cloud --stats --assets")
        return

    if args.all or args.stats:
        upload_stats()
    if args.all or args.assets:
        upload_3d_assets()
    if args.all or args.models:
        upload_models()
    if args.all or args.climatology:
        upload_climatology()
    if args.all or args.surface:
        upload_surface()

    logger.info("Upload operations completed!")


if __name__ == "__main__":
    main()
