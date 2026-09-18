# Digital Ocean Twin — NetCDF Data Harmonization & Canonical Data Layer

> **Implementation Plan**
>
> Goal: Build a metadata-aware NetCDF ingestion and normalization layer that can accept heterogeneous ocean model and observation datasets, convert them into a canonical internal schema, and expose a consistent API to the frontend.

---

## 1. Executive Summary

The system should **not** be designed as "one parser for every `.nc` file."

NetCDF is a container format and different ocean datasets can have very different structures:

- Different variable names
- Different dimension names and orders
- Different units
- Different longitude conventions
- Different depth conventions
- Different missing-value representations
- Different coordinate systems
- Gridded, profile, curvilinear, staggered, or unstructured data

Therefore, build a **NetCDF Harmonization / Normalization Layer** between the raw datasets and the application APIs.

```text
ANY SUPPORTED .nc FILE
        │
        ▼
┌─────────────────────────┐
│ 1. NetCDF Inspector     │
│ dimensions / variables  │
│ attributes / metadata   │
└────────────┬────────────┘
             ▼
┌─────────────────────────┐
│ 2. Dataset Classifier   │
│ model / Argo / glider   │
│ CTD / trajectory / etc. │
└────────────┬────────────┘
             ▼
┌─────────────────────────┐
│ 3. Variable Resolver    │
│ thetao → temperature    │
│ nav_lat → lat           │
│ etc.                    │
└────────────┬────────────┘
             ▼
┌─────────────────────────┐
│ 4. Normalization        │
│ dimensions / units      │
│ time / depth / longitude│
└────────────┬────────────┘
             ▼
┌─────────────────────────┐
│ 5. Cleaning + QC        │
│ FillValue / NaN / QC    │
└────────────┬────────────┘
             ▼
┌─────────────────────────┐
│ 6. Validation           │
│ Canonical Data Contract │
└────────────┬────────────┘
             ▼
┌─────────────────────────┐
│ 7. Storage / Cache      │
│ Zarr / optimized store  │
└────────────┬────────────┘
             ▼
        Data API
             │
       ┌─────┼─────┐
       ▼     ▼     ▼
    /field /column /matchup
       │     │     │
       └─────┼─────┘
             ▼
        Frontend
```

The key principle is:

> **Everything before the canonical schema can be heterogeneous. Everything after the canonical schema should be predictable.**

---

# 2. Primary Objectives

The ingestion system must:

- Accept supported NetCDF ocean datasets.
- Inspect datasets automatically.
- Identify dataset type.
- Detect coordinates and variables using metadata first.
- Fall back to configurable aliases when metadata is insufficient.
- Normalize dimensions.
- Normalize longitude representation.
- Normalize depth direction.
- Normalize units.
- Decode timestamps.
- Handle missing/fill values.
- Handle Argo quality-control information.
- Preserve source/provenance metadata.
- Validate normalized datasets.
- Store data efficiently for large-scale queries.
- Support interpolation for model/observation matchup.
- Keep the frontend independent of source-specific NetCDF structures.

---

# 3. Important Scope Definition

Do **not** claim:

> "The parser supports every NetCDF file."

Instead define support around an explicit **Ocean Data Contract**.

### Level 1 — Directly Supported

- CF-compatible rectilinear ocean model grids
- Argo profile datasets
- Standard glider profile datasets
- CTD/profile datasets with recognizable metadata

### Level 2 — Transformable

- `0–360°` longitude
- `-180–180°` longitude
- Positive or negative depth
- Different dimension names
- Different dimension ordering
- Different temperature units
- Pressure-based vertical coordinates
- Different variable names

### Level 3 — Regridding Required

- Curvilinear grids
- Staggered U/V grids

### Level 4 — Advanced

- Sigma coordinates
- S-coordinates
- Unstructured ocean meshes
- Complex projected grids

Unsupported datasets should produce a clear validation/error report rather than being silently converted incorrectly.

---

# 4. Canonical Data Contract

The canonical schema is the most important part of the architecture.

The frontend should never depend on original variable names such as:

```text
thetao
T_ANALYZED
TEMP
votemper
```

All of these should become:

```text
temperature
```

---

## 4.1 Canonical Gridded Model Dataset

Internally, every normalized model dataset should follow:

```text
Dimensions:
    time
    depth
    lat
    lon

Coordinates:
    time        datetime64
    depth       meters, positive downward
    lat         degrees north, ascending
    lon         canonical longitude convention

Variables:
    temperature(time, depth, lat, lon)
    salinity(time, depth, lat, lon)
    u(time, depth, lat, lon)     optional
    v(time, depth, lat, lon)     optional
```

### Mandatory dimension order

```text
(time, depth, lat, lon)
```

Even if the source uses:

```text
(depth, latitude, longitude, time)
```

or:

```text
(time, z, y, x)
```

