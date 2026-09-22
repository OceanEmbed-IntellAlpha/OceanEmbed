# OceanEmbed — Complete Structured Project Description

## SIH 2026 | Problem Statement 26066

> **OceanEmbed — Satellite Embedding-Based Deep Learning Framework for Reconstruction of Subsurface Ocean Temperature from Surface Satellite Observations**

This document combines the official SIH 2026 Problem Statement 26066 details supplied for the project with the project solution, architecture, prototype, feasibility, impacts, and research material presented in the team's SIH submission PPT.

---

# 1. Official Problem Statement

| Field | Details |
|---|---|
| **Problem Statement ID** | **26066** |
| **Problem Statement Title** | **OceanEmbed - Satellite Embedding-Based Deep Learning Framework for Reconstruction of Subsurface Ocean Temperature from Surface Satellite Observations.** |
| **Organization** | Ministry of Earth Sciences (MoES) |
| **Department** | Indian National Centre for Ocean Information Services (**INCOIS**) |
| **Category** | Software |
| **Theme** | Disaster Management |
| **Target Region** | **North Indian Ocean: 5°N–30°N, 45°E–105°E** |
| **Target Spatial Resolution** | **0.25° × 0.25°** |
| **Target Temporal Resolution** | **Daily** |
| **Expected Proof of Concept** | **Bay of Bengal / Arabian Sea** |
| **Primary Objective** | Reconstruct depth-wise subsurface ocean temperature using surface satellite observations |

The SIH submission PPT identifies this as Problem Statement 26066 under the Disaster Management theme and Software category.

---

# 2. Problem Background

## The fundamental problem

Subsurface ocean temperature is a fundamental variable for understanding:

- Ocean circulation
- Upper-ocean heat content
- Stratification
- Climate variability
- Air-sea interaction
- Marine ecosystems
- Marine heatwaves
- Fisheries
- Data assimilation

However, direct measurements of subsurface temperature remain sparse because they primarily depend on in-situ observing systems such as:

- ARGO profiling floats
- Moored buoys
- Gliders
- Ship observations

These observations provide valuable vertical information, but their spatial and temporal coverage is insufficient for generating continuous, basin-scale subsurface fields.

The core problem can therefore be expressed as:

> **How can we estimate the subsurface temperature structure of the ocean continuously over large regions using surface observations that are much more widely available?**

---

# 3. Why Satellite Data Can Help

Satellites provide continuous, large-scale monitoring of surface ocean conditions at relatively high spatial and temporal resolution.

The official problem statement identifies these surface variables as inputs:

1. **Sea Surface Temperature (SST)**
2. **Sea Surface Salinity (SSS)**
3. **Sea Surface Height (SSH) / Sea Level Anomaly (SLA)**
4. **Surface ocean currents (U, V)**
5. **Surface winds (U, V)**

These variables contain indirect information about subsurface ocean processes through physical mechanisms such as:

- Thermocline displacement
- Mesoscale eddies
- Vertical mixing
- Transport
- Ocean-atmosphere coupling

The key idea is that the surface is not independent of the water column below it. Surface patterns contain signals that can be learned by a sufficiently expressive model and related to subsurface thermal structure.

---

# 4. Core Idea of OceanEmbed

OceanEmbed attempts to learn the relationship:

```text
Surface Ocean Observations
            ↓
        Deep Learning
            ↓
   Latent Ocean Embedding
            ↓
   Depth-Aware Reconstruction
            ↓
Subsurface Temperature Profile
```

Instead of predicting only one temperature value, the system reconstructs a **vertical temperature profile across 15 standard depths**.

The project calls the transformation from surface observations to the underwater profile **Satellite-to-Subsurface Reconstruction** and emphasizes **Depth-Aware Deep Learning Embeddings**.

---

# 5. Exact Geographic Scope

OceanEmbed is specifically designed for the **North Indian Ocean**:

- **Latitude:** 5°N to 30°N
- **Longitude:** 45°E to 105°E

This covers major areas including the:

- Arabian Sea
- Bay of Bengal
- Surrounding North Indian Ocean

The project PPT also explicitly highlights the North Indian Ocean focus in its comparison and research sections.

---

# 6. Required Data Resolution

All input datasets should ultimately be standardized to:

### Spatial Resolution

**0.25° × 0.25°**

### Temporal Resolution

**Daily**

This is important because the recommended datasets do not all have the same native resolution. The preprocessing layer therefore needs to perform the necessary:

- Spatial interpolation
- Temporal interpolation/resampling
- Regridding
- Co-registration
- Normalization

The official problem statement allows the team to select an openly available product and perform appropriate interpolation/regridding if a dataset is not directly available at the required resolution.

---

# 7. Recommended Training Input Datasets

