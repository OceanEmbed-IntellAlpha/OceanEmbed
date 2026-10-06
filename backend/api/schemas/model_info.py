"""
Model metadata and date availability schemas.
"""

from __future__ import annotations

from typing import Any, Dict, List
from pydantic import BaseModel, Field


class DomainInfo(BaseModel):
    lat_min: float = Field(5.0, description="Minimum latitude")
    lat_max: float = Field(30.0, description="Maximum latitude")
    lon_min: float = Field(45.0, description="Minimum longitude")
    lon_max: float = Field(105.0, description="Maximum longitude")
    resolution_deg: float = Field(0.25, description="Spatial resolution in degrees")
    n_lat: int = Field(101, description="Number of latitude grid points")
    n_lon: int = Field(241, description="Number of longitude grid points")


class ModelInfoResponse(BaseModel):
    model_name: str = Field("OceanEmbed v2", description="Name of the model")
    architecture: str = Field("U-Net (BaselineModel)", description="Underlying neural network architecture")
    training_data: str = Field("GLORYS12V1 2010-2020 (anomaly formulation)", description="Training split source")
    test_data: str = Field("GLORYS 2022", description="Test split source")
    test_rmse_celsius: float = Field(0.8072, description="Headline test RMSE in °C (ocean-masked)")
    test_rmse_ocean_masked_celsius: float = Field(0.8072, description="Ocean-masked test RMSE in °C (headline)")
    test_rmse_full_grid_celsius: float = Field(0.5246, description="Full-grid test RMSE in °C (legacy footnote)")
    climatology_rmse_celsius: float = Field(0.9893, description="Climatology reference RMSE in °C (ocean-masked)")
    climatology_rmse_full_grid_celsius: float = Field(0.6429, description="Climatology reference RMSE in °C (full-grid)")
    improvement_vs_climatology_pct: float = Field(18.4, description="Skill improvement over Climatology in %")
    domain: DomainInfo = Field(..., description="Spatial domain boundaries and resolution")
    depths_m: List[float] = Field(..., description="List of standard depth levels in metres")
    input_variables: List[str] = Field(..., description="List of input surface variable names")
    ablation_findings: str = Field("SLA is the dominant variable (87.5% of skill)", description="Key physical insight")


class DatesAvailableResponse(BaseModel):
    date_min: str = Field(..., description="Earliest date available in ISO format YYYY-MM-DD")
    date_max: str = Field(..., description="Latest date available in ISO format YYYY-MM-DD")
    n_days: int = Field(..., description="Total number of daily records available")