the normalized dataset must become:

```text
(time, depth, lat, lon)
```

---

## 4.2 Required Coordinates

### Latitude

Canonical:

```text
name: lat
units: degrees_north
dimension: 1D
order: ascending
range: -90 to +90
```

### Longitude

Canonical:

```text
name: lon
units: degrees_east
dimension: 1D
order: ascending
```

Choose one canonical longitude convention.

Recommended:

```text
-180° to +180°
```

### Depth

Canonical:

```text
name: depth
units: meters
positive: down
order: ascending
```

Example:

```text
0
10
20
50
100
200
500
1000
```

### Time

Canonical:

```text
name: time
type: datetime64 / timezone-aware UTC representation
```

Prefer UTC internally.

---

# 5. Canonical Variables

## 5.1 Temperature

Canonical name:

```text
temperature
```

Preferred semantic meaning:

```text
sea-water temperature / potential temperature
```

depending on the source.

Canonical display unit:

```text
°C
```

Retain the original quantity and metadata.

---

## 5.2 Salinity

Canonical name:

```text
salinity
```

Do not blindly assume every salinity variable is scientifically identical.

Possible source types include:

- Practical salinity
- Absolute salinity
- Model salinity

Preserve:

```text
source_standard_name
source_units
salinity_type
```

when available.

---

## 5.3 Ocean Currents

Canonical:

```text
u
v
```

Where:

```text
u = eastward velocity
v = northward velocity
```

Canonical unit:

```text
m/s
```

These are optional but strongly recommended for 3D ocean visualization.

---

# 6. Canonical Observation Schema

Do not force Argo/glider/CTD profiles into the same 4D model cube.

Use a profile-oriented schema.

```text
Profile
├── platform_id
├── cycle
├── time
├── latitude
├── longitude
├── depth[]
├── temperature[]
├── salinity[]
├── temperature_qc[]
└── salinity_qc[]
```

Example:

```json
{
  "platform_id": "6902913",
  "cycle": 47,
  "time": "2026-08-20T08:32:00Z",
  "location": {
    "lat": 17.42,
    "lon": 84.73
  },
  "profile": [
    {
      "depth": 5.2,
      "temperature": 28.17,
      "salinity": 34.61,
      "temp_qc": 1,
      "salinity_qc": 1
    }
  ]
}
```

---

# 7. NetCDF Inspector

Use **xarray** as the primary high-level parser.

Do not implement the NetCDF binary format yourself.

Basic ingestion:

```python
import xarray as xr

ds = xr.open_dataset(
    path,
    decode_cf=True,
    mask_and_scale=True
)
```

The inspector should collect:

```text
Dataset metadata
├── dimensions
├── coordinates
├── variables
├── variable shapes
├── variable dimensions
├── units
├── standard_name
├── long_name
├── axis
├── positive
├── missing_value
├── _FillValue
├── valid_min
├── valid_max
├── valid_range
└── global attributes
```

Example inspection:

```python
for name, var in ds.variables.items():
    print(
        name,
        var.dims,
        var.shape,
        var.attrs.get("standard_name"),
        var.attrs.get("long_name"),
        var.attrs.get("units")
    )
```

---

# 8. Dataset Type Detection

The ingestion pipeline should classify incoming files before choosing the normalization strategy.

Possible types:

```text
GRIDDED_MODEL
ARGO_PROFILE
GLIDER_PROFILE
CTD_PROFILE
TRAJECTORY
UNKNOWN
```

Example logic:

```python
def detect_dataset_type(ds):

    variables = set(ds.variables)

    if {
        "PLATFORM_NUMBER",
        "CYCLE_NUMBER",
        "JULD",
        "PRES"
    }.issubset(variables):
        return "ARGO_PROFILE"

    if detect_latitude(ds) and detect_longitude(ds):
        if detect_temperature(ds) or detect_salinity(ds):
            return "GRIDDED_MODEL"

    return "UNKNOWN"
```

This should eventually be replaced/extended with a more robust adapter registry.

---

# 9. Variable Resolution

Do not identify variables only by name.

Use the following priority:

```text
1. CF standard_name
2. axis attribute
3. units
4. long_name
5. configured aliases
6. structural inference
```

For example, latitude could be detected through:

```text
standard_name = latitude
```

or:

```text
axis = Y
```

or:

```text
units = degrees_north
```

or fallback names:

```text
lat
latitude
LATITUDE
nav_lat
```

This makes the parser much more robust.

---

# 10. Variable Alias Registry

Maintain aliases in configuration/code rather than scattering string checks throughout the parser.

Example:

