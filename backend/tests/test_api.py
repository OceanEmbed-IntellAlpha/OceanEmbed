"""
Comprehensive API test suite for OceanEmbed v2 FastAPI application.
"""

from __future__ import annotations

import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

_BACKEND = Path(__file__).resolve().parents[1]
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

from backend.api.main import app


@pytest.fixture(scope="module")
def client():
    """Create a TestClient that triggers app lifespan startup."""
    with TestClient(app) as test_client:
        yield test_client


# ── System / Health Tests ───────────────────────────────────────────────────

def test_health_check(client: TestClient):
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["model_loaded"] is True
    assert data["version"] == "v2"


def test_docs_rendered(client: TestClient):
    res = client.get("/docs")
    assert res.status_code == 200


# ── Model Info Tests ────────────────────────────────────────────────────────

def test_model_info(client: TestClient):
    res = client.get("/api/v1/model/info")
    assert res.status_code == 200
    data = res.json()
    assert data["model_name"] == "OceanEmbed v2"
    assert data["architecture"] == "U-Net (BaselineModel)"
    assert data["test_rmse_celsius"] == 0.5246
    assert data["climatology_rmse_celsius"] == 0.6429
    assert data["improvement_vs_climatology_pct"] == 18.4
    assert len(data["depths_m"]) == 15
    assert len(data["input_variables"]) == 7
    assert "domain" in data
    assert data["domain"]["lat_min"] == 5.0
    assert data["domain"]["lat_max"] == 30.0


def test_dates_available(client: TestClient):
    res = client.get("/api/v1/dates/available")
    assert res.status_code == 200
    data = res.json()
    assert "date_min" in data
    assert "date_max" in data
    assert data["n_days"] > 1000


# ── Reconstruction Profile Tests ────────────────────────────────────────────