| Variable | Product / Dataset | Native Resolution | Role |
|---|---|---:|---|
| **SST** | OSTIA | 0.05°, Daily | Surface temperature |
| **SSS** | SMAP / SMOS | 0.125°, Daily | Surface salinity |
| **SSH / SLA** | DUACS | 0.25°, Daily | Sea-level information |
| **Currents** | OSCAR L4 | 0.25°, Daily | Surface U/V currents |
| **Winds** | ASCAT / CCMP Winds | Product dependent; 0.25° daily source referenced | Surface U/V winds |

Recommended references supplied in the problem statement:

- SST (OSTIA): https://doi.org/10.48670/moi-00168
- SSS (SMAP / SMOS): https://doi.org/10.48670/moi-00051
- SSH (DUACS): https://doi.org/10.48670/moi-00145
- Currents (OSCAR L4): https://podaac.jpl.nasa.gov/dataset/OSCAR_L4_OC_FINAL_V2.0
- Winds (ASCAT Coastal): https://podaac.jpl.nasa.gov/dataset/ASCATC-L2-Coastal
- Winds (CCMP): https://podaac.jpl.nasa.gov/dataset/CCMP_WINDS_10M6HR_L4_V3.1

After harmonization, the model should receive a consistent daily 0.25° × 0.25° representation over the target region.

---

# 8. Training Target Dataset

## GLORYS Global Ocean Reanalysis

The official problem statement specifies **GLORYS Global Ocean Reanalysis** as the training target dataset.

Reference:

https://doi.org/10.48670/moi-00021

### Target variable

**Temperature**

Conceptually:

```text
Satellite Inputs
SST
SSS
SSH / SLA
Currents
Winds
      │
      ▼
     MODEL
      │
      ▼
Predicted Temperature
at 15 Depth Levels
      ↑
      │
Training Target
GLORYS Temperature
```

---

# 9. Standard Depth Levels

The official problem statement specifies 15 standard depths:

| Level | Depth (m) |
|---:|---:|
| 1 | **0** |
| 2 | **5** |
| 3 | **10** |
| 4 | **20** |
| 5 | **30** |
| 6 | **50** |
| 7 | **75** |
| 8 | **100** |
| 9 | **125** |
| 10 | **150** |
| 11 | **200** |
| 12 | **300** |
| 13 | **500** |
| 14 | **700** |
| 15 | **1000** |

The submitted PPT also describes the system as reconstructing high-resolution ocean temperature profiles across 15 depth levels, approximately spanning 0–1000 m.

---

# 10. Training vs Validation Data

This distinction is critical.

## Training Target

**GLORYS** provides the subsurface temperature target used for model development/training.

## Independent Validation

**ARGO observations** provide independent in-situ observations used to assess how well the reconstructed temperature profiles agree with real observations.

The conceptual flow is:

```text
             TRAINING
Satellite ──────────────→ Model ←──── GLORYS

             VALIDATION
Satellite → Model → Prediction
                    ↓
               Compare with
                    ↑
                  ARGO
```

The project PPT explicitly describes comparison of reconstructed profiles against independent ARGO observations and refers to independent, unassimilated float observations.

---

# 11. In-Situ Observation Dataset

The problem statement specifies:

- **Gridded ARGO**
- **INCOIS Live Access Server (LAS) – Gridded ARGO**

These are intended primarily for independent evaluation/validation of the reconstruction.

---

# 12. Complete End-to-End Data Pipeline

```text
                    DATA SOURCES
                         │
       ┌─────────────────┼─────────────────┐
       ↓                 ↓                 ↓
      SST               SSS              SSH/SLA
       ↓                 ↓                 ↓
    Currents           Winds              ...
       └─────────────────┼─────────────────┘
                         ↓
             DATA INGESTION PIPELINE
                         ↓
              NetCDF / Zarr Reading
                         ↓
              Quality Control / Cleaning
                         ↓
              Missing Data Handling
                         ↓
               Spatial Regridding
                         ↓
               Temporal Resampling
                         ↓
               Coordinate Alignment
                         ↓
                 Normalization
                         ↓
           0.25° × 0.25° / Daily Grid
                         ↓
          ┌───────────────────────────┐
          │ Satellite Embedding Engine│
          └─────────────┬─────────────┘
                        ↓
             LATENT OCEAN EMBEDDING
                        ↓
              Depth-Aware Decoder
                        ↓
       ┌────────────────────────────────┐
       │ 15-Level Temperature Profile  │
       └───────────────┬────────────────┘
                       ↓
                   Prediction
                       ↓
               Validation Engine
                       ↑
                    ARGO Data
                       ↓
              RMSE / Bias / Correlation
                       ↓
               Visualization Platform
```

---

# 13. Stage 1 — Data Ingestion

The platform receives large multidimensional ocean datasets.

Typical formats include:

- NetCDF
- Zarr

Common dimensions may include:

```text
Time
Latitude
Longitude
Depth
Variable
```

Example conceptual structures:

```text
SST[time, lat, lon]

SSH[time, lat, lon]

Temperature[time, depth, lat, lon]
```

The PPT proposes **Xarray** for multidimensional scientific-data handling and **Zarr** for scalable chunked storage.

---

# 14. Stage 2 — Data Harmonization

Different datasets may have:

- Different spatial resolutions
- Different temporal frequencies
- Different coordinate systems
- Missing values
- Different units
- Different spatial grids

They must be converted into a common representation.

### Final standardized representation

```text
Latitude   → 0.25° grid
Longitude  → 0.25° grid
Time       → Daily
Variables  → SST, SSS, SSH/SLA, U/V currents, U/V winds
```

The harmonization layer is one of the key engineering components of the solution.

---

# 15. Stage 3 — Satellite Embedding

This is where **OceanEmbed** gets its name.

The system takes multiple surface variables and learns a compact representation:

```text
SST ──────┐
SSS ──────┤
SSH/SLA ──┤
Currents ─┤──→ Encoder → Ocean Embedding
Winds ────┘
```

The embedding is intended to capture useful spatial-temporal patterns in the surface ocean state that can then be used to reconstruct the subsurface temperature profile.

The PPT describes these as learned latent ocean representations capturing spatial-temporal patterns.

---

# 16. Possible Embedding Architectures

The official problem statement does **not** require one specific architecture. It lists possible approaches including:

- Convolutional Neural Networks (**CNN**)
- Vision Transformers (**ViT**)
- Autoencoders
- Graph Neural Networks (**GNN**)
- Attention-based hybrid architectures

The project can therefore experiment with multiple approaches before selecting an architecture appropriate for the data and available compute.

The PPT's research foundation references spatial-temporal models such as **ConvLSTM** and U-Net-style approaches, so these can also be considered as part of the architecture research direction.

---

# 17. Why Spatial + Temporal Learning?

Ocean conditions depend on both:

- Neighboring locations
- Historical observations
- Seasonal patterns
- Moving eddies
- Currents
- Atmospheric forcing

Conceptually:

```text
Day 1 → Day 2 → Day 3 → Day 4
  │       │       │       │
  └──── Spatial + Temporal Pattern ─────┘
```

This is why architectures such as ConvLSTM, temporal attention, or other spatio-temporal models are relevant.

---

# 18. Stage 4 — Depth-Aware Reconstruction

Once the model has learned an ocean embedding, a decoder estimates temperature at every required depth.

```text
                 Ocean Embedding
                       │
                       ▼
              Depth-Aware Decoder
                       │
       ┌───────────────┼───────────────┐
       ↓               ↓               ↓
      0 m            100 m           1000 m
       ↓               ↓               ↓
 Temperature       Temperature     Temperature
```

The term **depth-aware** indicates that the model needs to produce a structured vertical profile rather than a single scalar output.

---

# 19. Stage 5 — Validation

The model output is compared against independent observations.

### Core metrics specified by the problem statement

- **Correlation**
- **RMSE**
- **Bias**

Validation should be examined across:

- Locations
- Time periods
- Depth levels
- Regions such as the Bay of Bengal and Arabian Sea

The project's PPT specifically emphasizes direct comparison of reconstructed profiles against independent ARGO observations across different depths, regions, and time periods.

---

# 20. Stage 6 — Visualization

OceanEmbed is intended to expose model outputs through an interactive web-based visualization platform.

### Proposed frontend technology

- **Next.js**
- **CesiumJS**
- **Three.js**
- **WebGL**

### Major visualization components

#### 3D Ocean Globe

An interactive geographic representation of the target ocean region.

#### Subsurface Temperature Profiles

Users can inspect how the predicted temperature changes with depth.

Example concept:

```text
Surface
 │
 │ 25°C
 │
 │ 23°C
 │
 │ 20°C
 │
 │ 17°C
 │
 └── Deep Ocean
```

#### Cutaway Visualization

A visual representation of subsurface layers.

#### Latent-Space Visualization

A representation of learned ocean embeddings for analysis and interpretation.

#### ARGO Matching / Comparison

A predicted temperature profile can be compared with nearby independent ARGO observations.

---

# 21. Example User Flow

A user might select:

```text
Latitude  = 15.25°N
Longitude = 80.50°E
Date      = selected day
```

The system then performs:

```text
User Selection
      ↓
Retrieve Surface Data
      ↓
Harmonize / Prepare Inputs
      ↓
OceanEmbed Model
      ↓
Reconstruct 15-Level Temperature Profile
      ↓
Return Prediction
      ↓
Display on 3D Platform
```

The exact API structure and parameter format are implementation choices rather than requirements explicitly fixed by the problem statement.

---

# 22. Proposed System Architecture

