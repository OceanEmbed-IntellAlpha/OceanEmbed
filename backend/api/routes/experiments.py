"""
Research Lab experiments and ablation studies router.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List
from fastapi import APIRouter

from backend.api.schemas.experiments import (
    ExperimentEntry,
    ExperimentsResponse,
    VariableAblationEntry,
)

router = APIRouter(prefix="/api/v1", tags=["Research Lab"])

ROOT = Path(__file__).resolve().parents[3]


@router.get(
    "/experiments",
    response_model=ExperimentsResponse,
    summary="Get Research Lab experiment history and variable ablations",
    description="Returns benchmarked model architectures, loss ablations, and input channel variable ablations for the Research Lab dashboard.",
)
async def get_experiments() -> ExperimentsResponse:
    # Model iteration benchmarks
    experiments_list = [
        ExperimentEntry(
            id="v0",
            name="Absolute temperature baseline",
            architecture="ResNet + Fourier Depth Decoder",
            formulation="Absolute temperature (Direct)",
            test_rmse=5.0800,
            test_r2=0.8200,
            delta_vs_clim=4.4371,
            verdict="REJECTED (Dominated by seasonal cycle)",
        ),
        ExperimentEntry(
            id="v1",
            name="Anomaly formulation + Aux losses",
            architecture="ResNet + Fourier Depth Decoder",
            formulation="Anomaly (T - Clim) + Thermocline/Smoothness losses",
            test_rmse=0.6047,
            test_r2=0.9973,
            delta_vs_clim=-0.0382,
            verdict="REJECTED (Auxiliary losses over-regularized)",
        ),
        ExperimentEntry(
            id="phase6.1",
            name="MSE-only Loss Ablation",
            architecture="ResNet + Fourier Depth Decoder",
            formulation="Anomaly (T - Clim) + MSE-only",
            test_rmse=0.5935,
            test_r2=0.9974,
            delta_vs_clim=-0.0494,
            verdict="REJECTED (Point-wise coordinate MLP bottleneck)",
        ),
        ExperimentEntry(
            id="ridge",
            name="Ridge Regression Baseline",
            architecture="Linear Pixel-wise Model",
            formulation="Anomaly (T - Clim)",
            test_rmse=0.5856,
            test_r2=0.9975,
            delta_vs_clim=-0.0573,
            verdict="BASELINE",
        ),
        ExperimentEntry(
            id="phase5-unet",
            name="U-Net Baseline (Anomaly)",
            architecture="2D U-Net CNN (BaselineModel)",
            formulation="Anomaly (T - Clim) + MSE-only",
            test_rmse=0.5312,
            test_r2=0.9980,
            delta_vs_clim=-0.1117,
            verdict="KEPT (Superior joint-depth convolution)",
        ),
        ExperimentEntry(
            id="phase6.2-v4",
            name="OceanEmbed v2 (All-7 U-Net)",
            architecture="2D U-Net CNN (BaselineModel)",
            formulation="Anomaly (T - Clim) + MSE-only + 7 channels",
            test_rmse=0.5246,
            test_r2=0.9980,
            delta_vs_clim=-0.1183,
            verdict="SELECTED (Production v2 Model)",
        ),
        ExperimentEntry(
            id="clim",
            name="Climatology Baseline",
            architecture="Day-of-Year Lookup Table (2010–2020)",
            formulation="Empirical Historical Mean",
            test_rmse=0.6429,
            test_r2=0.9970,
            delta_vs_clim=0.0000,
            verdict="BASELINE",
        ),
    ]

    # Variable ablation results
    ablation_list = [
        VariableAblationEntry(
            variant_id="phase6_var_1",
            name="SST only",
            n_variables=1,
            variables=["analysed_sst"],
            test_rmse=0.6181,
            test_mae=0.2619,
            test_r2=0.9972,
            ml_rmse=0.4670,
            thermocline_rmse=0.9110,
            deep_rmse=0.2613,
        ),
        VariableAblationEntry(
            variant_id="phase6_var_2",
            name="SST + SLA",
            n_variables=2,
            variables=["analysed_sst", "sla"],
            test_rmse=0.5363,
            test_mae=0.2388,
            test_r2=0.9979,
            ml_rmse=0.4599,
            thermocline_rmse=0.7461,
            deep_rmse=0.2562,
        ),
        VariableAblationEntry(
            variant_id="phase6_var_3",
            name="SST + SLA + SSS",
            n_variables=3,
            variables=["analysed_sst", "sla", "sos"],
            test_rmse=0.5306,
            test_mae=0.2336,
            test_r2=0.9980,
            ml_rmse=0.4493,
            thermocline_rmse=0.7415,
            deep_rmse=0.2560,
        ),
        VariableAblationEntry(
            variant_id="phase6_var_4",
            name="All 7 Variables",
            n_variables=7,
            variables=["analysed_sst", "sos", "sla", "u", "v", "uwnd", "vwnd"],
            test_rmse=0.5246,
            test_mae=0.2331,
            test_r2=0.9980,
            ml_rmse=0.4429,
            thermocline_rmse=0.7331,
            deep_rmse=0.2565,
        ),
    ]

    findings = [
        "SLA is the dominant input variable, accounting for 87.5% of total multi-variable skill improvement.",
        "Joint 2D convolutional depth prediction (U-Net) preserves vertical hydrostatic stratification significantly better than point-wise coordinate MLPs.",
        "Anomaly formulation eliminates seasonal cycle dominance and enables deep ocean generalization.",
        "Auxiliary physics-informed losses (thermocline/smoothness) over-regularized gradients; MSE-only on anomalies achieved superior accuracy.",
    ]

    return ExperimentsResponse(
        experiments=experiments_list,
        variable_ablation=ablation_list,
        key_findings=findings,
    )
