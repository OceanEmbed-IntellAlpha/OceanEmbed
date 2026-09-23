"""
Timeseries request and response schemas.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class TimeseriesRequest(BaseModel):
    lat: float = Field(..., ge=5.0, le=30.0, description="Latitude (5.0°N to 30.0°N)")
    lon: float = Field(..., ge=45.0, le=105.0, description="Longitude (45.0°E to 105.0°E)")
    depth_m: float = Field(..., ge=0.0, le=1000.0, description="Depth level in metres")
    date_start: str = Field(..., description="Start date YYYY-MM-DD")
    date_end: str = Field(..., description="End date YYYY-MM-DD")


class TimeseriesResponse(BaseModel):
    lat: float
    lon: float
    depth_m: float
    dates: List[str]
    temperature_c: List[float]
    climatology_c: List[float]
    anomaly_c: List[float]