```text
┌─────────────────────────────────────────────┐
│              DATA SOURCES                   │
│                                             │
│ SST | SSS | SSH/SLA | Currents | Winds     │
│                                             │
│ GLORYS → Training Target                   │
│ ARGO   → Independent Validation             │
└──────────────────────┬──────────────────────┘
                       ↓
┌─────────────────────────────────────────────┐
│       DATA INGESTION & HARMONIZATION        │
│                                             │
│ Xarray | NetCDF | Zarr                     │
│ QC | Regridding | Interpolation             │
│ Normalization | Co-registration              │
└──────────────────────┬──────────────────────┘
                       ↓
┌─────────────────────────────────────────────┐
│          SATELLITE EMBEDDING ENGINE         │
│                                             │
│ CNN / ViT / Autoencoder / GNN / Hybrid     │
│                                             │
│       ↓ Spatial-Temporal Embedding ↓        │
└──────────────────────┬──────────────────────┘
                       ↓
┌─────────────────────────────────────────────┐
│       DEPTH-AWARE RECONSTRUCTION            │
│                                             │
│        Temperature @ 15 depths              │
│         0 m → 1000 m                         │
└──────────────────────┬──────────────────────┘
                       ↓
┌─────────────────────────────────────────────┐
│             VALIDATION ENGINE               │
│                                             │
│ Prediction ↔ Independent ARGO              │
│                                             │
│ RMSE | Bias | Correlation                  │
└──────────────────────┬──────────────────────┘
                       ↓
┌─────────────────────────────────────────────┐
│          OCEAN VISUALIZATION                │
│                                             │
│ Next.js + CesiumJS + Three.js + WebGL      │
│                                             │
│ 3D Globe | Profiles | Cutaways | Analysis  │
└─────────────────────────────────────────────┘
```

The team's PPT system architecture similarly contains data input streams, ingestion/harmonization, an embedding and reconstruction engine, storage, backend, frontend, infrastructure, and end-user layers.

---

# 23. Backend Architecture

The proposed backend is **FastAPI + Python**.

A logical API organization could be:

```text
/api
   /data
   /profile
   /prediction
   /argo
   /validation
   /embedding
   /visualization
```

Example conceptual request:

```json
{
  "latitude": 15.25,
  "longitude": 80.50,
  "date": "2026-05-10"
}
```

Example conceptual output:

```json
{
  "depths": [0, 5, 10, 20, 30, 50, 75, 100, 125, 150, 200, 300, 500, 700, 1000],
  "temperature": [ ... ]
}
```

These endpoint names and JSON structures are proposed implementation examples, not fixed requirements from the PS.

---

# 24. Storage Architecture

The PPT proposes two major storage categories.

## PostgreSQL

For structured metadata such as:

- Location metadata
- Temporal metadata
- Dataset metadata
- Model metadata
- API-related records

## Cloudflare R2 / Object Storage

For large objects such as:

- Raw datasets
- Zarr chunks
- Model checkpoints

### Why Zarr matters

Large scientific datasets can be expensive to retrieve repeatedly. Chunked Zarr storage is intended to allow the system to retrieve only the relevant sections needed for a request.

The PPT specifically highlights Zarr chunking as a way to reduce retrieval bottlenecks and improve access to key ocean variables.

---

# 25. Proposed Technology Stack

| Component | Proposed Technology |
|---|---|
| Frontend | Next.js |
| 3D Globe | CesiumJS |
| 3D Rendering | Three.js / WebGL |
| Backend | FastAPI / Python |
| Scientific Processing | Xarray |
| Data Formats | NetCDF / Zarr |
| Deep Learning | TensorFlow / PyTorch |
| ML Utilities | Scikit-learn |
| Database | PostgreSQL |
| Object Storage | Cloudflare R2 |
| Containerization | Docker |
| CI/CD | GitHub Actions |
| Cloud | Render / GCP |
| 3D Assets | Blender / GLB |

The stack above follows the technical approach shown in the team's PPT.

---

# 26. What the Final Product Actually Is

OceanEmbed is **not only an ML model**.

It is an **end-to-end ocean intelligence platform** combining:

```text
Data Engineering
        +
AI / Deep Learning
        +
Scientific Validation
        +
Cloud / Data Infrastructure
        +
Interactive 3D Visualization
```

The deep-learning model is the computational core, but the final product also includes the data pipeline, storage, APIs, validation system and user-facing visualization.

---

# 27. Expected Solution from the Problem Statement

The official PS expects:

### 1. End-to-end preprocessing pipeline

For satellite and ocean datasets.

### 2. Satellite embedding engine

Learns latent representations of ocean surface conditions.

### 3. Deep-learning reconstruction model

Estimates subsurface temperature.

### 4. Standardized output

- Daily temporal resolution
- 0.25° spatial resolution

### 5. Validation framework

