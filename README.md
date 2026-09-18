# OceanEmbed Data Pipeline — From Raw Satellite Data to Training-Ready Zarr

> **SIH26066** | Ministry of Earth Sciences / INCOIS
> Satellite Embedding-Based Subsurface Ocean Temperature Reconstruction

---

## 1. Overview

This PR implements a **production-grade data pipeline** that downloads, preprocesses, quality-controls, and standardizes multi-source satellite and ocean reanalysis data into training-ready Zarr tensor stores for the OceanEmbed deep learning model.

**Domain:** North Indian Ocean (5°N–30°N, 45°E–105°E)
**Spatial Resolution:** 0.25° × 0.25° (canonical grid: 101 lat × 241 lon)
**Temporal Resolution:** Daily
**Output:**
- `data/processed/surface_features.zarr` — 7 surface input channels
- `data/processed/target_glorys.zarr` — 3D subsurface temperature at 15 standard depths

---

## 2. Pipeline Architecture

```
pipeline_config.yaml
        │
        ▼
┌──────────────────────┐
│   DataDownloader     │ ◄── Credentials from .env
│  (downloader.py)     │
└──────┬───────────────┘
       │
       │  Downloads raw NetCDF from CMEMS / PO.DAAC / GDAC
       ▼
  data/raw/
  ├── sst.nc           (OSTIA 0.05°)
  ├── sss.nc           (CMEMS 0.125°)
  ├── ssh.nc           (DUACS 0.25°)
  ├── currents/        (OSCAR 0.25°, multi-granule)
  ├── winds/           (CCMP 0.25°, multi-granule 6-hourly)
  ├── target_glorys.nc (GLORYS 0.083°, 50 depth levels)
  └── argo_profiles/   (Argo .nc files for validation)
       │
       ▼
┌──────────────────────┐
│   Pipeline Adapters  │ ◄── One adapter per data source
│  (adapters/*.py)     │     Each does: Load → Kelvin→°C → Subset → Regrid 0.25° → QC → Align Time
└──────┬───────────────┘
       │
       │  All datasets now on identical 0.25° × daily grid
       ▼
┌──────────────────────┐
│   GridProcessor      │ ◄── Core regridding engine
│  (processor.py)      │     Uses xarray.interp() for bilinear interpolation
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│   TensorGenerator    │ ◄── Merges all surface datasets into one Zarr store
│  (generator.py)      │
└──────┬───────────────┘
       │
       ▼
  data/processed/
  ├── surface_features.zarr   ← [time, lat=101, lon=241] × 7 variables
  └── target_glorys.zarr      ← [time, depth=15, lat=101, lon=241] × 1 variable
```

---

## 3. Data Sources & Adapters

Each adapter is responsible for loading raw NetCDF data from a specific satellite product, applying product-specific preprocessing, and returning a clean `xr.Dataset` on the canonical 0.25° grid.

### 3.1 Surface Input Variables (7 channels)

| # | Variable | Adapter | Source Product | Native Res | NetCDF Variable | QC Range |
|---|----------|---------|---------------|-----------|-----------------|----------|
| 1 | **SST** | `OSTIAAdapter` (`sst_ostia.py`) | OSTIA L4 Reprocessed | 0.05° daily | `analysed_sst` | -2.5 to 40°C |
| 2 | **SSS** | `CMEMSAdapter` (`sss_cmems.py`) | CMEMS Multi-Obs SSS | 0.125° daily | `sos` | 20 to 42 PSU |
| 3 | **SSH/SLA** | `DUACSAdapter` (`ssh_duacs.py`) | DUACS L4 Altimetry | 0.25° daily | `sla` | -2 to 2 m |
| 4 | **Current U** | `OSCARAdapter` (`currents_oscar.py`) | OSCAR L4 v2.0 | 0.25° 5-day | `u` | -5 to 5 m/s |
| 5 | **Current V** | `OSCARAdapter` (`currents_oscar.py`) | OSCAR L4 v2.0 | 0.25° 5-day | `v` | -5 to 5 m/s |
| 6 | **Wind U** | `CCMPAdapter` (`winds_ccmp.py`) | CCMP v3.1 L4 | 0.25° 6-hourly | `uwnd` | -50 to 50 m/s |
| 7 | **Wind V** | `CCMPAdapter` (`winds_ccmp.py`) | CCMP v3.1 L4 | 0.25° 6-hourly | `vwnd` | -50 to 50 m/s |

### 3.2 Target Variable

