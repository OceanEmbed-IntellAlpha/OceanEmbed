"""
Frontend Compatibility Route Aliases.

Ensures zero-friction integration with existing frontend hooks in lib/api/queries.ts:
  - POST /api/predict               -> SubsurfaceProfile
  - GET  /api/field                 -> SurfaceField
  - GET  /api/datasets              -> DatasetCard[]
  - GET  /api/argo/nearby           -> ArgoProfile[] (live Argo data)
  - GET  /api/argo/profile/:id      -> ArgoProfile (live Argo data)
  - GET  /api/validation/matchup    -> ValidationMatchup (model vs Argo)
  - GET  /api/validation/regional   -> RegionalValidation[] (basin-wide stats)
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
from backend.api.services.argo_service import ArgoService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["Frontend Compatibility"])


def get_model_service(request: Request) -> ModelService:
    return request.app.state.model_service


def get_argo_service() -> ArgoService:
    return ArgoService.get_instance()

@router.get("/is-sea")
async def check_is_sea(
    lat: float = Query(...),
    lon: float = Query(...),
    service: ModelService = Depends(get_model_service)
):
    try:
        # Check if out of bounds for our model
        if lat < 5.0 or lat > 30.0 or lon < 45.0 or lon > 105.0:
            return {"isSea": False}
        lat_idx, lon_idx, _, _ = service.find_nearest_lat_lon(lat, lon)
        is_sea = bool(service.clim_service.ocean_mask[lat_idx, lon_idx])
        return {"isSea": is_sea}
    except Exception:
        return {"isSea": False}


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
    "/predict",
    response_model=FrontendSubsurfaceProfile,
    summary="Frontend alias: Predict subsurface profile (GET)",
    description="Direct compatibility alias for query-based profile requests.",
)
async def predict_subsurface_get(
    lat: float = Query(..., ge=5.0, le=30.0, description="Latitude (5°N to 30°N)"),
    lon: float = Query(..., ge=45.0, le=105.0, description="Longitude (45°E to 105°E)"),
    date: str = Query(..., description="Date in YYYY-MM-DD format"),
    service: ModelService = Depends(get_model_service),
) -> FrontendSubsurfaceProfile:
    try:
        res = service.predict_frontend_profile(lat=lat, lon=lon, date_str=date)
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
    variable: str = Query("sst", description="'sst', 'sss', 'ssh', 'currents', 'winds', 'thermal_anomaly'"),
    date: str = Query(..., description="Date in YYYY-MM-DD format"),
    depth: Optional[float] = Query(0.0, description="Target depth in metres (default: 0.0)"),
    bbox: Optional[str] = Query("45,-5,105,35", description="Bounding box string lonMin,latMin,lonMax,latMax"),
    service: ModelService = Depends(get_model_service),
) -> FrontendSurfaceField:
    var_lower = variable.lower().strip()
    if var_lower == "confidence":
        raise HTTPException(
            status_code=400,
            detail="The 'confidence' variable has been removed. Use 'thermal_anomaly' instead.",
        )
    try:
        res = service.get_frontend_surface_field(variable=variable, date_str=date, depth_m=depth or 0.0, bbox_str=bbox)
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


# ── Argo & Validation Endpoints (Phase 8C — Live Data) ───────────────────────

@router.get(
    "/argo/nearby",
    response_model=List[ArgoProfile],
    summary="Nearby Argo float profiles",
    description=(
        "Returns independent in-situ Argo float profiles near a coordinate. "
        "Data sourced from ArgoVis (argovis-api.colorado.edu). "
        "Searches within radius_km over ±30 days of the given date."
    ),
)
async def get_nearby_argo(
    lat: float = Query(..., ge=5.0, le=30.0),
    lon: float = Query(..., ge=45.0, le=105.0),
    date: str = Query(...),
    radius_km: float = Query(200.0, ge=10.0, le=5000.0),
    argo: ArgoService = Depends(get_argo_service),
) -> List[ArgoProfile]:
    if not argo.is_available:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Argo data cache not yet populated. "
                "Run: python backend/scripts/ingest_argo.py"
            ),
        )

    try:
        profiles = argo.get_nearby(lat=lat, lon=lon, date_str=date, radius_km=radius_km)
        return [ArgoProfile(**p) for p in profiles]
    except Exception as e:
        logger.error(f"Argo nearby error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Argo query error: {str(e)}")


@router.get(
    "/argo/profile/{float_id}",
    response_model=ArgoProfile,
    summary="Argo profile by float ID",
    description="Returns full observation profile for a specific Argo float cycle ID.",
)
async def get_argo_profile_by_id(
    float_id: str,
    argo: ArgoService = Depends(get_argo_service),
) -> ArgoProfile:
    if not argo.is_available:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Argo data cache not yet populated. Run: python backend/scripts/ingest_argo.py",
        )

    profile = argo.get_profile(float_id)
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Argo profile '{float_id}' not found in cache.",
        )

    return ArgoProfile(**profile)


@router.get(
    "/validation/matchup",
    response_model=ValidationMatchup,
    summary="Model vs Argo validation matchup",
    description=(
        "Runs model inference at (lat, lon, date), finds the nearest Argo float "
        "profile within 200 km and 30 days, and returns paired comparison metrics."
    ),
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
        # Run model inference to get predicted temperatures at the 15 model depth levels
        result = model_svc.predict_profile(lat=lat, lon=lon, date_str=date)
        model_temps = [point["temperature_c"] for point in result["profile"]]
        model_depths_m = [point["depth_m"] for point in result["profile"]]

        # Find nearest Argo profile and compute matchup
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


@router.get(
    "/validation/regional",
    response_model=List[RegionalValidation],
    summary="Regional validation summary",
    description=(
        "Returns basin-wide validation statistics across all Argo floats "
        "for the North Indian Ocean, Bay of Bengal, and Arabian Sea."
    ),
)
async def get_regional_validation(
    argo: ArgoService = Depends(get_argo_service),
) -> List[RegionalValidation]:
    if not argo.is_available:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Argo data cache not yet populated. Run: python backend/scripts/ingest_argo.py",
        )

    try:
        stats = argo.get_regional_stats()
        if not stats:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Regional stats not yet computed. Re-run backend/scripts/ingest_argo.py.",
            )
        return [RegionalValidation(**s) for s in stats]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Regional validation error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Regional stats error: {str(e)}")


@router.get(
    "/experiments",
    summary="Research Lab experiments summary",
    description="Returns benchmarked model architectures and variable ablations.",
)
async def get_experiments_alias():
    from backend.api.routes.experiments import get_experiments
    return await get_experiments()


@router.get(
    "/validation/seasonal",
    summary="Seasonal validation summary",
    description="Returns performance across Pre-monsoon, Monsoon, Post-monsoon, and Winter.",
)
async def get_seasonal_validation_alias(argo: ArgoService = Depends(get_argo_service)):
    from backend.api.routes.validation import get_seasonal_validation
    return await get_seasonal_validation(argo=argo)


@router.get(
    "/validation/monsoon",
    summary="Monsoon regime validation summary",
    description="Returns performance comparison for Monsoon (Jun-Sep) vs Non-monsoon (Oct-May).",
)
async def get_monsoon_validation_alias(argo: ArgoService = Depends(get_argo_service)):
    from backend.api.routes.validation import get_monsoon_validation
    return await get_monsoon_validation(argo=argo)


@router.get(
    "/validation/region_season_matrix",
    summary="Region x Season validation matrix",
    description="Returns 3x4 matrix across Arabian Sea, Bay of Bengal, and NIO for 4 seasons.",
)
async def get_region_season_matrix_alias(argo: ArgoService = Depends(get_argo_service)):
    from backend.api.routes.validation import get_region_season_matrix
    return await get_region_season_matrix(argo=argo)