Uses independent ARGO observations.

### 6. Working Proof of Concept

Demonstrated over the **Bay of Bengal / Arabian Sea**.

---

# 28. Feasibility

The project PPT divides feasibility into technical, operational, and regulatory/data aspects.

## Technical Feasibility

The PPT proposes GPU acceleration for fast 15-depth reconstruction and states a target of **sub-second inference** on standard cloud instances.

This should be treated as a project performance target/claim rather than as an independently verified benchmark unless measured separately.

## Operational Feasibility

The visualization dashboard is intended to hide the complexity of:

- Scientific data formats
- Data preprocessing
- ML workflows
- Model execution

Users should be able to interact with the resulting ocean information without directly managing the ML pipeline.

## Regulatory / Data Feasibility

The presentation describes compatibility with open-access oceanographic standards including NetCDF and Argo GDAC and references integration with official INCOIS-oriented workflows.

---

# 29. Main Technical Challenges and Proposed Mitigations

## Challenge 1 — High Data Latency

Large oceanographic datasets may slow retrieval and visualization.

### Proposed mitigation

```text
Zarr Chunking
+
Cloud Optimization
+
Distributed Storage
+
Caching
```

## Challenge 2 — Offline Access / Data Sync

Low-connectivity environments can make it difficult to retrieve large datasets continuously.

### Proposed mitigation

```text
Progressive Data Loading
+
Local Caching
+
Offline-first / PWA-style behavior
```

## Challenge 3 — Sensor / Dataset Quality

Data may be:

- Missing
- Noisy
- Incomplete
- Poorly calibrated

### Proposed mitigation

```text
Quality Control
+
Automated Data Checks
+
Spatial Validation
+
Reference-data Checks
```

The PPT explicitly identifies data latency, offline/data synchronization, and sensor-data validation as major risks.

---

# 30. Why Independent ARGO Validation Matters

A model should not be judged only by whether its predictions look visually plausible.

Independent observations provide an external reference.

The intended pattern is:

```text
Historical Data
      ↓
Model Development
      ↓
Model
      ↓
New Satellite Inputs
      ↓
Prediction
      ↓
Independent ARGO
      ↓
Quantitative Evaluation
```

The evaluation should include the specified metrics:

- RMSE
- Bias
- Correlation

A useful implementation can additionally inspect errors by depth, region, season, and other subsets, provided these are actually implemented and measured.

---

# 31. Disaster Management Connection

OceanEmbed is not itself a direct disaster-response application. It provides **subsurface ocean intelligence** that can support environmental and climate-related applications.

The project PPT connects the output to:

- Monsoon forecasting / analysis
- Ocean heat-content estimation
- Coral bleaching prediction
- Marine ecosystem resilience
- Regional marine forecasting

The underlying idea is:

```text
Surface observations
        ↓
Subsurface thermal reconstruction
        ↓
Better understanding of ocean state
        ↓
Potential climate / marine / forecasting applications
```

---

# 32. Who Would Use OceanEmbed?

The project identifies several potential users.

## Oceanographers

For studying subsurface temperature and ocean dynamics.

## Marine Researchers

For regional and process-oriented ocean studies.

## Climate Analysts

For examining thermal patterns and climate-related ocean signals.

## Operational Units / Policymakers

For information and decision-support contexts where subsurface ocean conditions matter.

## Students / Education

For interactive exploration of ocean and climate science.

The PPT specifically describes the dashboard as intended for oceanographers, researchers and operational users without requiring complex ML workflow training.

---

# 33. Core Benefits

The PPT groups its core impacts into four areas.

| Impact | Explanation |
|---|---|
| **Enables Fast Data Insights** | Zarr chunking is intended to reduce retrieval bottlenecks and speed access to relevant ocean variables |
| **Improves User Adoption** | A web-native WebGL / Three.js interface can make the system accessible through standard browsers |
| **Enables Continuous Subsurface Intelligence** | Surface observations are converted into temperature estimates at 15 subsurface levels |
| **Open Data Integration** | Multiple satellite sources can be combined with independent ARGO validation |

---

# 34. Social, Economic and Environmental Impact

## Social Benefits

The PPT states that OceanEmbed can empower:

- Oceanographers
- Marine researchers
- Students

by improving access to high-resolution subsurface thermal profiles and supporting Indian Ocean research and climate education.

## Economic Benefits

The PPT proposes that virtual observation fields may reduce reliance on some expensive physical sensor deployments such as moorings and gliders.

This is best treated as a potential cost benefit rather than a claim that physical observation systems can be eliminated.

## Environmental Benefits

The presentation identifies potential applications in:

- Monsoon forecasting
- Ocean heat-content estimation
- Coral bleaching prediction
- Marine ecosystem resilience

---

# 35. Research Foundation

The project PPT highlights three main research directions.

## 1. Deep Learning Subsurface Reconstruction

