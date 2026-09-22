"""
Profile request and response schemas.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ProfileQuery(BaseModel):
    lat: float
    lon: float
    date: str


class NearestGridPoint(BaseModel):
    lat: float
    lon: float
    date_used: str
    lat_idx: int
    lon_idx: int


class DepthProfilePoint(BaseModel):
    depth_m: float = Field(..., description="Depth in metres")
    temperature_c: float = Field(..., description="Reconstructed total temperature in °C")
    climatology_c: float = Field(..., description="Baseline climatology temperature in °C")
    anomaly_c: float = Field(..., description="Model-predicted anomaly in °C")
    confidence_c: Optional[float] = Field(None, description="Expected 1-sigma error bound in °C")


class ProfileRequest(BaseModel):
    lat: float = Field(..., ge=5.0, le=30.0, description="Latitude (5.0°N to 30.0°N)")
    lon: float = Field(..., ge=45.0, le=105.0, description="Longitude (45.0°E to 105.0°E)")
    date: str = Field(..., description="Date in YYYY-MM-DD format")
    depths: Optional[List[float]] = Field(None, description="Custom depths to query in metres")


class ProfileResponse(BaseModel):
    query: ProfileQuery
    nearest_grid_point: NearestGridPoint
    profile: List[DepthProfilePoint]


# Schema matching frontend/lib/api/types.ts SubsurfaceProfile for /api/predict
class FrontendSubsurfaceProfile(BaseModel):
    lat: float
    lon: float
    date: str
    depths: List[float]
    temperature: List[float]
    confidence: Optional[List[float]] = None
    source: str = "model"
