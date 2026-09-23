"""
Regional summary request and response schemas.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class RegionsRequest(BaseModel):
    date: str = Field(..., description="Date in YYYY-MM-DD format")
    depth_m: float = Field(100.0, ge=0.0, le=1000.0, description="Target depth in metres")
    regions: Optional[List[str]] = Field(
        None,
        description="List of regions: 'arabian_sea', 'bay_of_bengal', 'open_ocean'. Defaults to all."
    )


class RegionStats(BaseModel):
    region_id: str
    region_name: str
    mean_temperature_c: float
    mean_anomaly_c: float
    mean_climatology_c: float
    rmse_vs_climatology_c: float
    lat_bounds: List[float]
    lon_bounds: List[float]
    n_ocean_points: int


class RegionsResponse(BaseModel):
    date: str
    depth_m: float
    regions: List[RegionStats]
