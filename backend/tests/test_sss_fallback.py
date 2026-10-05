"""
Tests for the SMOS/SMAP SSS fallback fix (Issue #5).

Tests the downloader's date-range splitting logic and the SSS adapter's
ability to detect and concatenate split segment files. All tests use
mocks and synthetic data — no real CMEMS credentials or network access needed.

Run with:
    pytest backend/tests/test_sss_fallback.py -v
"""

import os
import sys
import tempfile
from pathlib import Path
from datetime import datetime
from unittest.mock import patch, MagicMock, call

# Ensure repository root and backend directory are in sys.path
_TESTS_DIR = Path(__file__).resolve().parent
_BACKEND_DIR = _TESTS_DIR.parent
_REPO_ROOT = _BACKEND_DIR.parent
for _p in [str(_REPO_ROOT), str(_BACKEND_DIR)]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

import numpy as np
import pytest
import xarray as xr


# ---------------------------------------------------------------------------
# Helpers: synthetic SSS NetCDF files
# ---------------------------------------------------------------------------

def _create_sss_netcdf(filepath: str, start_date: str, end_date: str, out_of_range_coords=None):
    """Create a minimal synthetic SSS NetCDF file with realistic structure."""
    start = np.datetime64(start_date)
    end = np.datetime64(end_date)
    times = np.arange(start, end + np.timedelta64(1, "D"), np.timedelta64(1, "D"))

    lats = np.arange(5.0, 30.25, 0.25)   # 101 points
    lons = np.arange(45.0, 105.25, 0.25)  # 241 points

    rng = np.random.default_rng(42)
    sos_data = rng.uniform(30.0, 37.0, size=(len(times), len(lats), len(lons))).astype(np.float32)

    if out_of_range_coords:
        for idx, val in out_of_range_coords.items():
            sos_data[idx] = val

    ds = xr.Dataset(
        {"sos": (["time", "latitude", "longitude"], sos_data)},
        coords={
            "time": times,
            "latitude": lats,
            "longitude": lons,
        },
    )
    ds.to_netcdf(filepath)
    ds.close()
    return ds


# ===========================================================================
# Part 1: Downloader — date-range splitting logic
# ===========================================================================

