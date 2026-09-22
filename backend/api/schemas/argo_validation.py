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
    argoTemp: List[float]
    delta: List[float]
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
