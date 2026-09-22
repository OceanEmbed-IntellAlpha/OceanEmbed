"""
OceanEmbed Production REST API — FastAPI Application Entrypoint.

Serves the frozen OceanEmbed v2 model (All-7 U-Net anomaly formulation)
for the North Indian Ocean subsurface temperature reconstruction.
"""

from __future__ import annotations

import logging
import time
import uuid
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from backend.api.routes import experiments, frontend_aliases, model_info, reconstruct, validation
from backend.api.schemas.common import HealthResponse
from backend.api.services.model_service import ModelService
from backend.api.services.argo_service import ArgoService

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
)
logger = logging.getLogger("oceanembed_api")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Startup and shutdown events: loads model and data singletons once."""
    t0 = time.perf_counter()
    logger.info("Initializing OceanEmbed ModelService and data handles...")
    
    # Initialize singleton and assign to app.state
    app.state.model_service = ModelService.get_instance()

    # Initialize Argo service (loads cached profiles from data/argo/)
    app.state.argo_service = ArgoService.get_instance()

    init_time = time.perf_counter() - t0
    logger.info(f"OceanEmbed API ready to serve requests! (Startup time: {init_time:.2f}s)")
    yield
    logger.info("Shutting down OceanEmbed API...")


app = FastAPI(
    title="OceanEmbed v2 API",
    description=(
        "Production REST API for satellite-based subsurface ocean temperature reconstruction "
        "over the North Indian Ocean (SIH 2026 PS SIH26066). Powered by frozen OceanEmbed v2 "
        "(7-channel U-Net anomaly formulation, 0.525°C Test RMSE)."
    ),
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)


# ── Middleware Configuration ──────────────────────────────────────────────────

# 1. GZip Response Compression (compresses large 2D JSON grid maps)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# 2. CORS Headers (allows Next.js dev server & local inspection)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 3. Request ID & Latency Logging Middleware
@app.middleware("http")
async def log_requests_middleware(request: Request, call_next) -> Response:
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    t_start = time.perf_counter()

    response: Response = await call_next(request)

    latency_ms = (time.perf_counter() - t_start) * 1000.0
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Process-Time-Ms"] = f"{latency_ms:.2f}"

    # Log summary (request body omitted for privacy & performance)
    logger.info(
        f"req_id={request_id} method={request.method} path={request.url.path} "
        f"status={response.status_code} latency={latency_ms:.2f}ms"
    )
    return response


# ── Route Registration ────────────────────────────────────────────────────────

# Standard REST v1 Routers
app.include_router(model_info.router)
app.include_router(reconstruct.router)
app.include_router(experiments.router)
app.include_router(validation.router)

# Frontend Compatibility Aliases
app.include_router(frontend_aliases.router)


# ── Liveness Health Check ─────────────────────────────────────────────────────

@app.get(
    "/health",
    response_model=HealthResponse,
    summary="Health check and model status",
    tags=["System"],
)
async def health_check(request: Request) -> HealthResponse:
    model_ok = hasattr(request.app.state, "model_service") and request.app.state.model_service is not None
    return HealthResponse(
        status="healthy",
        model_loaded=model_ok,
        version="v2",
    )