| Variable | Adapter | Source Product | Native Res | Depth Levels | QC Range |
|----------|---------|---------------|-----------|-------------|----------|
| **Subsurface Temperature** | `GLORYSAdapter` (`target_glorys.py`) | GLORYS12V1 Reanalysis | 0.083° daily, 50 depths | 15 SIH standard depths | -5 to 40°C |

**15 Standard Depths (metres):** 0, 5, 10, 20, 30, 50, 75, 100, 125, 150, 200, 300, 500, 700, 1000

### 3.3 Validation Data

| Data | Adapter | Source |
|------|---------|--------|
| **Argo Float Profiles** | `ArgoAdapter` (`validation_argo.py`) | IFREMER GDAC / INCOIS ERDDAP |

The Argo adapter loads real in-situ temperature profiles, filters to the NIO domain, applies QC flags (keeping only QC=1 and QC=2), and returns a structured DataFrame for model evaluation.

---

## 4. Preprocessing Steps (Per Adapter)

Every adapter follows this standardized preprocessing pipeline:

### Step 1: Load Raw Data
- Single-file products → `xr.open_dataset()` with Dask lazy loading
- Multi-granule products (OSCAR, CCMP) → `xr.open_mfdataset()` for automatic concatenation

### Step 2: Unit Conversion (SST only)
- OSTIA stores `analysed_sst` in **Kelvin**
- Auto-detected via heuristic: if `mean > 100`, apply `K → °C` conversion (`value - 273.15`)

### Step 3: Spatial Subset
- Crops dataset to NIO bounding box: `lat=[5.0, 30.0]`, `lon=[45.0, 105.0]`
- Handles inverted latitude axes by auto-sorting before slicing

### Step 4: Regrid to 0.25° × 0.25°
- Target grid: `np.arange(5.0, 30.25, 0.25)` × `np.arange(45.0, 105.25, 0.25)` → **101 × 241 points**
- Method: Bilinear interpolation via `xarray.interp()`
- Rationale: Chosen over xESMF to avoid heavy C++ dependencies while maintaining production-quality spatial smoothness

### Step 5: Temporal Alignment
- Resamples all data to daily frequency using `.resample("1D").mean()`
- Converts `cftime` calendar objects to standard `datetime64` for cross-dataset compatibility

### Step 6: Quality Control (QC)
- Each variable is range-checked against physically realistic thresholds
- Out-of-range values are replaced with `NaN` (masked out)
- NaN values propagate naturally through the model's missingness masks during training

---

## 5. GridProcessor — The Core Regridding Engine

**File:** `backend/pipeline/processor.py`

The `GridProcessor` class is the central component ensuring all datasets end up on the exact same grid:

```python
class GridProcessor:
    def subset(ds, lat_name, lon_name)   # Crop to NIO domain
    def regrid(ds, lat_name, lon_name)   # Interpolate to 0.25° grid
    def align_time(ds, time_name)        # Resample to daily mean
```

Key implementation details:
- Generates target coordinates via `np.arange` with `resolution/2` padding to include the endpoint
- Auto-sorts coordinates before slicing (handles datasets with descending lat order)
- Uses `xarray.interp(method="linear")` — native, fast, no external dependencies

---

## 6. TensorGenerator — Merging into Zarr

**File:** `backend/pipeline/generator.py`

After all adapters produce individually preprocessed datasets on the canonical grid:

1. **Surface features**: `xr.merge()` combines all 7 surface variables into a single `xr.Dataset`, then writes to `surface_features.zarr` with chunking `{time: 30, latitude: -1, longitude: -1}` for efficient batch loading.

2. **Target GLORYS**: Writes the 3D temperature field to `target_glorys.zarr` with chunking `{time: 30, depth: -1, latitude: -1, longitude: -1}`.

---

## 7. Output Zarr Store Schemas

### `surface_features.zarr`
```
Dimensions:     (time: N, latitude: 101, longitude: 241)
Variables:
    analysed_sst  (time, latitude, longitude)  — Sea Surface Temperature (°C)
    sos           (time, latitude, longitude)  — Sea Surface Salinity (PSU)
    sla           (time, latitude, longitude)  — Sea Level Anomaly (m)
    u             (time, latitude, longitude)  — Surface Current Eastward (m/s)
    v             (time, latitude, longitude)  — Surface Current Northward (m/s)
    uwnd          (time, latitude, longitude)  — Surface Wind Eastward (m/s)
    vwnd          (time, latitude, longitude)  — Surface Wind Northward (m/s)
Coordinates:
    latitude      101 values from 5.0 to 30.0 (0.25° spacing)
    longitude     241 values from 45.0 to 105.0 (0.25° spacing)
    time          daily timestamps
```

