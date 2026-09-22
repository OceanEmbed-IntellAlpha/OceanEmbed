"""
Reconstruction endpoints for 3D profiles, 2D horizontal slices, timeseries, and regional statistics.
"""

from __future__ import annotations

import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request

from backend.api.schemas.profile import ProfileRequest, ProfileResponse
from backend.api.schemas.map import MapRequest, MapResponse
from backend.api.schemas.timeseries import TimeseriesRequest, TimeseriesResponse
from backend.api.schemas.regions import RegionsRequest, RegionsResponse
from backend.api.services.model_service import ModelService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/reconstruct", tags=["Reconstruction"])


def get_model_service(request: Request) -> ModelService:
    return request.app.state.model_service


@router.post(
    "/profile",
    response_model=ProfileResponse,
    summary="Reconstruct vertical temperature profile",
    description="Reconstructs vertical subsurface ocean temperature at a specific geographic coordinate and date across 15 depth levels.",
)
async def reconstruct_profile(
    body: ProfileRequest,
    service: ModelService = Depends(get_model_service),
) -> ProfileResponse:
    try:
        res = service.predict_profile(
            lat=body.lat,
            lon=body.lon,
            date_str=body.date,
            custom_depths=body.depths,
        )
        return ProfileResponse(**res)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Profile reconstruction error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")


@router.post(
    "/map",
    response_model=MapResponse,
    summary="Reconstruct 2D horizontal temperature map",
    description="Generates a 2D spatial temperature field (101x241 grid) at a specified depth level and date. Supports JSON or Base64 format.",
)
async def reconstruct_map(
    body: MapRequest,
    format: str = Query("json", description="'json' for nested arrays, 'base64' for float32 binary buffer"),
    service: ModelService = Depends(get_model_service),
) -> MapResponse:
    try:
        bbox_dict = body.bbox.model_dump() if body.bbox else None
        res = service.predict_map(
            date_str=body.date,
            depth_m=body.depth_m,
            bbox=bbox_dict,
            fmt=format.lower(),
        )
        return MapResponse(**res)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Map reconstruction error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")


@router.post(
    "/timeseries",
    response_model=TimeseriesResponse,
    summary="Reconstruct temperature timeseries",
    description="Reconstructs daily temperature over a specified time window at a fixed coordinate and depth level.",
)
async def reconstruct_timeseries(
    body: TimeseriesRequest,
    service: ModelService = Depends(get_model_service),
) -> TimeseriesResponse:
    try:
        res = service.predict_timeseries(
            lat=body.lat,
            lon=body.lon,
            depth_m=body.depth_m,
            date_start=body.date_start,
            date_end=body.date_end,
        )
        return TimeseriesResponse(**res)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Timeseries reconstruction error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")


@router.post(
    "/regions",
    response_model=RegionsResponse,
    summary="Get regional temperature statistics",
    description="Returns aggregate statistics (mean temperature, mean anomaly, RMSE vs climatology) for predefined ocean basins (Arabian Sea, Bay of Bengal, Open Ocean).",
)
async def reconstruct_regions(
    body: RegionsRequest,
    service: ModelService = Depends(get_model_service),
) -> RegionsResponse:
    try:
        res = service.predict_regions(
            date_str=body.date,
            depth_m=body.depth_m,
            region_ids=body.regions,
        )
        return RegionsResponse(**res)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Regional reconstruction error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")
