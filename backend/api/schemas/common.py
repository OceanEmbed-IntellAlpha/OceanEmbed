"""
Pydantic schemas for the OceanEmbed REST API.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class BoundingBox(BaseModel):
    lat_min: float = Field(5.0, ge=5.0, le=30.0, description="Minimum latitude (5°N to 30°N)")
    lat_max: float = Field(30.0, ge=5.0, le=30.0, description="Maximum latitude (5°N to 30°N)")
    lon_min: float = Field(45.0, ge=45.0, le=105.0, description="Minimum longitude (45°E to 105°E)")
    lon_max: float = Field(105.0, ge=45.0, le=105.0, description="Maximum longitude (45°E to 105°E)")


class GridStats(BaseModel):
    min_c: float = Field(..., description="Minimum temperature in °C")
    max_c: float = Field(..., description="Maximum temperature in °C")
    mean_c: float = Field(..., description="Mean temperature in °C")
    std_c: Optional[float] = Field(None, description="Standard deviation in °C")


class HealthResponse(BaseModel):
    status: str = Field("healthy", description="System health status")
    model_loaded: bool = Field(True, description="Whether the ML model is initialized in memory")
    version: str = Field("v2", description="Model version identifier")