class TestDownloaderSMOSSplitLogic:
    """Tests that download_cmems() correctly routes SSS downloads through
    the SMOS/SMAP fallback path when the config contains the switchover keys.
    """

    @pytest.fixture
    def config(self, tmp_path):
        """Minimal pipeline config with SMOS fallback keys."""
        return {
            "time_range": {
                "start_date": "2010-01-01",
                "end_date": "2020-12-31",
            },
            "domain": {
                "lat_min": 5.0,
                "lat_max": 30.0,
                "lon_min": 45.0,
                "lon_max": 105.0,
                "resolution": 0.25,
            },
            "cmems_products": {
                "sss": {
                    "dataset_id": "cmems_obs-mob_glo_phy-sss_my_multi_P1D",
                    "variable": "sos",
                    "output_file": "sss.nc",
                    "smos_only_dataset_id": "cmems_obs-mob_glo_phy-sss_my_smos_P1D",
                    "smap_start_date": "2015-04-01",
                },
                "sst": {
                    "dataset_id": "METOFFICE-GLO-SST-L4-REP-OBS-SST",
                    "variable": "analysed_sst",
                    "output_file": "sst.nc",
                },
            },
        }

    @pytest.fixture
    def downloader(self, config, tmp_path):
        """Create a DataDownloader with a temp raw dir, bypassing __init__."""
        from backend.pipeline.downloader import DataDownloader

        dl = DataDownloader.__new__(DataDownloader)
        dl.config = config
        dl.raw_dir = tmp_path / "raw"
        dl.raw_dir.mkdir()
        return dl

    @patch("backend.pipeline.downloader.copernicusmarine")
    def test_cross_transition_produces_two_files(self, mock_cmems, downloader):
        """When date range spans 2015-04-01, two calls should be made with
        different dataset IDs and date ranges.
        """
        mock_cmems.subset = MagicMock()

        downloader.download_cmems("sss")

        assert mock_cmems.subset.call_count == 2, (
            f"Expected 2 subset calls (SMOS + SMAP), got {mock_cmems.subset.call_count}"
        )

        # Extract dataset_id from each call
        calls = mock_cmems.subset.call_args_list
        dataset_ids = [c.kwargs.get("dataset_id", c[1].get("dataset_id", None))
                       if c.kwargs else None for c in calls]

        # First call via kwargs
        call_0_kwargs = calls[0].kwargs if calls[0].kwargs else {}
        call_1_kwargs = calls[1].kwargs if calls[1].kwargs else {}

        # SMOS segment: should use the SMOS-only dataset ID
        assert call_0_kwargs["dataset_id"] == "cmems_obs-mob_glo_phy-sss_my_smos_P1D"
        assert call_0_kwargs["start_datetime"] == "2010-01-01"
        assert call_0_kwargs["end_datetime"] == "2015-03-31"

        # SMAP segment: should use the merged dataset ID
        assert call_1_kwargs["dataset_id"] == "cmems_obs-mob_glo_phy-sss_my_multi_P1D"
        assert call_1_kwargs["start_datetime"] == "2015-04-01"
        assert call_1_kwargs["end_datetime"] == "2020-12-31"

    @patch("backend.pipeline.downloader.copernicusmarine")
    def test_post_smap_only_single_download(self, mock_cmems, downloader, config):
        """When entire range is post-SMAP, only one download with merged ID."""
        config["time_range"]["start_date"] = "2016-01-01"
        config["time_range"]["end_date"] = "2020-12-31"
        mock_cmems.subset = MagicMock()

        downloader.download_cmems("sss")

        assert mock_cmems.subset.call_count == 1
        kwargs = mock_cmems.subset.call_args.kwargs
        assert kwargs["dataset_id"] == "cmems_obs-mob_glo_phy-sss_my_multi_P1D"
        assert kwargs["output_filename"] == "sss.nc"

    @patch("backend.pipeline.downloader.copernicusmarine")
    def test_pre_smap_only_single_download(self, mock_cmems, downloader, config):
        """When entire range is pre-SMAP, only one download with SMOS ID."""
        config["time_range"]["start_date"] = "2010-01-01"
        config["time_range"]["end_date"] = "2014-12-31"
        mock_cmems.subset = MagicMock()

        downloader.download_cmems("sss")

        assert mock_cmems.subset.call_count == 1
        kwargs = mock_cmems.subset.call_args.kwargs
        assert kwargs["dataset_id"] == "cmems_obs-mob_glo_phy-sss_my_smos_P1D"
        assert kwargs["output_filename"] == "sss.nc"

    @patch("backend.pipeline.downloader.copernicusmarine")
    def test_non_sss_product_unaffected(self, mock_cmems, downloader):
        """SST and other products should NOT trigger the SMOS fallback path."""
        mock_cmems.subset = MagicMock()

        downloader.download_cmems("sst")

        assert mock_cmems.subset.call_count == 1
        kwargs = mock_cmems.subset.call_args.kwargs
        assert kwargs["dataset_id"] == "METOFFICE-GLO-SST-L4-REP-OBS-SST"

    @patch("backend.pipeline.downloader.copernicusmarine")
    def test_skips_existing_smos_segment(self, mock_cmems, downloader):
        """If sss_smos.nc already exists, only the SMAP segment is downloaded."""
        (downloader.raw_dir / "sss_smos.nc").touch()
        mock_cmems.subset = MagicMock()

        downloader.download_cmems("sss")

        # Should only download the SMAP segment
        assert mock_cmems.subset.call_count == 1
        kwargs = mock_cmems.subset.call_args.kwargs
        assert kwargs["dataset_id"] == "cmems_obs-mob_glo_phy-sss_my_multi_P1D"

    @patch("backend.pipeline.downloader.copernicusmarine")
    def test_skips_both_existing_segments(self, mock_cmems, downloader):
        """If both segment files already exist, no downloads happen."""
        (downloader.raw_dir / "sss_smos.nc").touch()
        (downloader.raw_dir / "sss_smap.nc").touch()
        mock_cmems.subset = MagicMock()

        downloader.download_cmems("sss")

        assert mock_cmems.subset.call_count == 0