```python
ALIASES = {

    "lat": [
        "lat",
        "latitude",
        "nav_lat",
        "LATITUDE",
        "yt_ocean"
    ],

    "lon": [
        "lon",
        "longitude",
        "nav_lon",
        "LONGITUDE",
        "xt_ocean"
    ],

    "depth": [
        "depth",
        "deptht",
        "lev",
        "level",
        "z",
        "DEPTH"
    ],

    "time": [
        "time",
        "TIME",
        "datetime"
    ],

    "temperature": [
        "temperature",
        "temp",
        "TEMP",
        "thetao",
        "T_ANALYZED",
        "votemper",
        "water_temp"
    ],

    "salinity": [
        "salinity",
        "salt",
        "PSAL",
        "so",
        "S_ANALYZED",
        "vosaline"
    ],

    "u": [
        "u",
        "uo",
        "U",
        "water_u",
        "eastward_velocity"
    ],

    "v": [
        "v",
        "vo",
        "V",
        "water_v",
        "northward_velocity"
    ]
}
```

Aliases should be fallback logic, not the main detection method.

---

# 11. Adapter Architecture

Avoid building one giant parser.

Use adapters.

```text
ocean_ingestion/
│
├── inspector.py
├── detector.py
│
├── registry/
│   ├── coordinates.py
│   ├── variables.py
│   └── units.py
│
├── adapters/
│   ├── base.py
│   ├── generic_cf.py
│   ├── argo.py
│   ├── glider.py
│   └── ctd.py
│
├── normalization/
│   ├── coordinates.py
│   ├── dimensions.py
│   ├── units.py
│   ├── missing_values.py
│   └── qc.py
│
├── validators/
│   ├── model_validator.py
│   └── profile_validator.py
│
├── schemas/
│   ├── model.py
│   └── observation.py
│
├── storage/
│   └── zarr_store.py
│
└── services/
    ├── interpolation.py
    └── matchup.py
```

Base interface:

```python
class NetCDFAdapter:

    def can_handle(self, ds):
        raise NotImplementedError

    def normalize(self, ds):
        raise NotImplementedError
```

Example:

```python
class ArgoAdapter(NetCDFAdapter):
    ...

class GenericCFGridAdapter(NetCDFAdapter):
    ...

class GliderAdapter(NetCDFAdapter):
    ...
```

Processing:

```python
for adapter in adapters:

    if adapter.can_handle(ds):
        canonical = adapter.normalize(ds)
        break
else:
    raise UnsupportedDatasetError(...)
```

This makes future data-source support modular.

---

# 12. Coordinate Normalization

## 12.1 Latitude

Incoming:

```text
20
19
18
17
```

Normalize:

```python
ds = ds.sortby("lat")
```

Result:

```text
17
18
19
20
```

---

## 12.2 Longitude

Datasets commonly use:

```text
-180 → +180
```

or:

```text
0 → 360
```

Choose one canonical representation.

Recommended:

```text
-180 → +180
```

Example conversion:

```python
ds = ds.assign_coords(
    lon=((ds.lon + 180) % 360) - 180
)

ds = ds.sortby("lon")
```

---

## 12.3 Depth

Input may be:

```text
0
10
20
100
```

or:

```text
0
-10
-20
-100
```

Use metadata such as:

```text
positive = "down"
positive = "up"
```

to determine orientation.

Canonical:

```text
positive downward
```

Then:

```python
ds = ds.sortby("depth")
```

---

# 13. Pressure vs Depth

This is an important scientific distinction.

Argo typically provides:

```text
PRES
```

which represents pressure, generally in decibars, rather than direct depth in meters.

Do not blindly treat pressure as depth in a production scientific system.

For conversion, use an oceanographic library such as GSW/TEOS-10.

Conceptually:

```python
import gsw

z = gsw.z_from_p(
    pressure,
    latitude
)

depth = -z
```

Canonical representation:

```text
depth = meters, positive downward
```

Retain original pressure:

```text
pressure
```

as optional source information.

---

# 14. Unit Normalization

Never assume units based solely on variable name.

Temperature may be:

```text
K
degC
degree_Celsius
°C
```

Canonical:

```text
°C
```

For Kelvin:

```python
temperature_c = temperature_k - 273.15
```

Velocity:

```text
canonical = m/s
```

Depth:

```text
canonical = meters
```

Salinity requires more care because different salinity definitions are scientifically distinct.

Always preserve source metadata.

---

# 15. Missing-Value Handling

NetCDF datasets can describe missing data through:

```text
_FillValue
missing_value
valid_min
valid_max
valid_range
```

Use:

```python
xr.open_dataset(
    path,
    decode_cf=True,
    mask_and_scale=True
)
```

to let xarray handle much of the standard masking/scaling.

Internally:

```text
missing data → NaN
```

At the API boundary:

```text
NaN → null
```

Do not convert all NaNs to Python `None` throughout the internal processing pipeline.

Recommended:

```text
xarray/internal:
NaN

API/JSON:
null
```

---

# 16. Dimension Normalization

Incoming:

```text
temperature(depth, lat, lon)
```

Canonical:

