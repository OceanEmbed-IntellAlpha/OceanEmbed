"""
Cloudflare R2 Storage utilities for Zarr datasets.

Provides functions to upload Zarr datasets to R2 and configure
xarray to read Zarr from R2 using S3-compatible API.
"""
from __future__ import annotations

import logging
import shutil
from pathlib import Path
from typing import Optional

import boto3
from botocore.exceptions import ClientError

from config import settings

logger = logging.getLogger(__name__)


def get_r2_client():
    """Create and return a configured boto3 S3 client for Cloudflare R2."""
    if not settings.r2_endpoint_url or not settings.r2_access_key_id:
        raise ValueError("R2 credentials not configured. Set R2_ENDPOINT_URL and R2_ACCESS_KEY_ID in .env")

    return boto3.client(
        "s3",
        endpoint_url=settings.r2_endpoint_url,
        aws_access_key_id=settings.r2_access_key_id,
        aws_secret_access_key=settings.r2_secret_access_key,
        region_name="auto",
    )


def upload_zarr_to_r2(local_zarr_path: Path, zarr_name: str) -> str:
    """
    Upload a local Zarr directory to Cloudflare R2.

    Args:
        local_zarr_path: Path to local Zarr directory
        zarr_name: Name for the Zarr dataset in R2 (will be stored as zarr_name.zarr/)

    Returns:
        R2 URL path for the uploaded Zarr dataset
    """
    if not settings.r2_bucket_name:
        raise ValueError("R2_BUCKET_NAME not configured in .env")

    client = get_r2_client()
    bucket = settings.r2_bucket_name
    r2_prefix = f"{zarr_name}.zarr/"

    logger.info("Uploading Zarr from %s to R2 bucket %s/%s", local_zarr_path, bucket, r2_prefix)

    # Upload all files in the Zarr directory
    total_files = 0
    for file_path in local_zarr_path.rglob("*"):
        if file_path.is_file():
            # Calculate relative path from zarr root
            relative_path = file_path.relative_to(local_zarr_path)
            s3_key = r2_prefix + str(relative_path).replace("\\", "/")

            try:
                client.upload_file(str(file_path), bucket, s3_key)
                total_files += 1
                if total_files % 10 == 0:
                    logger.info("Uploaded %d files...", total_files)
            except ClientError as e:
                logger.error("Failed to upload %s: %s", s3_key, e)
                raise

    logger.info("Successfully uploaded %d files to R2", total_files)

    # Construct R2 URL for xarray
    r2_url = f"s3://{bucket}/{r2_prefix}"
    return r2_url


def get_r2_storage_options() -> dict:
    """
    Return storage options for xarray to read Zarr from R2.

    Returns:
        Dictionary with fsspec storage options for S3-compatible backend
    """
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
    if local_zarr_path.exists():
        logger.info("Cleaning up local Zarr directory: %s", local_zarr_path)
        shutil.rmtree(local_zarr_path)
    else:
        logger.warning("Local Zarr directory does not exist: %s", local_zarr_path)


def is_r2_configured() -> bool:
    """Check if R2 credentials are properly configured."""
    return bool(
        settings.r2_account_id
        and settings.r2_access_key_id
        and settings.r2_secret_access_key
        and settings.r2_bucket_name
        and settings.r2_endpoint_url
    )
