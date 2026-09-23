"""
Model metadata and available date routes.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from backend.api.schemas.model_info import DatesAvailableResponse, DomainInfo, ModelInfoResponse
from backend.api.services.model_service import ModelService
from ocean_embed.grid import SIH_DEPTHS

router = APIRouter(prefix="/api/v1", tags=["Model Information"])


def get_model_service(request: Request) -> ModelService:
    return request.app.state.model_service


@router.get(
    "/model/info",
    response_model=ModelInfoResponse,
    summary="Get model metadata",
    description="Returns metadata, domain parameters, architecture, depth levels, and performance metrics for the frozen OceanEmbed v2 model.",
)
async def get_model_info(service: ModelService = Depends(get_model_service)) -> ModelInfoResponse:
    return ModelInfoResponse(
        model_name="OceanEmbed v2",
        architecture="U-Net (BaselineModel)",
        training_data="GLORYS12V1 2010-2020 (anomaly formulation)",
        validation_data="GLORYS 2021",
        test_data="GLORYS 2022",
        test_rmse_celsius=0.5246,
        climatology_rmse_celsius=0.6429,
        improvement_vs_climatology_pct=18.4,
        domain=DomainInfo(
            lat_min=float(service.lats[0]),
            lat_max=float(service.lats[-1]),
            lon_min=float(service.lons[0]),
            lon_max=float(service.lons[-1]),
            resolution_deg=0.25,
            n_lat=len(service.lats),
            n_lon=len(service.lons),
        ),
        depths_m=[round(float(d), 2) for d in SIH_DEPTHS],
        input_variables=["analysed_sst", "sos", "sla", "u", "v", "uwnd", "vwnd"],
        ablation_findings="SLA is the dominant variable (87.5% of multi-variable skill)",
    )


@router.get(
    "/dates/available",
    response_model=DatesAvailableResponse,
    summary="Get available inference date range",
    description="Returns the earliest and latest dates with available satellite inputs in the dataset.",
)
async def get_dates_available(service: ModelService = Depends(get_model_service)) -> DatesAvailableResponse:
    return DatesAvailableResponse(
        date_min=service.date_min,
        date_max=service.date_max,
        n_days=len(service.dates_available),
    )
