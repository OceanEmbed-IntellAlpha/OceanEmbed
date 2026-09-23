"""
Dataset metadata schemas.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class DatasetCard(BaseModel):
    id: str
    name: str
    variable: str
    resolution: str
    temporal: str
    role: str = Field(..., description="'input' | 'training_target' | 'validation'")
    format: str = "Zarr"
    source: str
    path: Optional[str] = None
    doi: Optional[str] = None
    url: Optional[str] = None


class DatasetsResponse(BaseModel):
    datasets: List[DatasetCard]