Prior studies have explored spatiotemporal neural networks such as **ConvLSTM** and U-Net-type architectures for mapping surface satellite signals such as SST, SSH and SSS to internal ocean thermal structure.

## 2. Regional Dynamics and Input Selection

Research indicates the importance of multi-parameter fusion, including temperature, salinity and sea-level information, for capturing nonlinear subsurface relationships in regional ocean dynamics.

## 3. Operational Benchmarking and Digital Twins

The PPT references modern oceanographic frameworks and benchmarks such as **TS-Cast** and **ARMOR3D**, along with validation against physical models and in-situ ARGO profiles.

---

# 36. Key References Mentioned in the PPT

The PPT lists the following research foundations/references:

### 01 — DORS / Global Subsurface Temperature

Deep-learning / ConvLSTM reconstruction of global ocean temperature using satellite and ARGO data.

**Journal / source referenced:** Remote Sensing (2022)

The slide also references a study titled approximately:

> *Subsurface Temperature Reconstruction for the Global Ocean (MDPI)*

### 02 — CNN Subsurface Profile Reconstruction

Convolutional approaches for nonlinear mapping from surface observations to 3D thermohaline fields.

**Source referenced:** Frontiers in Marine Science (2023)

### 03 — Indian Ocean ML / SVM Dynamics

Integration of physical oceanographic constraints into neural network loss functions.

**Sources referenced:** IEEE / AGU publications and an Indian Ocean subsurface dynamics study on ScienceDirect.

---

# 37. Comparison with Existing Systems

The PPT compares the project with:

- DORS / ConvLSTM
- ECCO / Numerical approaches
- ARMOR3D / Copernicus

The comparison table highlights the combination of capabilities proposed by OceanEmbed:

| Capability | OceanEmbed |
|---|---|
| North Indian Ocean Focus | Yes |
| Spatial-Temporal Latent Embedding | Yes |
| Multi-Parameter Data Fusion | Yes |
| Fast Machine Learning Inference | Yes |
| Independent ARGO Validation Pipeline | Yes |
| Cloud-Native Dask / Xarray / Zarr-oriented Workflow | Yes |

These should be interpreted as the capabilities emphasized by the submission rather than as a claim that other systems have no individual overlapping features.

---

# 38. What Makes the Proposed System Distinct?

The intended contribution is the **combination** of:

**Multi-source satellite data**

+

**Spatial-temporal latent representations**

+

**Depth-aware subsurface reconstruction**

+

**Independent ARGO validation**

+

**Cloud-native scientific data handling**

+

**Interactive 3D visualization**

This combined architecture is the main technical story of the project.

---

# 39. Current Prototype Status

The submitted PPT explicitly states:

> **OceanEmbed is currently in active prototype development; the core frontend visualization is completed.**

Therefore, project status should be communicated carefully.

## Demonstrated / Presented

- Core frontend visualization
- 3D ocean visualization concept
- Custom 3D assets
- System architecture
- Proposed data workflow
- Landing-page prototype

## Active Development / Full-System Work

- Complete satellite ingestion pipeline
- Multi-source harmonization
- Trained embedding model
- Reconstruction model
- GLORYS training pipeline
- Independent ARGO validation
- Quantitative model evaluation
- Production-scale deployment
- Extended datasets / future data sources

This distinction helps avoid presenting planned functionality as if it were already fully production-ready.

---

# 40. The Most Important Distinction: Training vs Prediction vs Validation

This should be understood by every team member.

## Training

```text
Satellite observations
        +
GLORYS temperature
        ↓
     Train Model
```

## Prediction

```text
New satellite observations
        ↓
     Trained Model
        ↓
Predicted 15-level profile
```

## Validation

```text
New satellite observations
        ↓
     Trained Model
        ↓
Predicted Profile
        ↕
 Independent ARGO
        ↓
RMSE / Bias / Correlation
```

This separation is fundamental to establishing model credibility.

---

# 41. Complete Project Architecture — Detailed View

