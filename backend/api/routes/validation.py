"""
Phase 7 & 8C — Validation Routes.

Serves:
  - Seasonal validation breakdowns (/api/v1/validation/seasonal)
  - Monsoon regime comparison (/api/v1/validation/monsoon)
  - Region x Season matrix (/api/v1/validation/region_season_matrix)
  - Regional basin summaries (/api/v1/validation/regional)
  - Model vs Argo matchup point queries (/api/v1/validation/matchup)
"""

from __future__ import annotations

import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from backend.api.schemas.argo_validation import (
    ArgoProfile,
    RegionalValidation,
    ValidationMatchup,
    SeasonalValidationResponse,
    MonsoonValidationResponse,
    RegionSeasonMatrixResponse,
)
from backend.api.services.argo_service import ArgoService
from backend.api.services.model_service import ModelService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/validation", tags=["Validation"])


def get_model_service(request: Request) -> ModelService:
    return request.app.state.model_service


def get_argo_service() -> ArgoService:
    return ArgoService.get_instance()


@router.get(
    "/seasonal",
    response_model=SeasonalValidationResponse,
    summary="Seasonal validation breakdown",
    description="Returns model performance across Pre-monsoon (Mar-May), Monsoon (Jun-Sep), Post-monsoon (Oct-Dec), and Winter (Jan-Feb).",
)
async def get_seasonal_validation(
    argo: ArgoService = Depends(get_argo_service),
) -> SeasonalValidationResponse:
    if not argo.is_available:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Argo data cache not yet populated. Run: python backend/scripts/ingest_argo.py",
        )
    stats = argo.get_all_seasonal_stats()
    if not stats:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Seasonal stats not yet computed. Run: python backend/scripts/compute_seasonal_analysis.py",
        )
    return SeasonalValidationResponse(**stats)


@router.get(
    "/monsoon",
    response_model=MonsoonValidationResponse,
    summary="Monsoon regime comparison",
    description="Returns comparison between Monsoon months (Jun-Sep) and Non-monsoon months (Oct-May).",
)
async def get_monsoon_validation(
    argo: ArgoService = Depends(get_argo_service),
) -> MonsoonValidationResponse:
    if not argo.is_available:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Argo data cache not yet populated. Run: python backend/scripts/ingest_argo.py",
        )
    stats = argo.get_monsoon_stats()
    if not stats:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Monsoon stats not yet computed. Run: python backend/scripts/compute_seasonal_analysis.py",
        )
    return MonsoonValidationResponse(**stats)


@router.get(
    "/region_season_matrix",
    response_model=RegionSeasonMatrixResponse,
    summary="Region x Season validation matrix",
    description="Returns 3x4 matrix of performance across Arabian Sea, Bay of Bengal, and NIO for each of the 4 seasons.",
)
async def get_region_season_matrix(
    argo: ArgoService = Depends(get_argo_service),
) -> RegionSeasonMatrixResponse:
    if not argo.is_available:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Argo data cache not yet populated. Run: python backend/scripts/ingest_argo.py",
        )
    grid = argo.get_regional_seasonal_grid()
    if not grid:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Region x season grid not yet computed. Run: python backend/scripts/compute_seasonal_analysis.py",
        )
    return RegionSeasonMatrixResponse(**grid)


@router.get(
    "/regional",
    response_model=List[RegionalValidation],
    summary="Regional validation summary",
    description="Returns basin-wide validation statistics across all Argo floats for NIO, Bay of Bengal, and Arabian Sea.",
)
async def get_regional_validation(
    argo: ArgoService = Depends(get_argo_service),
) -> List[RegionalValidation]:
    if not argo.is_available:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Argo data cache not yet populated. Run: python backend/scripts/ingest_argo.py",
        )
    stats = argo.get_regional_stats()
    if not stats:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Regional stats not yet computed.",
        )
    return [RegionalValidation(**s) for s in stats]


@router.get(
    "/matchup",
    response_model=ValidationMatchup,
    summary="Model vs Argo validation matchup",
    description="Runs model inference at (lat, lon, date), finds nearest Argo float, and returns paired comparison metrics.",
)
async def get_validation_matchup(
    lat: float = Query(..., ge=5.0, le=30.0),
    lon: float = Query(..., ge=45.0, le=105.0),
    date: str = Query(...),
    model_svc: ModelService = Depends(get_model_service),
    argo: ArgoService = Depends(get_argo_service),
) -> ValidationMatchup:
    if not argo.is_available:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Argo data cache not yet populated. Run: python backend/scripts/ingest_argo.py",
        )

    try:
        result = model_svc.predict_profile(lat=lat, lon=lon, date_str=date)
        model_temps = [point["temperature_c"] for point in result["profile"]]
        model_depths_m = [point["depth_m"] for point in result["profile"]]

        matchup = argo.compute_validation_matchup(
            lat=lat,
            lon=lon,
            date_str=date,
            model_temps=model_temps,
            model_depths=model_depths_m,
        )

        if matchup is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No Argo profile found near ({lat}, {lon}) on {date} within 200 km / 30 days.",
            )

        return ValidationMatchup(**matchup)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Validation matchup error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Matchup error: {str(e)}")
