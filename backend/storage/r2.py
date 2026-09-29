"""
Cloudflare R2 Storage utilities for OceanEmbed datasets and models.

Provides functions to:
- Upload Zarr datasets to R2 using multi-threaded uploads
- Upload single files (.pt model checkpoints, .glb 3D digital twin assets, .json stats)
- Provide s3fs filesystem for xarray streaming directly from R2
- Generate public / presigned download URLs
"""
from __future__ import annotations

import logging
import mimetypes
import shutil
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Dict, Optional

import boto3
from botocore.exceptions import ClientError
import s3fs

try:
    from backend.config import settings
except ImportError:
    from config import settings

logger = logging.getLogger(__name__)


def is_r2_configured() -> bool:
    """Check if R2 credentials are properly configured."""
    return bool(
        settings.r2_access_key_id
        and settings.r2_secret_access_key
        and settings.r2_bucket_name
        and settings.r2_endpoint_url
    )


def get_r2_client():
    """Create and return a configured boto3 S3 client for Cloudflare R2."""
    if not is_r2_configured():
        raise ValueError("R2 credentials not configured. Check R2_* in backend/.env")

    return boto3.client(
        "s3",
        endpoint_url=settings.r2_endpoint_url,
        aws_access_key_id=settings.r2_access_key_id,
        aws_secret_access_key=settings.r2_secret_access_key,
        region_name="auto",
    )


def get_s3fs() -> s3fs.S3FileSystem:
    """Return an s3fs filesystem configured for Cloudflare R2 for xarray with pooled connections."""
    if not is_r2_configured():
        raise ValueError("R2 credentials not configured for s3fs.")

    return s3fs.S3FileSystem(
        key=settings.r2_access_key_id,
        secret=settings.r2_secret_access_key,
        client_kwargs={
            "endpoint_url": settings.r2_endpoint_url,
        },
        config_kwargs={
            "max_pool_connections": 32,
        },
    )


def get_public_url(r2_key: str) -> Optional[str]:
    """Return public R2.dev / CDN URL for an asset if configured."""
    if not settings.r2_public_url:
        return None
    base = settings.r2_public_url.rstrip("/")
    key = r2_key.lstrip("/")
    return f"{base}/{key}"


def get_presigned_url(r2_key: str, expiration_seconds: int = 3600) -> str:
    """Generate a presigned GET URL for temporary secure access to an R2 object."""
    client = get_r2_client()
    return client.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.r2_bucket_name, "Key": r2_key},
        ExpiresIn=expiration_seconds,
    )


def upload_file_to_r2(local_file_path: Path | str, r2_key: str, content_type: Optional[str] = None) -> str:
    """
    Upload a single file to Cloudflare R2.
    
    Args:
        local_file_path: Path to the local file
        r2_key: Target object key in bucket (e.g. 'models/model_v2.pt' or 'assets/argo_float.glb')
        content_type: Optional MIME content type
    
    Returns:
        S3 URI string (e.g. 's3://oceanembed/models/model_v2.pt')
    """
    path = Path(local_file_path)
    if not path.is_file():
        raise FileNotFoundError(f"File not found: {path}")

    client = get_r2_client()
    bucket = settings.r2_bucket_name

    extra_args: Dict[str, str] = {}
    if content_type:
        extra_args["ContentType"] = content_type
    else:
        guessed_type, _ = mimetypes.guess_type(str(path))
        if guessed_type:
            extra_args["ContentType"] = guessed_type

    logger.info("Uploading %s -> s3://%s/%s", path.name, bucket, r2_key)
    client.upload_file(str(path), bucket, r2_key, ExtraArgs=extra_args if extra_args else None)

    return f"s3://{bucket}/{r2_key}"


def upload_zarr_to_r2(
    local_zarr_path: Path | str,
    zarr_name: str,
    max_workers: int = 16,
) -> str:
    """
    Upload a local Zarr directory store to Cloudflare R2 using concurrent threads.
    
    Args:
        local_zarr_path: Path to local .zarr directory
        zarr_name: Target prefix or name (e.g. 'zarr/surface_features' or 'surface_features')
        max_workers: Number of concurrent upload threads (default: 16)
        
    Returns:
        S3 URI path (e.g. 's3://oceanembed/zarr/surface_features.zarr/')
    """
    path = Path(local_zarr_path)
    if not path.exists():
        raise FileNotFoundError(f"Zarr store not found: {path}")

    # Ensure clean prefix naming ending in .zarr/
    clean_name = zarr_name.strip("/")
    if not clean_name.endswith(".zarr"):
        clean_name = f"{clean_name}.zarr"
    r2_prefix = f"{clean_name}/"

    client = get_r2_client()
    bucket = settings.r2_bucket_name

    all_files = [f for f in path.rglob("*") if f.is_file()]
    total_files = len(all_files)
    logger.info("Starting multi-threaded upload of %d files from %s to s3://%s/%s", total_files, path, bucket, r2_prefix)

    def _upload_one(f: Path):
        rel = f.relative_to(path)
        s3_key = r2_prefix + str(rel).replace("\\", "/")
        extra = {}
        if f.suffix in [".json", ".zattrs", ".zgroup", ".zarray"]:
            extra["ContentType"] = "application/json"
        client.upload_file(str(f), bucket, s3_key, ExtraArgs=extra if extra else None)
        return s3_key

    completed = 0
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {executor.submit(_upload_one, f): f for f in all_files}
        for future in as_completed(futures):
            future.result()
            completed += 1
            if completed % 50 == 0 or completed == total_files:
                logger.info("Uploaded %d/%d files (%.1f%%)", completed, total_files, (completed / total_files) * 100)

    s3_uri = f"s3://{bucket}/{r2_prefix}"
    logger.info("Successfully uploaded Zarr store: %s", s3_uri)
    return s3_uri


def get_r2_storage_options() -> dict:
    """Return storage options for xarray/fsspec to read Zarr from R2."""
    return {
        "storage_options": {
            "key": settings.r2_access_key_id,
            "secret": settings.r2_secret_access_key,
            "client_kwargs": {
                "endpoint_url": settings.r2_endpoint_url,
            },
        },
    }


def cleanup_local_zarr(local_zarr_path: Path) -> None:
    """Remove local Zarr directory after successful upload to R2."""
    path = Path(local_zarr_path)
    if path.exists():
        logger.info("Cleaning up local Zarr directory: %s", path)
        shutil.rmtree(path)
    else:
        logger.warning("Local Zarr directory does not exist: %s", path)