```text
                         OCEANEMBED
                             │
                             ▼
                 NORTH INDIAN OCEAN
              5°N–30°N | 45°E–105°E
                             │
                             ▼
              ┌─────────────────────────┐
              │   SURFACE OBSERVATIONS  │
              ├─────────────────────────┤
              │ SST                     │
              │ SSS                     │
              │ SSH / SLA               │
              │ Surface Current U / V  │
              │ Surface Wind U / V      │
              └────────────┬────────────┘
                           │
                           ▼
                DATA HARMONIZATION
                           │
                  Daily + 0.25°
                           │
                           ▼
                XARRAY / NETCDF / ZARR
                           │
                           ▼
              SATELLITE EMBEDDING ENGINE
                           │
               CNN / ViT / AE / GNN /
                 Attention / Hybrid
                           │
                           ▼
                  OCEAN EMBEDDING
                           │
                           ▼
              DEPTH-AWARE DECODER
                           │
                           ▼
               15 TEMPERATURE LEVELS
                           │
      ┌────────────────────┼────────────────────┐
      │                    │                    │
      ▼                    ▼                    ▼
     0m                  100m                 1000m
      │                    │                    │
      └────────────────────┼────────────────────┘
                           │
                           ▼
                     PREDICTION
                           │
                           ▼
             INDEPENDENT ARGO VALIDATION
                           │
                           ▼
               RMSE | BIAS | CORRELATION
                           │
                           ▼
                  OCEAN DATA PLATFORM
                           │
            ┌──────────────┼──────────────┐
            ▼              ▼              ▼
         3D Globe     Temp Profiles   Latent Space
                           │
                           ▼
             Research / Climate / Marine
               / Disaster Applications
```

---

# 42. One-Line Technical Definition

> **OceanEmbed is an end-to-end satellite-to-subsurface ocean intelligence platform that uses multi-source surface observations, learned ocean embeddings and depth-aware deep learning to reconstruct daily 0.25° subsurface temperature profiles across 15 standard depths in the North Indian Ocean, with independent ARGO-based validation.**

---

# 43. Judge-Friendly Explanation

## “What is the problem?”

> Subsurface ocean temperature is essential for understanding ocean dynamics and climate-related phenomena, but direct measurements from ARGO floats, ships, gliders and buoys are sparse. Satellites provide extensive surface observations but cannot directly observe the complete subsurface temperature structure.

## “What are you proposing?”

> We propose a deep-learning framework that learns the relationship between multi-variable surface satellite observations and the subsurface ocean state. The model converts SST, SSS, SSH/SLA, currents and winds into a latent ocean embedding and reconstructs temperature across 15 standard depths from 0 to 1000 metres.

## “What is the training target?”

> GLORYS Global Ocean Reanalysis provides the subsurface temperature target used during model development and training.

## “How do you know the prediction is correct?”

> We validate the reconstructed profiles against independent ARGO observations using metrics such as RMSE, bias and correlation.

## “What is the final product?”

> A web-based ocean intelligence platform where users can interactively explore reconstructed subsurface conditions through a 3D North Indian Ocean visualization interface.

---

# 44. The Simplest Explanation

Imagine satellites are continuously taking measurements of the **top layer of the ocean**.

OceanEmbed asks:

> **“From everything happening at the surface, can AI learn what the ocean looks like underneath?”**

The answer is attempted through:

```text
Surface data
    ↓
AI learns hidden spatial-temporal relationships
    ↓
Ocean embedding
    ↓
Subsurface temperature reconstruction
    ↓
ARGO checks the prediction
    ↓
3D visualization shows the result
```

That is the fundamental idea behind OceanEmbed.

---

# 45. Six Words to Remember the Entire Project

## **Satellite → Harmonize → Embed → Reconstruct → Validate → Visualize**

### Satellite
Collect SST, SSS, SSH/SLA, currents and winds.

### Harmonize
Bring different datasets onto a common daily 0.25° grid.

### Embed
Learn a compact latent representation of the ocean surface state.

### Reconstruct
Generate the 15-level subsurface temperature profile.

### Validate
Compare predictions with independent ARGO observations.

### Visualize
Display the resulting ocean state through the 3D web platform.

---

# 46. Final Project Description for Documentation / PPT

> **OceanEmbed is a satellite embedding-based deep learning framework designed to reconstruct subsurface ocean temperature from surface observations over the North Indian Ocean. The system addresses the limited spatial and temporal coverage of direct subsurface measurements by leveraging daily multi-source satellite observations including SST, SSS, SSH/SLA, surface currents and winds. These heterogeneous datasets are cleaned, harmonized and regridded to a common 0.25° × 0.25° daily resolution using scientific data-processing technologies such as Xarray, NetCDF and Zarr. A deep-learning embedding engine learns compact spatial-temporal representations of ocean surface conditions, which are passed to a depth-aware reconstruction model to estimate temperature at 15 standard depths ranging from 0 to 1000 m. GLORYS reanalysis temperature fields are used as the training target, while independent ARGO observations are used for validation through metrics such as RMSE, bias and correlation. The resulting subsurface information is delivered through an interactive web-based 3D visualization platform built using Next.js, CesiumJS, Three.js and WebGL. The proposed system is intended to support oceanographic research, climate analysis, marine ecosystem studies, ocean heat-content assessment and other applications requiring high-resolution subsurface ocean intelligence. The expected proof of concept focuses on the Bay of Bengal and Arabian Sea.**

---

# 47. Official Problem Statement — Full Structured Summary

## Background

