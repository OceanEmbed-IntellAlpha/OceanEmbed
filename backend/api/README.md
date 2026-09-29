# OceanEmbed v2 — Production REST API Documentation

FastAPI backend serving the frozen **OceanEmbed v2** subsurface ocean temperature reconstruction model for the North Indian Ocean ($5^\circ–30^\circ\text{N}, 45^\circ–105^\circ\text{E}$).

---

## 1. Quickstart & Server Launch

### Prerequisites
- Python 3.12+ (in `.venv312`)
- Dependencies installed from `backend/requirements.txt`

### Launch the Development Server
```bash
# Run from repository root
.\.venv312\Scripts\python.exe -m uvicorn backend.api.main:app --host 0.0.0.0 --port 8000 --reload
```

### Interactive API Documentation
- **Swagger UI (Interactive):** [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc (Specification):** [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## 2. API Endpoints Reference

### System & Health

#### `GET /health`
Liveness check verifying the application and ML model in memory.
```bash
curl -X GET "http://localhost:8000/health"
```
**Response (200 OK):**
```json
{
  "status": "healthy",
  "model_loaded": true,
  "version": "v2"
}
```

---

### Model Information & Availability

#### `GET /api/v1/model/info`
Returns model metadata, performance metrics, depth levels, and domain boundaries.
```bash
curl -X GET "http://localhost:8000/api/v1/model/info"
```
**Response (200 OK):**
```json
{
  "model_name": "OceanEmbed v2",
  "architecture": "U-Net (BaselineModel)",
  "training_data": "GLORYS12V1 2010-2020 (anomaly formulation)",
  "validation_data": "GLORYS 2021",
  "test_data": "GLORYS 2022",
  "test_rmse_celsius": 0.5246,
  "climatology_rmse_celsius": 0.6429,
  "improvement_vs_climatology_pct": 18.4,
  "domain": {
    "lat_min": 5.0,
    "lat_max": 30.0,
    "lon_min": 45.0,
    "lon_max": 105.0,
    "resolution_deg": 0.25,
    "n_lat": 101,
    "n_lon": 241
  },
  "depths_m": [0.49, 5.08, 9.57, 18.5, 29.44, 47.37, 77.85, 92.33, 130.67, 155.85, 186.13, 318.13, 541.09, 643.57, 902.34],
  "input_variables": ["analysed_sst", "sos", "sla", "u", "v", "uwnd", "vwnd"],
  "ablation_findings": "SLA is the dominant variable (87.5% of multi-variable skill)"
}
```

#### `GET /api/v1/dates/available`
Returns the available date range for inference.
```bash
curl -X GET "http://localhost:8000/api/v1/dates/available"
```
**Response (200 OK):**
```json
{
  "date_min": "2010-01-01",
  "date_max": "2023-12-31",
  "n_days": 5113
}
```

---

### Reconstruction Endpoints

#### `POST /api/v1/reconstruct/profile`
Reconstructs a vertical temperature profile at a coordinate and date. Supports optional custom depth querying.
```bash
curl -X POST "http://localhost:8000/api/v1/reconstruct/profile" \
     -H "Content-Type: application/json" \
     -d '{
       "lat": 15.5,
       "lon": 68.0,
       "date": "2022-06-15"
     }'
```
**Response (200 OK):**
```json
{
  "query": {
    "lat": 15.5,
    "lon": 68.0,
    "date": "2022-06-15"
  },
  "nearest_grid_point": {
    "lat": 15.5,
    "lon": 68.0,
    "date_used": "2022-06-15",
    "lat_idx": 42,
    "lon_idx": 92
  },
  "profile": [
    {
      "depth_m": 0.49,
      "temperature_c": 30.211,
      "climatology_c": 29.845,
      "anomaly_c": 0.366
    },
    {
      "depth_m": 902.34,
      "temperature_c": 9.278,
      "climatology_c": 9.312,
      "anomaly_c": -0.034
    }
  ]
}
```

#### `POST /api/v1/reconstruct/map`
Reconstructs a 2D spatial map ($101 \times 241$ grid) at a specified depth and date.
```bash
curl -X POST "http://localhost:8000/api/v1/reconstruct/map?format=json" \
     -H "Content-Type: application/json" \
     -d '{
       "date": "2022-06-15",
       "depth_m": 100.0
     }'
```
*Tip:* For fast WebGL / Cesium texture upload, pass `?format=base64` to receive raw float32 buffers instead of nested JSON arrays.

#### `POST /api/v1/reconstruct/timeseries`
Reconstructs a daily temperature timeseries at a coordinate and depth.
```bash
curl -X POST "http://localhost:8000/api/v1/reconstruct/timeseries" \
     -H "Content-Type: application/json" \
     -d '{
       "lat": 15.5,
       "lon": 68.0,
       "depth_m": 100.0,
       "date_start": "2022-06-01",
       "date_end": "2022-06-07"
     }'
```

#### `POST /api/v1/reconstruct/regions`
Returns regional basin statistics (mean temperature, mean anomaly, RMSE vs climatology).
```bash
curl -X POST "http://localhost:8000/api/v1/reconstruct/regions" \
     -H "Content-Type: application/json" \
     -d '{
       "date": "2022-06-15",
       "depth_m": 100.0,
       "regions": ["arabian_sea", "bay_of_bengal"]
     }'
```

---

### Research Lab & Experiments

#### `GET /api/v1/experiments`
Returns model iteration benchmarks and variable ablation results for the Research Lab dashboard.
```bash
curl -X GET "http://localhost:8000/api/v1/experiments"
```

---

### Frontend Compatibility Aliases

The API provides direct compatibility aliases matching [`frontend/lib/api/queries.ts`](file:///c:/Users/DELL/Documents/oceanembed/OceanEmbed/frontend/lib/api/queries.ts):

| Endpoint | Method | Mapped Hook | Status |
|:---|:---:|:---|:---:|
| `/api/predict` | POST | `useSubsurfaceProfile` | **200 OK** |
| `/api/field` | GET | `useSurfaceField` | **200 OK** |
| `/api/datasets` | GET | `useDatasets` | **200 OK** |
| `/api/argo/nearby` | GET | `useNearbyArgo` | **503 (Phase 8C)** |
| `/api/argo/profile/:id` | GET | `useArgoProfile` | **503 (Phase 8C)** |
| `/api/validation/matchup` | GET | `useValidationMatchup` | **503 (Phase 8C)** |
| `/api/validation/regional` | GET | `useRegionalValidation` | **503 (Phase 8C)** |

#### Example: `/api/predict`
```bash
curl -X POST "http://localhost:8000/api/predict" \
     -H "Content-Type: application/json" \
     -d '{"lat": 15.5, "lon": 68.0, "date": "2022-06-15"}'
```
**Response:**
```json
{
  "lat": 15.5,
  "lon": 68.0,
  "date": "2022-06-15",
  "depths": [0.49, 5.08, 9.57, 18.5, 29.44, 47.37, 77.85, 92.33, 130.67, 155.85, 186.13, 318.13, 541.09, 643.57, 902.34],
  "temperature": [30.211, 30.27, 30.236, 30.258, 30.117, 28.823, 26.1, 25.236, 22.447, 20.317, 18.172, 13.833, 12.012, 11.197, 9.278],
  "source": "model"
}
```

---

## 3. Error Codes & Handling

| HTTP Status | Meaning | Scenario |
|:---|:---|:---|
| **200 OK** | Success | Request succeeded. |
| **400 Bad Request** | Invalid Input | Coordinates out of domain ($5–30^\circ\text{N}, 45–105^\circ\text{E}$), invalid date format. |
| **404 Not Found** | Out of Range | Date outside dataset coverage ($2010\text{–}2023$). |
| **422 Unprocessable Entity** | Schema Validation | Pydantic validation error (e.g. missing required JSON keys). |
| **503 Service Unavailable** | Feature Placeholder | Ingestion not yet completed (Argo in-situ validation coming in Phase 8C). |
| **500 Internal Server Error** | Unexpected Failure | Includes `X-Request-ID` header in response for debugging. |

---

## 4. Frontend Integration Notes

- **Base URL:** `http://localhost:8000` (Set in `frontend/.env`: `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000`)
- **CORS:** Pre-configured to accept `http://localhost:3000`, `http://localhost:3001`, and `*`.
- **Response Compression:** All responses above 1 KB are automatically GZip compressed.
- **Latency Expectations:**
  - Profile prediction: **~70 ms**
  - Full 2D map: **~280–500 ms**
  - 30-day timeseries: **~1.9 s**