### `target_glorys.zarr`
```
Dimensions:     (time: N, depth: 15, latitude: 101, longitude: 241)
Variables:
    thetao        (time, depth, latitude, longitude) — Potential Temperature (°C)
Coordinates:
    latitude      101 values from 5.0 to 30.0
    longitude     241 values from 45.0 to 105.0
    depth         [0, 5, 10, 20, 30, 50, 75, 100, 125, 150, 200, 300, 500, 700, 1000]
    time          daily timestamps
```

---

## 8. Pipeline Validation

**File:** `backend/pipeline/validate_pipeline.py`

After the pipeline completes, run the validation script to verify:
- ✅ Latitude/longitude coordinates are identical between surface and target Zarr stores
- ✅ Grid spacing is exactly 0.25°
- ✅ All 7 expected surface variables are present
- ✅ Visual inspection plot saved to `data/processed/pipeline_validation.png`

---

## 9. Commands

### Prerequisites
```bash
# 1. Install dependencies
pip install -r backend/requirements.txt

# 2. Configure credentials (copy and fill in)
cp backend/.env.example backend/.env
```

### Run the Full Pipeline
```bash
# Downloads all data + preprocesses + generates Zarr stores
python backend/pipeline/run_pipeline.py
```

### Run Only Preprocessing (if raw data already downloaded)
```bash
python backend/scripts/ingest.py
```

### Validate Pipeline Output
```bash
python backend/pipeline/validate_pipeline.py
```

### Start the Inference API Server
```bash
uvicorn backend.api.main:app --reload --port 8000
```

---

## 10. File Structure

```
backend/
├── api/
│   ├── main.py                      # FastAPI app entry point
│   └── routes/
│       └── inference.py             # /api/reconstruct endpoints (wired to engine)
├── config.py                        # App settings from .env
├── .env.example                     # Template for credentials
├── requirements.txt                 # Production dependencies (no stale DB packages)
├── pipeline/
│   ├── pipeline_config.yaml         # Domain, time range, product IDs, depths
│   ├── downloader.py                # Downloads from CMEMS, PO.DAAC, GDAC
│   ├── processor.py                 # GridProcessor: subset, regrid 0.25°, align time
│   ├── generator.py                 # TensorGenerator: merge → Zarr stores
│   ├── run_pipeline.py              # Orchestrates full ETL pipeline
│   ├── validate_pipeline.py         # Asserts grid alignment + generates plots
│   ├── test_pipeline.py             # GLORYS adapter integration test
│   └── adapters/
│       ├── sst_ostia.py             # SST (Kelvin→°C + QC)
│       ├── sss_cmems.py             # SSS (QC 20–42 PSU)
│       ├── ssh_duacs.py             # SSH/SLA (QC -2–2 m)
│       ├── currents_oscar.py        # Currents U/V (QC -5–5 m/s)
│       ├── winds_ccmp.py            # Winds U/V (QC -50–50 m/s)
│       ├── target_glorys.py         # GLORYS temp at 15 depths (QC -5–40°C)
│       └── validation_argo.py       # Argo float profile loader
├── ocean_embed/                     # Deep learning model (for teammate)
│   ├── models/                      # Model architectures
│   ├── training/                    # Loss functions
│   ├── evaluation/                  # Metrics + ARGO validation
│   ├── grid.py                      # Canonical 0.25° grid definition
│   ├── harmonize.py                 # Additional QC utilities
│   ├── normalization.py             # Per-channel normalization stats
│   └── engine.py                    # Inference engine
└── scripts/
    └── ingest.py                    # CLI wrapper for pipeline
```

---

## 11. Breaking Changes
- **Database removed:** PostgreSQL / SQLAlchemy / Cloudflare R2 are no longer required. All data lives on the local filesystem as Zarr stores.
- **Old REST endpoints removed:** `/observations`, `/profiles`, `/catalog` endpoints no longer exist. Use `/api/reconstruct/profile` and `/api/reconstruct/map`.
- **requirements.txt rewritten:** Stale packages (`sqlalchemy`, `asyncpg`, `xgboost`, `boto3`) removed. New packages (`torch`, `copernicusmarine`, `earthaccess`, `dask`) added.
