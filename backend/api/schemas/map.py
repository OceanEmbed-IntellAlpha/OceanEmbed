"""
Map and surface field request and response schemas.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple, Union
from pydantic import BaseModel, Field
from backend.api.schemas.common import BoundingBox, GridStats


class MapRequest(BaseModel):
    date: str = Field(..., description="Date in YYYY-MM-DD format")
    depth_m: float = Field(0.0, ge=0.0, le=1000.0, description="Target depth in metres")
    variable: Optional[str] = Field(None, description="Optional variable filter (e.g. 'thermal_anomaly', 'temperature')")
    bbox: Optional[BoundingBox] = Field(None, description="Optional bounding box sub-selection")


class MapResponse(BaseModel):
    date: str
    depth_m: float
    lat: List[float]
    lon: List[float]
    temperature_c: Optional[List[List[Optional[float]]]] = Field(None, description="2D temperature grid [H][W]")
    climatology_c: Optional[List[List[Optional[float]]]] = Field(None, description="2D climatology grid [H][W]")
    anomaly_c: Optional[List[List[Optional[float]]]] = Field(None, description="2D anomaly grid [H][W]")
    stats: GridStats
    format: str = Field("json", description="'json' or 'base64'")
    # Base64 encoded float32 binary arrays if ?format=base64 requested
    temperature_b64: Optional[str] = None
    climatology_b64: Optional[str] = None
    anomaly_b64: Optional[str] = None
    shape: Optional[List[int]] = None


# Schema matching frontend/lib/api/types.ts SurfaceField for /api/field
class FrontendSurfaceField(BaseModel):
    variable: str = Field(..., description="'sst', 'sss', 'ssh', 'currents', 'winds', 'subsurface_temp', 'thermal_anomaly', 'embedding'")
    date: str
    bbox: Tuple[float, float, float, float] = Field(..., description="[lonMin, latMin, lonMax, latMax]")
    lat: List[float]
    lon: List[float]
    grid: List[List[Optional[float]]]
    values: Optional[List[List[Optional[float]]]] = None
    unit: str
    colorRange: Tuple[float, float]
    vmin: Optional[float] = None
    vmax: Optional[float] = None
    depth_m: Optional[float] = None
    u: Optional[List[List[Optional[float]]]] = None
    v: Optional[List[List[Optional[float]]]] = None
