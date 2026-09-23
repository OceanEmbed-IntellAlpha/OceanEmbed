"""
Schemas for Argo observations and validation matchups.
Matches frontend/lib/api/types.ts exactly.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ArgoProfile(BaseModel):
    floatId: str
    lat: float
    lon: float
    date: str
    depths: List[float]
    temperature: List[Optional[float]]
    salinity: Optional[List[Optional[float]]] = None
    qc: List[str] = Field(..., description="'good' | 'probably_good' | 'bad'")
    source: str = "argo"


class ValidationMatchup(BaseModel):
    lat: float
    lon: float
    date: str
    depths: List[float]
    modelTemp: List[float]
    argoTemp: List[Optional[float]]
    delta: List[Optional[float]]
    rmse: float
    bias: float
    correlation: float


class DepthRmse(BaseModel):
    depth: float
    rmse: float


class RegionalValidation(BaseModel):
    region: str = Field(..., description="'north_indian_ocean' | 'bay_of_bengal' | 'arabian_sea'")
    nProfiles: int
    rmse: float
    bias: float
    correlation: float
    rmseByDepth: List[DepthRmse]


class BandRmse(BaseModel):
    mixed_layer: float
    thermocline: float
    deep: float


class SeasonalValidationEntry(BaseModel):
    season: str
    name: str
    period: str
    n_profiles: int
    rmse: float
    bias: float
    correlation: float
    rmse_by_band: BandRmse
    rmse_by_depth: List[DepthRmse]


class SeasonalValidationResponse(BaseModel):
    overall_profiles: int
    overall_rmse: Optional[float] = None
    overall_bias: Optional[float] = None
    overall_correlation: Optional[float] = None
    seasons: List[SeasonalValidationEntry]


class MonsoonValidationEntry(BaseModel):
    regime: str
    name: str
    period: str
    n_profiles: int
    rmse: float
    bias: float
    correlation: float
    rmse_by_band: BandRmse
    rmse_by_depth: List[DepthRmse]


class MonsoonValidationResponse(BaseModel):
    overall_profiles: int
    regimes: List[MonsoonValidationEntry]


class CellValidation(BaseModel):
    n_profiles: int
    rmse: float
    bias: float
    correlation: float
    rmse_by_band: Optional[BandRmse] = None


class RegionSeasonMatrixResponse(BaseModel):
    regions: List[str]
    seasons: List[str]
    matrix: Dict[str, Dict[str, CellValidation]]

