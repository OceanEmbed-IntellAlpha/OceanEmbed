"""
Supabase Metadata Catalog client for OceanEmbed.

Provides operations for:
- Registering / querying dataset catalogs (Zarr stores, NetCDF files, checkpoints)
- Registering / querying Argo float profile metadata
- Health check and connection verification
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional
from supabase import create_client, Client

try:
    from backend.config import settings
except ImportError:
    from config import settings

logger = logging.getLogger(__name__)

_supabase_client: Optional[Client] = None


def is_supabase_configured() -> bool:
    """Check if Supabase credentials are provided."""
    return bool(settings.supabase_url and settings.supabase_key)


def get_supabase() -> Client:
    """Return configured Supabase Client singleton."""
    global _supabase_client
    if not is_supabase_configured():
        raise ValueError("Supabase credentials not configured. Check SUPABASE_URL and SUPABASE_KEY in backend/.env")

    if _supabase_client is None:
        _supabase_client = create_client(settings.supabase_url, settings.supabase_key)
    return _supabase_client


# ── Dataset Catalog Operations ───────────────────────────────────────────────

def register_dataset(record: Dict[str, Any]) -> Dict[str, Any]:
    """
    Insert or update a dataset catalog record in Supabase.
    
    Required keys in record:
      dataset_name, dataset_type, r2_key, r2_url
    Optional keys:
      public_url, size_bytes, start_date, end_date, lat_min, lat_max, lon_min, lon_max, variables
    """
    sb = get_supabase()
    res = sb.table("dataset_catalog").upsert(record, on_conflict="dataset_name").execute()
    return res.data[0] if res.data else {}


def get_dataset(dataset_name: str) -> Optional[Dict[str, Any]]:
    """Retrieve metadata and R2 URL for a specific dataset."""
    sb = get_supabase()
    res = sb.table("dataset_catalog").select("*").eq("dataset_name", dataset_name).execute()
    return res.data[0] if res.data else None


def list_datasets() -> List[Dict[str, Any]]:
    """List all registered datasets in the catalog."""
    sb = get_supabase()
    res = sb.table("dataset_catalog").select("*").order("created_at", desc=True).execute()
    return res.data or []


# ── Argo Profiles Operations ─────────────────────────────────────────────────

def register_argo_profile(profile: Dict[str, Any]) -> Dict[str, Any]:
    """Insert an Argo profile metadata row into Supabase."""
    sb = get_supabase()
    res = sb.table("argo_profiles").insert(profile).execute()
    return res.data[0] if res.data else {}


def batch_register_argo_profiles(profiles: List[Dict[str, Any]], batch_size: int = 500) -> int:
    """Batch insert Argo profiles metadata."""
    sb = get_supabase()
    inserted = 0
    for i in range(0, len(profiles), batch_size):
        chunk = profiles[i : i + batch_size]
        sb.table("argo_profiles").insert(chunk).execute()
        inserted += len(chunk)
    return inserted


def find_nearby_argo_profiles(
    lat: float,
    lon: float,
    radius_deg: float = 1.0,
    date_start: Optional[str] = None,
    date_end: Optional[str] = None,
    limit: int = 50,
) -> List[Dict[str, Any]]:
    """Query Argo profiles within a bounding box."""
    sb = get_supabase()
    query = (
        sb.table("argo_profiles")
        .select("*")
        .gte("latitude", lat - radius_deg)
        .lte("latitude", lat + radius_deg)
        .gte("longitude", lon - radius_deg)
        .lte("longitude", lon + radius_deg)
    )
    if date_start:
        query = query.gte("profile_date", date_start)
    if date_end:
        query = query.lte("profile_date", date_end)

    res = query.limit(limit).execute()
    return res.data or []