```text
temperature(time, depth, lat, lon)
```

If time is absent but the dataset has one valid timestamp, create a singleton time dimension:

```python
temperature = temperature.expand_dims(
    time=[timestamp]
)
```

If an appropriate surface field has no depth dimension, decide whether it can safely be represented as:

```text
depth = [0]
```

or should be treated as a separate surface dataset.

Finally:

```python
da = da.transpose(
    "time",
    "depth",
    "lat",
    "lon"
)
```

---

# 17. Argo-Specific Handling

Argo should have a dedicated adapter.

Potential variables include:

```text
PLATFORM_NUMBER
JULD
LATITUDE
LONGITUDE
CYCLE_NUMBER

PRES
TEMP
PSAL

PRES_ADJUSTED
TEMP_ADJUSTED
PSAL_ADJUSTED

PRES_QC
TEMP_QC
PSAL_QC

PROFILE_TEMP_QC
PROFILE_PSAL_QC

DATA_MODE
```

Prefer adjusted values when scientifically appropriate:

```text
TEMP_ADJUSTED
    ↓ fallback
TEMP

PSAL_ADJUSTED
    ↓ fallback
PSAL

PRES_ADJUSTED
    ↓ fallback
PRES
```

Do not discard the original variables.

---

# 18. Quality Control

Support both:

### Profile-level QC

```text
PROFILE_TEMP_QC
PROFILE_PSAL_QC
```

### Measurement-level QC

```text
TEMP_QC
PSAL_QC
PRES_QC
```

Measurement-level QC allows individual bad observations to be rejected without necessarily rejecting the entire profile.

Example:

```text
Depth    TEMP    QC
10m      28.2     1
20m      27.8     1
30m      99.4     4   ← reject
40m      26.9     1
```

Make accepted QC flags configurable.

---

# 19. Validation Layer

After normalization, every dataset must pass validation.

## Model validation

Check:

```text
✓ lat exists
✓ lon exists
✓ depth exists
✓ time exists

✓ temperature or salinity exists

✓ lat is 1D
✓ lon is 1D
✓ coordinates are sorted

✓ depth is positive downward

✓ longitude is canonical

✓ timestamps are decoded

✓ no duplicate coordinates

✓ variable dimensions are compatible

✓ values are within sensible ranges
```

## Observation validation

Check:

```text
✓ platform_id exists
✓ timestamp exists
✓ latitude exists
✓ longitude exists
✓ depth/pressure exists
✓ temperature and/or salinity exists
✓ profile arrays have compatible lengths
✓ QC information is valid when present
```

---

# 20. Validation Result

Return a structured result.

Example:

```json
{
  "valid": true,
  "errors": [],
  "warnings": [
    "No ocean current U component detected",
    "No ocean current V component detected",
    "Depth inferred from pressure",
    "Longitude converted from 0-360 to -180-180"
  ]
}
```

This is valuable for both debugging and the frontend/admin upload UI.

---

# 21. Provenance

Never lose information about the source dataset.

Store:

```json
{
  "source": "INCOIS",
  "filename": "example.nc",
  "adapter": "GenericCFGridAdapter",
  "normalization_version": "1.0",
  "created_at": "2026-08-29T00:00:00Z",
  "warnings": []
}
```

For every normalized variable, optionally preserve:

```json
{
  "canonical_variable": "temperature",
  "source_variable": "thetao",
  "source_units": "degC",
  "source_standard_name": "sea_water_potential_temperature"
}
```

This provides scientific traceability.

---

# 22. Do Not Convert Entire Datasets to JSON

This is one of the most important implementation decisions.

Large model datasets can contain billions of values.

For example:

```text
365 times
× 50 depths
× 1000 latitudes
× 2000 longitudes
```

is:

```text
36.5 billion grid values
```

Do not send the entire dataset to the frontend.

Instead:

```text
Raw NetCDF
     ↓
xarray
     ↓
Normalization
     ↓
Canonical Dataset
     ↓
Zarr / optimized storage
     ↓
Subset Query
     ↓
Small JSON response
     ↓
Cesium
```

JSON should be produced only for the small subset required by the frontend.

---

# 23. Storage Strategy

Recommended conceptual flow:

```text
Incoming NetCDF
      ↓
Canonical xarray Dataset
      ↓
Zarr / optimized chunked storage
      ↓
Query API
```

Zarr is useful for large multidimensional scientific data because the dataset can be chunked and queried without loading the entire file.

The exact storage strategy can be finalized after measuring the expected dataset sizes and deployment environment.

---

# 24. API Integration

Your existing APIs should operate on the canonical dataset.

The frontend should see stable field names.

## `/api/field`

Used for globe visualization.

Possible request:

```text
GET /api/field
?variable=temperature
&time=2026-08-20
&depth=100
&bbox=70,5,90,25
```

Backend:

