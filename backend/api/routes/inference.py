"""
API routes for OceanEmbed reconstruction inference.

Endpoints:
  POST /profile  — Predict a vertical temperature profile at a lat/lon/date
  POST /map      — Predict a 2D temperature map at a specific depth/date
  GET  /metadata — Return model metadata and configuration
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional

from backend.ocean_embed.engine import OceanEmbedEngine

router = APIRouter()

# Singleton engine — auto-detects real vs demo mode
_engine = OceanEmbedEngine()


# ── Request / Response Schemas ────────────────────────────────────────────────

class ProfileRequest(BaseModel):
    lat: float = Field(..., ge=5.0, le=30.0, description="Latitude (5–30°N)")
    lon: float = Field(..., ge=45.0, le=105.0, description="Longitude (45–105°E)")
    date: str = Field(..., description="Date in YYYY-MM-DD format")
    depths: Optional[List[float]] = Field(
        None, description="Custom depths to query (default: 15 SIH standard depths)"
    )


class MapRequest(BaseModel):
    date: str = Field(..., description="Date in YYYY-MM-DD format")
    depth: float = Field(..., ge=0, le=1000, description="Depth in metres")


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/profile")
async def reconstruct_profile(request: ProfileRequest):
    """Predict a vertical temperature profile at a specific location and date."""
    try:
        result = _engine.predict_profile(
            lat=request.lat,
            lon=request.lon,
            date=request.date,
            depths=request.depths,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/map")
async def reconstruct_map(request: MapRequest):
    """Predict a 2D temperature map at a specific depth and date."""
    try:
        result = _engine.predict_map(
            date=request.date,
            depth=request.depth,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/metadata")
async def get_metadata():
    """Return model metadata including domain, depths, and mode."""
    return _engine.get_metadata()