# ===========================================================================
# Part 2: SSS Adapter — file detection and concatenation
# ===========================================================================

class TestSSSAdapterFileDetection:
    """Tests that the SSS adapter correctly detects single vs. split files
    and concatenates them properly.
    """

    @pytest.fixture
    def processor(self):
        """Create a mock GridProcessor that passes data through unchanged."""
        mock_proc = MagicMock()
        mock_proc.subset.side_effect = lambda ds, **kw: ds
        mock_proc.regrid.side_effect = lambda ds, **kw: ds
        mock_proc.align_time.side_effect = lambda ds, **kw: ds
        return mock_proc

    def test_detects_single_file(self, tmp_path, processor):
        """When only sss.nc exists, adapter loads it."""
        sss_path = tmp_path / "sss.nc"
        _create_sss_netcdf(str(sss_path), "2016-01-01", "2016-01-10")

        from backend.pipeline.adapters.sss_cmems import CMEMSAdapter
        adapter = CMEMSAdapter(str(sss_path), processor)

        files = adapter._detect_sss_files()
        assert len(files) == 1
        assert "sss.nc" in files[0]

    def test_detects_split_files(self, tmp_path, processor):
        """When sss_smos.nc + sss_smap.nc exist, adapter detects both."""
        _create_sss_netcdf(str(tmp_path / "sss_smos.nc"), "2010-01-01", "2010-01-05")
        _create_sss_netcdf(str(tmp_path / "sss_smap.nc"), "2015-04-01", "2015-04-05")

        from backend.pipeline.adapters.sss_cmems import CMEMSAdapter
        # data_path points to where sss.nc would be (same directory)
        adapter = CMEMSAdapter(str(tmp_path / "sss.nc"), processor)

        files = adapter._detect_sss_files()
        assert len(files) == 2

    def test_prefers_split_over_single(self, tmp_path, processor):
        """When both single and split files exist, split files take precedence."""
        _create_sss_netcdf(str(tmp_path / "sss.nc"), "2016-01-01", "2016-01-05")
        _create_sss_netcdf(str(tmp_path / "sss_smos.nc"), "2010-01-01", "2010-01-05")
        _create_sss_netcdf(str(tmp_path / "sss_smap.nc"), "2015-04-01", "2015-04-05")

        from backend.pipeline.adapters.sss_cmems import CMEMSAdapter
        adapter = CMEMSAdapter(str(tmp_path / "sss.nc"), processor)

        files = adapter._detect_sss_files()
        assert len(files) == 2
        assert any("sss_smos" in f for f in files)
        assert any("sss_smap" in f for f in files)

    def test_raises_when_no_files(self, tmp_path, processor):
        """When no SSS files exist at all, adapter raises FileNotFoundError."""
        from backend.pipeline.adapters.sss_cmems import CMEMSAdapter
        adapter = CMEMSAdapter(str(tmp_path / "sss.nc"), processor)

        with pytest.raises(FileNotFoundError):
            adapter._detect_sss_files()


