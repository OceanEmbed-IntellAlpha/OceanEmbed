"""
Research Lab experiment and ablation schemas.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ExperimentEntry(BaseModel):
    id: str
    name: str
    architecture: str
    formulation: str
    test_rmse: float
    test_r2: Optional[float] = None
    delta_vs_clim: Optional[float] = None
    verdict: str


class VariableAblationEntry(BaseModel):
    variant_id: str
    name: str
    n_variables: int
    variables: List[str]
    test_rmse: float
    test_mae: float
    test_r2: float
    ml_rmse: float
    thermocline_rmse: float
    deep_rmse: float


class ExperimentsResponse(BaseModel):
    experiments: List[ExperimentEntry]
    variable_ablation: List[VariableAblationEntry]
    key_findings: List[str]