```python
subset = ds["temperature"].sel(
    time=time,
    depth=depth,
    lat=slice(min_lat, max_lat),
    lon=slice(min_lon, max_lon)
)
```

Only the requested subset is serialized.

---

# 25. `/api/column`

Used for vertical/cutaway profiles.

Example conceptual response:

```json
{
  "lat": 17.4,
  "lon": 83.2,
  "depth": [
    0,
    10,
    20,
    50,
    100,
    200
  ],
  "temperature": [
    29.1,
    28.8,
    27.9,
    24.2,
    18.1,
    13.7
  ]
}
```

Backend can use xarray interpolation:

```python
profile = ds["temperature"].interp(
    lat=request_lat,
    lon=request_lon,
    time=request_time
)
```

---

# 26. `/api/observations`

Should return normalized observation metadata.

Example:

```json
{
  "platform_id": "6902913",
  "time": "2026-08-20T08:32:00Z",
  "lat": 17.42,
  "lon": 84.73,
  "cycle": 47
}
```

The frontend doesn't need to know whether the source was an Argo `_prof.nc` file or another profile format.

---

# 27. `/api/profile/{floatId}`

Return the canonical observation profile:

```json
{
  "platform_id": "6902913",
  "cycle": 47,
  "time": "2026-08-20T08:32:00Z",
  "depth": [],
  "temperature": [],
  "salinity": [],
  "temperature_qc": [],
  "salinity_qc": []
}
```

---

# 28. Matchup Architecture

Do not put model-vs-observation matchup logic inside the NetCDF parser.

Separate the responsibilities:

```text
                    RAW DATA

             ┌───────────────┐
             │ Model NetCDF  │
             └───────┬───────┘
                     ▼
             Canonical Model
                     │
                     │
             ┌───────┴───────┐
             │               │
             ▼               ▼
       Query Engine      Matchup Engine
                             ▲
                             │
             Canonical Observation
                     ▲
                     │
             ┌───────┴───────┐
             │ Argo / Glider │
             └───────────────┘
```

The Matchup Engine receives:

```text
latitude
longitude
depth
time
```

and retrieves model values at those coordinates.

---

# 29. Interpolation

The requirement mentions nearest-neighbor and bilinear interpolation.

Use xarray's interpolation facilities as the initial implementation.

Possible methods:

```python
method="nearest"
```

or:

```python
method="linear"
```

For multidimensional matchup, interpolation may occur over:

```text
latitude
longitude
depth
time
```

A practical initial strategy:

```text
latitude/longitude → linear
depth              → linear
time               → nearest
```

This should be treated as an implementation choice to validate against the characteristics of the model data.

For scientific production use, document the interpolation method and test its effect on matchup errors.

---

# 30. Curvilinear Grid Detection

This is a major edge case.

Your current frontend requirements assume:

```text
lat(lat)
lon(lon)
```

But real ocean models may use:

```text
lat(y, x)
lon(y, x)
```

Example:

```text
temperature(time, depth, y, x)
lat(y, x)
lon(y, x)
```

This is a **curvilinear grid**.

Do not incorrectly rename:

```text
y → lat
x → lon
```

Instead detect:

```text
grid_type =
    RECTILINEAR
    CURVILINEAR
    UNSTRUCTURED
```

Recommended V1:

```text
RECTILINEAR
    → native canonical support

CURVILINEAR
    → regrid to canonical rectilinear grid

UNSTRUCTURED
    → unsupported initially / dedicated adapter later
```

---

# 31. Sigma and S-Coordinates

Some ocean models do not store fixed physical depths.

They may use:

```text
ocean_sigma_coordinate
ocean_s_coordinate
```

The actual depth can vary spatially and/or temporally.

The parser must detect these coordinate systems rather than pretending the sigma values are meters.

Possible handling:

```text
Sigma/S-coordinate
       ↓
Compute physical depth
       ↓
Canonical depth in meters
```

or:

```text
Unsupported vertical coordinate
       ↓
Validation error
```

Do not silently produce scientifically incorrect depth values.

---

# 32. Staggered U/V Grids

Ocean model current fields may be stored on different grids:

```text
Temperature → T grid
U           → U grid
V           → V grid
```

For V1:

```text
If dimensions align:
    accept U/V directly

If staggered:
    interpolate/regrid U/V onto canonical T grid
```

This allows the frontend to visualize currents consistently.

---

# 33. End-to-End Example

Imagine an incoming file:

```text
Dimensions:
    TIME = 10
    DEPTH_LEVEL = 20
    LATITUDE = 100
    LONGITUDE = 200

Variables:
    TEMP_OCEAN(TIME, DEPTH_LEVEL, LATITUDE, LONGITUDE)
    SALT_OCEAN(TIME, DEPTH_LEVEL, LATITUDE, LONGITUDE)
```

Characteristics:

