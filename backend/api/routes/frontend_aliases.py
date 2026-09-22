"""
Frontend Compatibility Route Aliases.

Ensures zero-friction integration with existing frontend hooks in lib/api/queries.ts:
  - POST /api/predict               -> SubsurfaceProfile
  - GET  /api/field                 -> SurfaceField
  - GET  /api/datasets              -> DatasetCard[]
  - GET  /api/argo/nearby           -> 503 (Coming in Phase 8C)
  - GET  /api/argo/profile/:id      -> 503 (Coming in Phase 8C)
  - GET  /api/validation/matchup    -> 503 (Coming in Phase 8C)
  - GET  /api/validation/regional   -> 503 (Coming in Phase 8C)
"""

from __future__ import annotations

import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field

from backend.api.schemas.profile import FrontendSubsurfaceProfile
from backend.api.schemas.map import FrontendSurfaceField
from backend.api.schemas.datasets import DatasetCard
from backend.api.schemas.argo_validation import ArgoProfile, RegionalValidation, ValidationMatchup
from backend.api.services.model_service import ModelService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["Frontend Compatibility"])


def get_model_service(request: Request) -> ModelService:
    return request.app.state.model_service


class PredictRequestBody(BaseModel):
    lat: float = Field(..., ge=5.0, le=30.0, description="Latitude (5°N to 30°N)")
    lon: float = Field(..., ge=45.0, le=105.0, description="Longitude (45°E to 105°E)")
    date: str = Field(..., description="Date in YYYY-MM-DD format")


@router.post(
    "/predict",
    response_model=FrontendSubsurfaceProfile,
    summary="Frontend alias: Predict subsurface profile",
    description="Direct compatibility alias for frontend `useSubsurfaceProfile` hook.",
)
async def predict_subsurface(
    body: PredictRequestBody,
    service: ModelService = Depends(get_model_service),
) -> FrontendSubsurfaceProfile:
    try:
        res = service.predict_frontend_profile(lat=body.lat, lon=body.lon, date_str=body.date)
        return FrontendSubsurfaceProfile(**res)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Predict alias error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")


@router.get(
    "/field",
    response_model=FrontendSurfaceField,
    summary="Frontend alias: Surface observations heatmap",
    description="Direct compatibility alias for frontend `useSurfaceField` hook.",
)
async def get_surface_field(
    variable: str = Query("sst", description="'sst', 'sss', 'ssh', 'currents', 'winds'"),
    date: str = Query(..., description="Date in YYYY-MM-DD format"),
    bbox: Optional[str] = Query("45,-5,105,35", description="Bounding box string lonMin,latMin,lonMax,latMax"),
    service: ModelService = Depends(get_model_service),
) -> FrontendSurfaceField:
    try:
        res = service.get_frontend_surface_field(variable=variable, date_str=date, bbox_str=bbox)
        return FrontendSurfaceField(**res)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Field alias error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Data extract error: {str(e)}")


@router.get(
    "/datasets",
    response_model=List[DatasetCard],
    summary="Frontend alias: Dataset catalog",
    description="Returns metadata catalog of satellite inputs and GLORYS12V1 targets.",
)
async def get_datasets() -> List[DatasetCard]:
    return [
        DatasetCard(
            id="ostia-sst",
            name="OSTIA Sea Surface Temperature",
            variable="analysed_sst",
            resolution="0.25° grid (~25 km)",
            temporal="Daily (2010–2023)",
            role="input",
            source="Copernicus Marine / UK Met Office",
            path="data/processed/surface_features.zarr",
        ),
        DatasetCard(
            id="smos-sss",
            name="SMOS/SMAP Sea Surface Salinity",
            variable="sos",
            resolution="0.25° grid (~25 km)",
            temporal="Daily (2010–2023)",
            role="input",
            source="Copernicus Marine / ESA",
            path="data/processed/surface_features.zarr",
        ),
        DatasetCard(
            id="duacs-sla",
            name="DUACS Multi-Mission Altimetry SLA",
            variable="sla",
            resolution="0.25° grid (~25 km)",
            temporal="Daily (2010–2023)",
            role="input",
            source="Copernicus Marine / CNES",
            path="data/processed/surface_features.zarr",
        ),
        DatasetCard(
            id="copernicus-currents",
            name="Copernicus Geostrophic Surface Currents",
            variable="u, v",
            resolution="0.25° grid (~25 km)",
            temporal="Daily (2010–2023)",
            role="input",
            source="Copernicus Marine",
            path="data/processed/surface_features.zarr",
        ),
        DatasetCard(
            id="era5-winds",
            name="ERA5 10m Neutral Surface Winds",
            variable="uwnd, vwnd",
            resolution="0.25° grid (~25 km)",
            temporal="Daily (2010–2023)",
            role="input",
            source="ECMWF",
            path="data/processed/surface_features.zarr",
        ),
        DatasetCard(
            id="glorys-subsurface",
            name="GLORYS12V1 Subsurface Reanalysis",
            variable="thetao (Potential Temperature)",
            resolution="0.25° grid, 15 depth levels (0.49–902.34m)",
            temporal="Daily (2010–2022)",
            role="training_target",
            source="Mercator Ocean International",
            path="data/processed/target_glorys.zarr",
        ),
    ]


# ── Argo & Validation Matchup 503 Service Unavailable Endpoints ─────────────

ARGO_UNAVAILABLE_MSG = "Argo validation data not yet available. Coming in Phase 8C."


@router.get(
    "/argo/nearby",
    response_model=List[ArgoProfile],
    summary="Argo nearby profiles (Phase 8C)",
    description="Returns independent in-situ Argo float profiles near a coordinate. Currently 503 until Phase 8C ingestion.",
)
async def get_nearby_argo(
    lat: float = Query(...),
    lon: float = Query(...),
    date: str = Query(...),
    radius_km: float = Query(200.0),
):
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail=ARGO_UNAVAILABLE_MSG,
    )


@router.get(
    "/argo/profile/{float_id}",
    response_model=ArgoProfile,
    summary="Argo profile by float ID (Phase 8C)",
    description="Returns detailed observation profile for a specific float. Currently 503 until Phase 8C ingestion.",
)
async def get_argo_profile_by_id(float_id: str):
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail=ARGO_UNAVAILABLE_MSG,
    )


@router.get(
    "/validation/matchup",
    response_model=ValidationMatchup,
    summary="Validation matchup model vs observation (Phase 8C)",
    description="Returns paired point-by-point validation metrics. Currently 503 until Phase 8C ingestion.",
)
async def get_validation_matchup(
    lat: float = Query(...),
    lon: float = Query(...),
    date: str = Query(...),
):
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail=ARGO_UNAVAILABLE_MSG,
    )


@router.get(
    "/validation/regional",
    response_model=List[RegionalValidation],
    summary="Regional validation summary (Phase 8C)",
    description="Returns basin-wide validation statistics across all Argo floats. Currently 503 until Phase 8C ingestion.",
)
async def get_regional_validation():
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail=ARGO_UNAVAILABLE_MSG,
    )