Subsurface ocean temperature is fundamental for understanding circulation, upper-ocean heat content, stratification, climate variability, air-sea interaction and marine ecosystems. Accurate vertical temperature information is useful for marine heatwave monitoring, fisheries, data assimilation and related applications.

Direct measurements depend largely on ARGO floats, moored buoys, gliders and ships, but these observations are sparse relative to the spatial and temporal coverage required for continuous basin-scale fields.

Satellite observations, in contrast, provide broad and frequent monitoring of surface conditions. Surface variables contain indirect signatures of subsurface processes through thermocline displacement, eddies, vertical mixing, transport and air-sea coupling.

Recent AI, deep learning and representation-learning methods make it possible to transform multidimensional surface observations into compact latent representations, potentially enabling the learning of nonlinear surface-to-subsurface relationships.

## Detailed Objective

Develop a **Satellite Embedding-Based Deep Learning Framework** to reconstruct depth-wise subsurface temperature from daily surface satellite observations at **0.25° spatial resolution** for the **North Indian Ocean (5°N to 30°N and 45°E to 105°E)**.

## Required System Capabilities

1. Preprocessing and harmonization pipeline for multi-source satellite and ocean datasets.
2. Standardization to 0.25° × 0.25° spatial resolution and daily temporal resolution.
3. Use SST, SSS, SSH/SLA, surface currents U/V and surface winds U/V as input variables.
4. Generate compact satellite embeddings using architectures such as CNN, ViT, Autoencoders, GNNs or attention-based hybrids.
5. Train reconstruction models connecting surface ocean state to subsurface temperature profiles.
6. Reconstruct temperatures at 15 standard depths:
   - 0 m
   - 5 m
   - 10 m
   - 20 m
   - 30 m
   - 50 m
   - 75 m
   - 100 m
   - 125 m
   - 150 m
   - 200 m
   - 300 m
   - 500 m
   - 700 m
   - 1000 m
7. Evaluate using independent observations and standard metrics such as correlation, RMSE and bias.

## Dataset Flexibility

If a dataset is not available at the required resolution, the team may select another openly available product and perform appropriate spatial and temporal interpolation/regridding.

## Recommended Training Target

**GLORYS Global Ocean Reanalysis**

Variable: **Temperature**

Reference: https://doi.org/10.48670/moi-00021

## Recommended In-Situ Validation Data

- Gridded ARGO
- INCOIS Live Access Server (LAS) — Gridded ARGO

## Expected Solution

- End-to-end satellite/ocean preprocessing pipeline
- Satellite embedding engine
- Deep-learning subsurface temperature reconstruction model
- Standardized daily 0.25° output
- Independent ARGO validation framework
- Working PoC over the Bay of Bengal / Arabian Sea

---

# 48. Important Implementation Notes

The following are useful distinctions when turning the concept into a real implementation:

### Official requirements

These come directly from the PS:

- North Indian Ocean domain: 5°N–30°N, 45°E–105°E
- Daily temporal resolution
- 0.25° × 0.25° spatial resolution
- Inputs: SST, SSS, SSH/SLA, currents, winds
- 15 standard depths from 0 to 1000 m
- GLORYS temperature target
- Independent ARGO validation
- Metrics including correlation, RMSE and bias
- PoC over Bay of Bengal / Arabian Sea

### Project-proposed engineering choices

These come from the project architecture and should be treated as implementation choices:

- Next.js frontend
- CesiumJS + Three.js + WebGL visualization
- FastAPI backend
- Xarray / NetCDF / Zarr data stack
- PostgreSQL metadata store
- Cloudflare R2 object storage
- Docker and GitHub Actions
- Render / GCP cloud infrastructure
- Blender / GLB assets
- Specific CNN / ConvLSTM / ViT / GNN / hybrid architecture selection

---

# 49. Final Mental Model

```text
       SURFACE OF OCEAN
┌─────────────────────────────┐
│ Satellite Observations      │
│                             │
│ SST | SSS | SSH/SLA         │
│ Currents | Winds            │
└──────────────┬──────────────┘
               │
               ▼
        DATA HARMONIZATION
               │
               ▼
        OCEAN EMBEDDING
               │
               ▼
      DEPTH-AWARE DECODER
               │
               ▼
┌─────────────────────────────┐
│ SUBSURFACE TEMPERATURE      │
│                             │
│ 0m    → T1                  │
│ 5m    → T2                  │
│ ...                         │
│ 1000m → T15                 │
└──────────────┬──────────────┘
               │
               ▼
      INDEPENDENT ARGO
          VALIDATION
               │
               ▼
    RMSE | BIAS | CORRELATION
               │
               ▼
       3D OCEAN PLATFORM
```

## In one sentence

> **Surface satellite observations are transformed into learned ocean embeddings, which are used to reconstruct a 15-level subsurface temperature profile for the North Indian Ocean, validate it against ARGO observations, and present the result through an interactive 3D ocean platform.**