```text
Longitude:
    0 → 359

Depth:
    0 → -5000

Temperature:
    Kelvin

Missing value:
    1e20
```

The system detects:

```text
LATITUDE     → lat
LONGITUDE    → lon
DEPTH_LEVEL  → depth
TIME         → time

TEMP_OCEAN   → temperature
SALT_OCEAN   → salinity
```

Then normalizes:

```text
longitude:
0–360
   ↓
-180–180

depth:
negative
   ↓
positive downward

temperature:
Kelvin
   ↓
°C

1e20:
   ↓
NaN

dimensions:
(time, depth, lat, lon)
```

The frontend receives the same canonical API representation as it would for another source dataset.

---

# 34. Recommended Project Structure

A practical backend structure:

```text
backend/
│
├── app/
│   ├── main.py
│   │
│   ├── api/
│   │   ├── field.py
│   │   ├── column.py
│   │   ├── observations.py
│   │   ├── profiles.py
│   │   └── matchup.py
│   │
│   ├── ingestion/
│   │   ├── inspector.py
│   │   ├── detector.py
│   │   ├── pipeline.py
│   │   │
│   │   ├── adapters/
│   │   │   ├── base.py
│   │   │   ├── generic_cf.py
│   │   │   ├── argo.py
│   │   │   ├── glider.py
│   │   │   └── ctd.py
│   │   │
│   │   ├── normalization/
│   │   │   ├── coordinates.py
│   │   │   ├── dimensions.py
│   │   │   ├── units.py
│   │   │   ├── missing_values.py
│   │   │   └── qc.py
│   │   │
│   │   ├── registry/
│   │   │   ├── variables.py
│   │   │   ├── coordinates.py
│   │   │   └── units.py
│   │   │
│   │   └── validators/
│   │       ├── model.py
│   │       └── observation.py
│   │
│   ├── schemas/
│   │   ├── model.py
│   │   └── observation.py
│   │
│   ├── storage/
│   │   └── zarr.py
│   │
│   └── services/
│       ├── interpolation.py
│       └── matchup.py
│
└── tests/
    ├── fixtures/
    │   ├── model/
    │   ├── argo/
    │   └── glider/
    │
    ├── test_detector.py
    ├── test_variables.py
    ├── test_coordinates.py
    ├── test_units.py
    ├── test_argo.py
    ├── test_validation.py
    └── test_matchup.py
```

---

# 35. Implementation Phases

## Phase 1 — Canonical Schema

Define:

```text
CanonicalModelDataset
CanonicalObservationProfile
```

Decide:

- Variable names
- Dimension names
- Dimension ordering
- Units
- Longitude convention
- Depth convention
- Time convention
- Metadata/provenance structure

**Do this before writing the parser.**

---

## Phase 2 — NetCDF Inspector

Implement:

```text
inspect(file)
```

Output:

```text
dimensions
coordinates
variables
attributes
units
standard_name
shapes
```

Make this tool useful independently for debugging unknown datasets.

---

## Phase 3 — Generic CF Adapter

Support:

```text
1D lat
1D lon
1D depth
1D time

temperature
salinity
u
v
```

Implement:

- CF metadata detection
- Alias fallback
- Dimension normalization
- Unit normalization
- Missing-value handling
- Coordinate sorting

This becomes your main model adapter.

---

## Phase 4 — Argo Adapter

Implement:

- Platform ID
- Cycle number
- JULD
- Latitude
- Longitude
- Pressure
- Temperature
- Salinity
- Adjusted variables
- QC
- Pressure → depth conversion

Output canonical profiles.

---

## Phase 5 — Validation

Build:

```text
ModelValidator
ObservationValidator
```

Return:

```text
valid
errors[]
warnings[]
```

Do not allow invalid datasets into the storage layer.

---

## Phase 6 — Storage

Add:

```text
Canonical Dataset
       ↓
Chunked storage
       ↓
Dataset registry
```

Evaluate Zarr for large multidimensional datasets.

---

## Phase 7 — API

Connect canonical data to:

```text
/api/field
/api/column
/api/observations
/api/profile/{floatId}
/api/cycles/{floatId}
/api/matchup/{floatId}
```

The API should never need source-specific variable names.

---

## Phase 8 — Interpolation

Implement:

```text
nearest
linear
```

Then build:

```text
ModelInterpolator
```

which accepts:

```text
lat
lon
depth
time
```

and returns model values.

---

## Phase 9 — Matchup Engine

Implement:

```text
Observation
    +
ModelInterpolator
    ↓
Matchup
    ↓
Observed - Model
```

Return:

```text
observed
model
delta
coordinates
time
```

---

## Phase 10 — Advanced Dataset Support

After the base pipeline is stable, add:

```text
Curvilinear grids
Sigma coordinates
S-coordinates
Staggered U/V grids
More model-specific adapters
Unstructured grids
```