class TestSSSAdapterConcatenation:
    """Tests that split SMOS+SMAP files are correctly concatenated."""

    @pytest.fixture
    def processor(self):
        mock_proc = MagicMock()
        mock_proc.subset.side_effect = lambda ds, **kw: ds
        mock_proc.regrid.side_effect = lambda ds, **kw: ds
        mock_proc.align_time.side_effect = lambda ds, **kw: ds
        return mock_proc

    def test_concatenated_time_is_continuous(self, tmp_path, processor):
        """SMOS + SMAP segments should produce a continuous time dimension."""
        _create_sss_netcdf(str(tmp_path / "sss_smos.nc"), "2014-03-28", "2015-03-31")
        _create_sss_netcdf(str(tmp_path / "sss_smap.nc"), "2015-04-01", "2016-04-05")

        from backend.pipeline.adapters.sss_cmems import CMEMSAdapter
        adapter = CMEMSAdapter(str(tmp_path / "sss.nc"), processor)
        ds = adapter.load()

        times = ds.time.values
        first = str(times[0])[:10]
        last = str(times[-1])[:10]

        assert first == "2014-03-28", f"Expected start 2014-03-28, got {first}"
        assert last == "2016-04-05", f"Expected end 2016-04-05, got {last}"

        # Verify no gaps (daily data = consecutive days)
        diffs = np.diff(times).astype("timedelta64[D]").astype(int)
        assert np.all(diffs == 1), "Time series has gaps after concatenation"

    def test_concatenated_has_sos_variable(self, tmp_path, processor):
        """Output dataset should contain only the sos variable."""
        _create_sss_netcdf(str(tmp_path / "sss_smos.nc"), "2014-12-01", "2014-12-05")
        _create_sss_netcdf(str(tmp_path / "sss_smap.nc"), "2015-04-01", "2015-04-05")

        from backend.pipeline.adapters.sss_cmems import CMEMSAdapter
        adapter = CMEMSAdapter(str(tmp_path / "sss.nc"), processor)
        ds = adapter.load()

        assert "sos" in ds.data_vars
        assert len(ds.data_vars) == 1

    def test_qc_applied_to_concatenated(self, tmp_path, processor):
        """QC range check (20–42 PSU) should be applied after concatenation."""
        smos_path = tmp_path / "sss_smos.nc"
        # Inject out-of-range values: below minimum (15 PSU) and above maximum (45 PSU)
        _create_sss_netcdf(
            str(smos_path),
            "2014-12-01",
            "2014-12-03",
            out_of_range_coords={(0, 0, 0): 15.0, (0, 0, 1): 45.0},
        )

        _create_sss_netcdf(str(tmp_path / "sss_smap.nc"), "2015-04-01", "2015-04-03")

        from backend.pipeline.adapters.sss_cmems import CMEMSAdapter
        adapter = CMEMSAdapter(str(tmp_path / "sss.nc"), processor)
        ds_result = adapter.load()

        # The out-of-range values should be NaN after QC
        assert np.isnan(ds_result["sos"].values[0, 0, 0]), "Below-min value should be NaN"
        assert np.isnan(ds_result["sos"].values[0, 0, 1]), "Above-max value should be NaN"
        ds_result.close()

    def test_single_file_still_works(self, tmp_path, processor):
        """Backward compatibility: single sss.nc file should load correctly."""
        _create_sss_netcdf(str(tmp_path / "sss.nc"), "2016-01-01", "2016-01-10")

        from backend.pipeline.adapters.sss_cmems import CMEMSAdapter
        adapter = CMEMSAdapter(str(tmp_path / "sss.nc"), processor)
        ds = adapter.load()

        assert "sos" in ds.data_vars
        assert len(ds.time) == 10
        ds.close()

    def test_depth_dim_squeezed(self, tmp_path, processor):
        """If a singleton depth dim exists, it should be removed."""
        path = tmp_path / "sss.nc"
        times = np.arange(
            np.datetime64("2016-01-01"),
            np.datetime64("2016-01-04"),
            np.timedelta64(1, "D"),
        )
        lats = np.arange(5.0, 30.25, 0.25)
        lons = np.arange(45.0, 105.25, 0.25)
        rng = np.random.default_rng(42)
        sos = rng.uniform(30.0, 37.0, size=(len(times), 1, len(lats), len(lons))).astype(np.float32)

        ds = xr.Dataset(
            {"sos": (["time", "depth", "latitude", "longitude"], sos)},
            coords={
                "time": times,
                "depth": [0.0],
                "latitude": lats,
                "longitude": lons,
            },
        )
        ds.to_netcdf(str(path))
        ds.close()

        from backend.pipeline.adapters.sss_cmems import CMEMSAdapter
        adapter = CMEMSAdapter(str(path), processor)
        result = adapter.load()

        assert "depth" not in result.dims, "Singleton depth dim should be squeezed"
        assert result["sos"].dims == ("time", "latitude", "longitude")
        result.close()