def test_reconstruct_profile_valid(client: TestClient):
    payload = {
        "lat": 15.5,
        "lon": 68.0,
        "date": "2022-06-15",
    }
    res = client.post("/api/v1/reconstruct/profile", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["query"]["lat"] == 15.5
    assert data["query"]["lon"] == 68.0
    assert len(data["profile"]) == 15

    # Sanity check: Arabian Sea in June has warm surface (28-31°C) and cold deep (~8-11°C at 902m)
    surf_temp = data["profile"][0]["temperature_c"]
    deep_temp = data["profile"][-1]["temperature_c"]
    assert 25.0 <= surf_temp <= 33.0, f"Expected surface temp ~28-30°C, got {surf_temp}"
    assert 5.0 <= deep_temp <= 15.0, f"Expected deep temp ~8-10°C, got {deep_temp}"
    assert surf_temp > deep_temp, "Surface should be warmer than deep ocean"


def test_reconstruct_profile_custom_depths(client: TestClient):
    payload = {
        "lat": 15.5,
        "lon": 68.0,
        "date": "2022-06-15",
        "depths": [10.0, 50.0, 100.0, 250.0, 500.0],
    }
    res = client.post("/api/v1/reconstruct/profile", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert len(data["profile"]) == 5
    assert [p["depth_m"] for p in data["profile"]] == [10.0, 50.0, 100.0, 250.0, 500.0]


def test_reconstruct_profile_invalid_coords(client: TestClient):
    # Latitude out of bounds (allowed 5.0 to 30.0)
    res = client.post("/api/v1/reconstruct/profile", json={"lat": 45.0, "lon": 68.0, "date": "2022-06-15"})
    assert res.status_code == 422  # Pydantic validation error


# ── Reconstruction Map Tests ────────────────────────────────────────────────

def test_reconstruct_map_json(client: TestClient):
    payload = {
        "date": "2022-06-15",
        "depth_m": 100.0,
    }
    res = client.post("/api/v1/reconstruct/map", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["depth_m"] == 100.0
    assert len(data["lat"]) == 101
    assert len(data["lon"]) == 241
    assert len(data["temperature_c"]) == 101
    assert len(data["temperature_c"][0]) == 241
    assert "stats" in data
    assert data["stats"]["min_c"] < data["stats"]["max_c"]


def test_reconstruct_map_base64(client: TestClient):
    payload = {
        "date": "2022-06-15",
        "depth_m": 100.0,
    }
    res = client.post("/api/v1/reconstruct/map?format=base64", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["format"] == "base64"
    assert data["temperature_b64"] is not None
    assert data["shape"] == [101, 241]


# ── Reconstruction Timeseries & Regions Tests ───────────────────────────────

def test_reconstruct_timeseries(client: TestClient):
    payload = {
        "lat": 15.5,
        "lon": 68.0,
        "depth_m": 100.0,
        "date_start": "2022-06-01",
        "date_end": "2022-06-07",
    }
    res = client.post("/api/v1/reconstruct/timeseries", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert len(data["dates"]) == 7
    assert len(data["temperature_c"]) == 7
    assert len(data["climatology_c"]) == 7
    assert len(data["anomaly_c"]) == 7


def test_reconstruct_regions(client: TestClient):
    payload = {
        "date": "2022-06-15",
        "depth_m": 100.0,
        "regions": ["arabian_sea", "bay_of_bengal"],
    }
    res = client.post("/api/v1/reconstruct/regions", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert len(data["regions"]) == 2
    for r in data["regions"]:
        assert r["mean_temperature_c"] > 0
        assert r["n_ocean_points"] > 0


# ── Research Lab Experiments Tests ──────────────────────────────────────────

def test_experiments(client: TestClient):
    res = client.get("/api/v1/experiments")
    assert res.status_code == 200
    data = res.json()
    assert len(data["experiments"]) >= 6
    assert len(data["variable_ablation"]) == 4
    # Check best model is identified
    v4 = next(v for v in data["variable_ablation"] if v["variant_id"] == "phase6_var_4")
    assert v4["test_rmse"] == 0.5246


# ── Frontend Compatibility Alias Tests ──────────────────────────────────────

def test_frontend_predict_alias(client: TestClient):
    payload = {
        "lat": 15.5,
        "lon": 68.0,
        "date": "2022-06-15",
    }
    res = client.post("/api/predict", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["lat"] == 15.5
    assert data["lon"] == 68.0
    assert data["source"] == "model"
    assert len(data["depths"]) == 15
    assert len(data["temperature"]) == 15
    assert len(data["confidence"]) == 15


def test_frontend_field_alias(client: TestClient):
    res = client.get("/api/field?variable=sst&date=2022-06-15")
    assert res.status_code == 200
    data = res.json()
    assert data["variable"] == "sst"
    assert data["unit"] == "°C"
    assert len(data["grid"]) == 101
    assert len(data["grid"][0]) == 241


def test_frontend_datasets_alias(client: TestClient):
    res = client.get("/api/datasets")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) >= 5
    assert any(d["id"] == "ostia-sst" for d in data)


# ── Argo & Validation Endpoints (Phase 8C) ──────────────────────────────────

def test_argo_nearby(client: TestClient):
    res = client.get("/api/argo/nearby?lat=15.5&lon=68.0&date=2022-06-15&radius_km=200")
    # 200 if Argo cache is populated, 503 if not yet ingested
    assert res.status_code in (200, 503), f"Unexpected status: {res.status_code}"
    if res.status_code == 200:
        data = res.json()
        assert isinstance(data, list)
        for p in data:
            assert "floatId" in p
            assert "lat" in p
            assert "lon" in p
            assert "temperature" in p


def test_argo_profile_by_id(client: TestClient):
    # First get a nearby profile to find a valid ID
    res_nearby = client.get("/api/argo/nearby?lat=15.5&lon=68.0&date=2022-06-15&radius_km=500")
    if res_nearby.status_code == 503:
        pytest.skip("Argo cache not yet populated")

    nearby = res_nearby.json()
    if not nearby:
        pytest.skip("No Argo profiles near (15.5, 68.0) in 2022 test set")

    float_id = nearby[0]["floatId"]
    res = client.get(f"/api/argo/profile/{float_id}")
    assert res.status_code == 200
    data = res.json()
    assert data["floatId"] == float_id
    assert "depths" in data and "temperature" in data


def test_validation_matchup(client: TestClient):
    res = client.get("/api/validation/matchup?lat=15.5&lon=68.0&date=2022-06-15")
    # 200 if match found, 404 if no nearby Argo, 503 if cache absent
    assert res.status_code in (200, 404, 503), f"Unexpected status: {res.status_code}"
    if res.status_code == 200:
        data = res.json()
        assert "modelTemp" in data
        assert "argoTemp" in data
        assert "rmse" in data
        assert "bias" in data
        assert data["rmse"] >= 0.0


def test_validation_regional(client: TestClient):
    res = client.get("/api/validation/regional")
    assert res.status_code in (200, 503), f"Unexpected status: {res.status_code}"
    if res.status_code == 200:
        data = res.json()
        assert isinstance(data, list)
        for region in data:
            assert "region" in region
            assert "nProfiles" in region
            assert "rmse" in region
            assert "rmseByDepth" in region