Do not implement these before the canonical pipeline is stable.

---

# 36. Testing Strategy

Create a test fixture library containing deliberately different datasets.

### Dataset A

```text
lat
lon
depth
time
thetao
so
```

### Dataset B

```text
latitude
longitude
lev
TIME
TEMP
SALINITY
```

### Dataset C

```text
0–360 longitude
negative depth
temperature in Kelvin
```

### Dataset D

```text
Argo _prof.nc
```

### Dataset E

```text
Missing values
```

### Dataset F

```text
Reversed latitude
```

### Dataset G

```text
Reversed depth
```

### Dataset H

```text
Curvilinear grid
```

### Dataset I

```text
Unsupported sigma coordinate
```

Each fixture should have an expected normalized result.

---

# 37. Acceptance Criteria

The parser is ready for V1 when:

### Model

- [ ] Different coordinate names are recognized.
- [ ] Different variable names are recognized.
- [ ] CF metadata is preferred over aliases.
- [ ] Latitude is normalized and sorted.
- [ ] Longitude is normalized and sorted.
- [ ] Depth is positive downward.
- [ ] Time is decoded to UTC-compatible representation.
- [ ] Temperature is normalized to °C.
- [ ] Velocity is normalized to m/s.
- [ ] Fill values become NaN internally.
- [ ] Variables have canonical names.
- [ ] Dimensions are canonical.
- [ ] Invalid datasets are rejected with useful errors.

### Observation

- [ ] Argo platform ID is extracted.
- [ ] Cycle number is extracted.
- [ ] Profile time is extracted.
- [ ] Position is extracted.
- [ ] Pressure is extracted.
- [ ] Depth can be derived.
- [ ] Temperature is extracted.
- [ ] Salinity is extracted.
- [ ] Adjusted variables are supported.
- [ ] QC flags are retained.
- [ ] Bad observations can be filtered.

### API

- [ ] `/field` works without knowing source variable names.
- [ ] `/column` works on canonical data.
- [ ] `/observations` works on canonical profiles.
- [ ] `/profile` works on canonical profiles.
- [ ] `/matchup` uses the interpolation service.
- [ ] Large datasets are subsetted instead of fully serialized.

---

# 38. Important Design Principles

## Principle 1 — Normalize once

Do not repeatedly convert data inside every API endpoint.

```text
RAW
 ↓
NORMALIZE
 ↓
STORE
 ↓
QUERY
```

---

## Principle 2 — Frontend should not know source formats

The frontend should never contain:

```text
if thetao
if T_ANALYZED
if votemper
if TEMP
```

All source-specific logic belongs in ingestion.

---

## Principle 3 — Metadata first, aliases second

Prefer:

```text
CF metadata
```

over:

```text
variable name guessing
```

---

## Principle 4 — Preserve provenance

Never destroy source information during normalization.

---

## Principle 5 — Separate parsing from scientific operations

Keep these separate:

```text
Parser
Normalization
Validation
Storage
Interpolation
Matchup
Visualization API
```

---

## Principle 6 — Never silently guess scientifically important information

If depth cannot be reliably determined:

```text
ERROR / WARNING
```

not:

```text
assume something and continue
```

---

## Principle 7 — Optimize for subset queries

The frontend normally needs:

```text
small region
specific depth
specific time
specific profile
```

not the entire ocean model.

---

# 39. Final Target Architecture

The final architecture should look like:

```text
┌─────────────────────────────────────────────────────────┐
│                    DATA SOURCES                         │
│                                                         │
│  INCOIS    Argo    Glider    CTD    Other Ocean Models │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│               NETCDF HARMONIZATION LAYER                │
│                                                         │
│  Inspector                                              │
│      ↓                                                  │
│  Dataset Detector                                       │
│      ↓                                                  │
│  Variable / Coordinate Resolver                         │
│      ↓                                                  │
│  Adapter                                                │
│      ↓                                                  │
│  Dimension Normalizer                                   │
│      ↓                                                  │
│  Unit Normalizer                                        │
│      ↓                                                  │
│  Coordinate Normalizer                                  │
│      ↓                                                  │
│  Missing Value + QC Processor                           │
│      ↓                                                  │
│  Validator                                              │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│                  CANONICAL DATA LAYER                   │
│                                                         │
│  Model Dataset                                          │
│  (time, depth, lat, lon)                                │
│                                                         │
│  Observation Profiles                                   │
│  (platform, cycle, time, location, depth, variables)   │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│                    STORAGE LAYER                        │
│                                                         │
│              Chunked / Zarr Dataset                     │
│                  + Metadata                             │
│                  + Provenance                           │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│                    DATA SERVICES                        │
│                                                         │
│  Subset Query    Interpolation    Matchup    Profiles   │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│                         API                             │
│                                                         │
│ /field  /column  /observations  /profile  /matchup     │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│                 CESIUM / FRONTEND                       │
│                                                         │
│  Globe • Depth Slider • Time Slider • Profiles          │
│  Currents • Observations • Model vs Actual              │
└─────────────────────────────────────────────────────────┘
```

