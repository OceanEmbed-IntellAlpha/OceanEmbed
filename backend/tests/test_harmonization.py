"""
Unit and Integration Tests for NetCDF Harmonization Layer.
"""
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

from config import settings
from main import app
from harmonization.inspector import inspect_netcdf
from harmonization.detector import detect_dataset_type, DatasetType
from harmonization.store import get_canonical_store
from harmonization.pipeline import HarmonizationPipeline
from services.interpolation_service import ModelInterpolator

client = TestClient(app)


def test_inspector_and_detector():
    """Test inspecting and classifying datasets."""
    data_dir = Path(settings.data_dir)
    nc_files = list(data_dir.glob("*.nc"))
    assert len(nc_files) >= 1, "Expected at least one NetCDF test file."

    for f in nc_files:
        report = inspect_netcdf(f)
        assert len(report.dimensions) > 0
        assert len(report.variables) > 0


def test_harmonization_pipeline_model():
    """Test full pipeline normalization on model grid."""
    store = get_canonical_store()
    model = store.get_active_model()
    assert model is not None, "Canonical store should have loaded active model."
    assert "temperature" in model.variables or "salinity" in model.variables
    assert len(model.lat) > 0
    assert len(model.lon) > 0
    assert len(model.depth) > 0

    # Test 2D slice extraction
    lats, lons, grid, color_range = model.get_slice_2d("temperature", depth_m=50.0)
    assert len(lats) == len(grid)
    assert len(lons) == len(grid[0])
    assert color_range[0] <= color_range[1]

    # Test 1D column extraction
    depths, vals = model.get_column_1d(lat=lats[10], lon=lons[10], variable="temperature")
    assert len(depths) == len(vals)


def test_harmonization_pipeline_argo():
    """Test full pipeline normalization on Argo observations."""
    store = get_canonical_store()
    obs = store.get_active_observations()
    if obs and obs.profiles:
        latest = obs.get_latest_observations()
        assert len(latest) > 0
        sample_id = latest[0].id
        prof = obs.get_latest_profile(sample_id)
        assert prof is not None
        assert prof.platform_id == sample_id
        assert len(prof.depths) == len(prof.levels)
        assert len(prof.temperatures) > 0 or len(prof.salinities) > 0


def test_interpolation_and_matchup():
    """Test spatial/temporal interpolator."""
    store = get_canonical_store()
    model = store.get_active_model()
    assert model is not None

    interpolator = ModelInterpolator(model)
    mid_lat = float(model.lat[len(model.lat)//2])
    mid_lon = float(model.lon[len(model.lon)//2])

    interp_vals = interpolator.interpolate_profile(
        lat=mid_lat,
        lon=mid_lon,
        target_depths=[10.0, 50.0, 100.0, 500.0],
        variable="temperature",
    )
    assert len(interp_vals) == 4


def test_api_endpoints():
    """Test FastAPI endpoints driven by the canonical harmonization layer."""
    # 1. /api/field
    res = client.get("/api/field?variable=temperature&depth=100")
    assert res.status_code == 200
    data = res.json()
    assert "grid" in data
    assert "lat" in data
    assert "lon" in data
    assert "colorRange" in data

    # 2. /api/column
    res = client.get("/api/column?lat=10.0&lon=80.0&variable=temperature")
    assert res.status_code == 200
    col = res.json()
    assert "depths" in col
    assert "values" in col

    # 3. /api/observations
    res = client.get("/api/observations")
    assert res.status_code == 200
    obs_list = res.json()
    assert isinstance(obs_list, list)

    if obs_list:
        sample_id = obs_list[0]["id"]
        # 4. /api/profile/{id}
        res_prof = client.get(f"/api/profile/{sample_id}")
        assert res_prof.status_code == 200
        p_data = res_prof.json()
        assert "depths" in p_data
        assert "temperature" in p_data

        # 5. /api/matchup/{id}
        res_match = client.get(f"/api/matchup/{sample_id}")
        assert res_match.status_code == 200
        m_data = res_match.json()
        assert "delta" in m_data
        assert "observed" in m_data
        assert "model" in m_data