---

# 40. Recommended V1 Scope

Do **not** try to implement everything immediately.

Build this first:

```text
V1
│
├── xarray ingestion
├── NetCDF inspector
├── Generic CF model adapter
├── Argo adapter
├── Variable alias registry
├── Coordinate normalization
├── Unit normalization
├── Missing-value handling
├── Argo QC
├── Canonical model schema
├── Canonical observation schema
├── Validation
├── Zarr/chunked storage
├── Subset API
└── xarray interpolation
```

Then:

```text
V2
│
├── Glider
├── CTD
├── Curvilinear grids
├── Regridding
└── Better dataset discovery
```

Then:

```text
V3
│
├── Sigma coordinates
├── Staggered grids
├── Unstructured meshes
├── Advanced interpolation
└── Larger-scale optimization
```

---

# 41. The Core Engineering Idea

The most important architectural decision can be summarized as:

```text
                HETEROGENEOUS WORLD
                       │
                       │
                       ▼
              ┌─────────────────┐
              │ NETCDF          │
              │ HARMONIZER      │
              └────────┬────────┘
                       │
                       ▼
              ┌─────────────────┐
              │ CANONICAL       │
              │ OCEAN DATA      │
              │ CONTRACT        │
              └────────┬────────┘
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
       Frontend     Matchup      Analytics
```

Your innovation is therefore not simply:

> "We parse NetCDF files."

It is:

> **A metadata-aware oceanographic data harmonization engine that converts heterogeneous numerical-model and in-situ observation datasets into a canonical representation suitable for scalable querying, interpolation, model-observation matchup, and interactive 3D visualization.**

That canonical layer should become the **base data layer of the Digital Ocean Twin**.

---

# 42. Suggested Technology Stack

| Layer | Recommended Technology |
|---|---|
| NetCDF parsing | xarray |
| NetCDF backend | netCDF4 / h5netcdf as required |
| Scientific arrays | NumPy |
| Unit handling | Pint / custom controlled conversions |
| Oceanographic calculations | GSW / TEOS-10 |
| Data validation | Pydantic + custom validators |
| Chunked storage | Zarr |
| API | FastAPI |
| Interpolation | xarray / SciPy where appropriate |
| Matchup | Custom service using canonical datasets |
| Frontend | Existing Next.js / Cesium architecture |
| Visualization | CesiumJS |
| Metadata | JSON + NetCDF/CF metadata preservation |

---

# 43. Final Implementation Rule

When adding a new dataset source, the desired workflow should be:

```text
New Dataset
    ↓
Inspect
    ↓
Does existing Generic CF Adapter handle it?
    │
    ├── YES → Normalize → Validate → Store
    │
    └── NO
          ↓
     Create Adapter
          ↓
     Map variables
          ↓
     Normalize
          ↓
     Validate
          ↓
        Store
```

**Never modify the frontend just because a new NetCDF source uses different variable names.**

If the canonical contract remains stable, the rest of the Digital Ocean Twin remains stable.

---

# 44. First Implementation Checklist

Start implementation in this order:

- [ ] Create `canonical_model.py`
- [ ] Create `canonical_observation.py`
- [ ] Create NetCDF inspector
- [ ] Create CF metadata resolver
- [ ] Create variable alias registry
- [ ] Create generic model adapter
- [ ] Implement latitude normalization
- [ ] Implement longitude normalization
- [ ] Implement depth normalization
- [ ] Implement time normalization
- [ ] Implement temperature normalization
- [ ] Implement salinity normalization
- [ ] Implement current normalization
- [ ] Implement missing-value handling
- [ ] Create model validator
- [ ] Create Argo adapter
- [ ] Implement adjusted-variable selection
- [ ] Implement Argo QC
- [ ] Implement pressure-to-depth conversion
- [ ] Create observation validator
- [ ] Add test NetCDF fixtures
- [ ] Add canonical dataset tests
- [ ] Add Zarr storage
- [ ] Connect `/api/field`
- [ ] Connect `/api/column`
- [ ] Connect observation APIs
- [ ] Implement interpolation service
- [ ] Implement matchup service
- [ ] Test model-vs-observation workflow
- [ ] Connect frontend
- [ ] Add progressive/subset loading

---

## Definition of Done

The base layer is complete when you can take **multiple structurally different but supported NetCDF datasets**, run them through the same ingestion pipeline, and have them emerge with:

```text
same coordinate names
same dimension names
same dimension ordering
same canonical units
same missing-value behavior
same variable names
same API contract
```

At that point, the frontend is genuinely **data-source agnostic**, and the ingestion layer has become a reusable foundation for the Digital Ocean Twin.
