# OceanEmbed Frontend Plan
## SIH 2026 — Problem Statement 26066

> **Frontend Product Vision:** Build OceanEmbed as a professional scientific ocean-intelligence platform rather than a generic AI dashboard. The experience should communicate one idea visually: **surface observations can be used to reveal the hidden subsurface ocean state.**

---

# 1. Frontend Objective

The frontend should do two jobs:

1. **Explain OceanEmbed beautifully** to judges, researchers, students, and general visitors.
2. **Provide a functional scientific explorer** where users can inspect surface variables, select a location/date, view reconstructed subsurface temperature profiles, and compare predictions with independent Argo observations.

The frontend should therefore be divided into two experiences:

```text
OceanEmbed
│
├── Story / Marketing Experience
│   └── /
│
└── Scientific Explorer
    └── /explorer
```

### Core visual story

```text
SURFACE
   ↓
OBSERVATION
   ↓
EMBEDDING
   ↓
RECONSTRUCTION
   ↓
SUBSURFACE
   ↓
VALIDATION
   ↓
INSIGHT
```

---

# 2. Final Product Structure

Recommended sitemap:

```text
OceanEmbed
│
├── Home
│
├── Explorer
│   ├── Ocean Map
│   ├── Surface Layers
│   ├── Subsurface Temperature
│   ├── Temperature Profile
│   ├── Argo Comparison
│   └── Validation Metrics
│
├── Methodology
│   ├── Problem
│   ├── Data Pipeline
│   ├── Ocean Embeddings
│   ├── Reconstruction
│   └── Validation
│
├── Research
│   ├── Datasets
│   ├── Model
│   ├── Evaluation
│   └── References
│
└── About
    ├── Problem Statement
    ├── Team
    └── Documentation
```

The most important user paths are:

```text
Home → Explorer
Home → Methodology
Explorer → Validation
```

---

# 3. Design Philosophy

OceanEmbed should feel like:

```text
NASA mission interface
        +
scientific visualization
        +
premium modern product
        +
deep ocean
```

It should **not** feel like:

- a generic SaaS dashboard
- a random Web3/glowing-gradient website
- a gaming interface
- a collection of glassmorphism cards
- a conventional GIS application overloaded with controls

### Design principle

> **The ocean/data visualization is the hero. The UI should support it, not compete with it.**

---

# 4. Visual Identity

## 4.1 Color Direction

### Main background

```text
#030812
#06111C
#081923
```

### Ocean spectrum

```text
Deep blue
Cyan
Aqua
Teal
Blue-violet
```

### Scientific attention colors

```text
Amber / warm orange
White
Soft red for anomalies
```

### Important rule

Do not make every interface element cyan.

Use color primarily to communicate **data meaning**, especially temperature and anomalies.

---

# 5. Temperature Visualization

Temperature should use a scientific heatmap rather than decorative gradients.

Conceptually:

```text
Cold  →  Blue  →  Cyan  →  Yellow  →  Orange  →  Red
```

The actual palette should remain consistent throughout:

- map
- profile
- legend
- depth visualization
- validation views

A user should immediately recognize that the same color represents the same temperature range everywhere.

---

# 6. Typography

Use two typographic roles.

## UI / Narrative

Recommended:

```text
Geist
Inter
IBM Plex Sans
```

Use for:

- headings
- paragraphs
- navigation
- labels
- buttons

## Scientific / Numeric

Recommended:

```text
JetBrains Mono
IBM Plex Mono
```

Use for:

```text
15.25° N
80.50° E
2026-05-10
1000 m
24.83 °C
RMSE 0.82 °C
```

This should give the application an instrument-like feel.

---

# 7. Navigation

Keep the navbar minimal.

## Landing page

```text
OCEANEMBED

Explore
Methodology
Research

                    [ Launch Explorer ]
```

## Explorer

```text
← OceanEmbed

Explorer
Validation
Datasets
```

Do not overload the primary navigation with many pages.

---

# 8. Homepage — Story Experience

The homepage should be cinematic and narrative-driven.

The visitor should understand the project visually before reading technical details.

---

# 9. Hero Section

## Main headline

> **See Beneath the Surface.**

## Supporting line

> Reconstructing subsurface ocean temperature from satellite observations with deep learning.

CTA:

```text
[ Explore the Ocean ]
[ How It Works ]
```

---

# 10. Hero Visual

Use a cinematic ocean/Earth visualization.

The recommended composition:

```text
┌───────────────────────────────────────────────┐
│ OCEANEMBED                                    │
│                                               │
│       SEE BENEATH THE SURFACE.                │
│                                               │
│       Surface observations reveal             │
│       more than the surface.                  │
│                                               │
│       [ Explore ] [ How it works ]            │
│                                   3D OCEAN    │
│                                    GLOBE       │
└───────────────────────────────────────────────┘
```

Visual elements can include:

- Earth
- atmosphere
- Indian Ocean emphasis
- subtle ocean grid
- satellite observation points
- orbital satellite path
- subtle ocean motion

---

# 11. Hero Animation Sequence

Recommended sequence:

### 0–1 seconds

Dark screen.

```text
NORTH INDIAN OCEAN
45°E — 105°E
```

### 1–2 seconds

Earth appears.

### 2–3 seconds

Camera moves toward the Indian Ocean.

### 3–4 seconds

The project region becomes highlighted.

### 4–5 seconds

Satellite observations appear.

```text
SURFACE OBSERVATIONS
```

### 5–7 seconds

Camera begins descending.

Text transitions:

```text
FROM WHAT WE CAN SEE
```

then:

```text
TO WHAT WE CANNOT
```

Then transition into the problem section.

The animation should directly explain the project rather than simply create visual spectacle.

---

# 12. Section — The Problem

Headline:

> **The surface tells only part of the story.**

Visual:

```text
             SATELLITE
                 ↓

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
             SURFACE
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        ?       ?       ?
      ?      ?      ?      ?
        ?       ?       ?
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
           SUBSURFACE
```

Explain that direct subsurface measurements depend on systems such as:

```text
ARGO
BUOYS
GLIDERS
SHIPS
```

while satellite observations provide broad surface coverage.

---

# 13. Section — What If We Could Infer It?

This is the conceptual transition into OceanEmbed.

Use scroll-driven animation.

Initial state:

```text
SST
SSS
SSH
CURRENTS
WIND
```

Scroll:

```text
        ↓

DATA HARMONIZATION

        ↓

    DEEP LEARNING

        ↓

 OCEAN EMBEDDING

        ↓

 RECONSTRUCTION
```

Then the ocean column appears and reveals:

```text
0 m       25.4°C
5 m       25.2°C
10 m      24.9°C
20 m      24.4°C
...
1000 m     6.8°C
```

This is the visual explanation of the project itself.

---

# 14. Section — Why OceanEmbed?

Headline:

> **From surface signals to latent ocean state.**

Show the inputs converging:

```text
SST ───────┐
SSS ───────┤
SSH / SLA ─┤
Currents ──┤ → Encoder → Ocean Embedding → Decoder
Winds ─────┘
```

Make the data inputs interactive.

Hovering SST:

> Sea Surface Temperature

Hovering SSH:

> Sea Surface Height / Sea Level Anomaly

Hovering currents:

> Surface ocean current U/V components

The visual should communicate that multiple surface variables are transformed into a learned latent representation.

---

# 15. Section — 15 Depth Levels

Make this one of the signature visual sections.

Show a vertical ocean column:

```text
0 m
│
5 m
│
10 m
│
20 m
│
30 m
│
50 m
│
75 m
│
100 m
│
125 m
│
150 m
│
200 m
│
300 m
│
500 m
│
700 m
│
1000 m
```

As the user scrolls, the camera visually descends.

At each important depth, show:

```text
DEPTH
200 m

TEMPERATURE
18.72°C
```

This directly communicates the project's required depth-wise reconstruction.

---

# 16. Section — Explorer Preview

After the story, preview the actual product.

```text
┌────────────────────────────────────────────┐
│ OCEANEMBED EXPLORER                         │
│                                            │
│            3D / 2D OCEAN VIEW              │
│                                            │
│                         PROFILE             │
│                         ╲                   │
│                          ╲__               │
│                                            │
│ Layers                         Temperature  │
│ SST                            Profile      │
│ SSS                                         │
│ SSH                            ARGO         │
│ Currents                       Compare      │
│                                            │
│ Date ─────────────●──────────               │
└────────────────────────────────────────────┘
```

CTA:

> **Open Ocean Explorer →**

---

# 17. Explorer — Core Product

The Explorer should be much more functional and information-dense than the landing page.

Visual direction:

```text
Scientific instrument
+
modern map interface
+
high information density
```

---

# 18. Final Explorer Layout

Recommended three-region desktop layout:

```text
┌─────────────────────────────────────────────────────────┐
│ OCEANEMBED      Explorer      Research      Settings    │
├─────────────────┬───────────────────────┬───────────────┤
│                 │                       │               │
│ DATA CONTROLS   │       OCEAN MAP       │   PROFILE     │
│                 │                       │               │
│ Surface         │                       │   Temperature  │
│ ☑ SST           │                       │      vs        │
│ ☐ SSS           │                       │    Depth       │
│ ☐ SSH           │                       │               │
│ ☐ Currents      │                       │   ARGO        │
│ ☐ Winds         │                       │   Compare     │
│                 │                       │               │
│ Model Output    │                       │               │
│ ☑ Temperature   │                       │   Metrics     │
│ ☐ Embedding     │                       │               │
│                 │                       │               │
├─────────────────┴───────────────────────┴───────────────┤
│ Date       ◀──────────────●──────────────────────▶      │
│ Depth      0 m ─────────────────────────────── 1000 m  │
└─────────────────────────────────────────────────────────┘
```

---

# 19. CesiumJS — Final Decision

## CesiumJS is NOT essential.

The official problem statement does not require CesiumJS or even a 3D globe. The core requirements are:

- satellite-data preprocessing
- 0.25° × 0.25° daily standardization
- satellite embeddings
- subsurface temperature reconstruction
- 15 standard depth levels
- independent observation validation
- working PoC

Therefore, the project should not become dependent on a 3D globe simply for visual effect.

## Final recommended architecture

Use a **hybrid approach**:

```text
Landing
  ↓
Cinematic 3D experience
  ↓
Explorer
  ↓
2D scientific geospatial map
  ↓
Profile / validation / analysis
  ↓
Optional 3D Dive Mode
```

### Why?

The actual product value is:

```text
DATA
 ↓
MAP
 ↓
PROFILE
 ↓
VALIDATION
```

not:

```text
3D GLOBE
 ↓
more 3D
 ↓
more 3D
```

---

# 20. Recommended Explorer Map

Use a high-performance 2D geospatial map as the primary Explorer interface.

Potential technology:

```text
MapLibre GL
```

Alternative:

```text
CesiumJS
```

if a stronger geospatial 3D environment becomes necessary.

The 2D map should support:

- North Indian Ocean region
- SST layer
- SSS layer
- SSH/SLA
- currents
- winds
- Argo points
- reconstructed temperature
- prediction coverage
- selection of location

---

# 21. Explorer Map — Default Region

The project region should be the default view:

```text
5°N → 30°N
45°E → 105°E
```

This should encompass and visually emphasize the North Indian Ocean, including the Arabian Sea and Bay of Bengal.

Avoid initially zooming to the entire Earth.

The user should immediately see the geographical scope of the project.

---

# 22. Left Control Panel — Data Layers

Make the control panel collapsible.

## Surface Variables

```text
☑ SST
☐ SSS
☐ SSH / SLA
☐ Currents
☐ Winds
```

## Model Output

```text
☑ Subsurface Temperature
☐ Ocean Embedding
☐ Prediction Confidence
```

## Observations

```text
☐ Argo
☐ Gliders
```

## Base Layer

```text
Ocean
Satellite
Bathymetry
```

Keep the controls organized into expandable groups.

---

# 23. Surface Temperature Mode

When SST is selected, display a scientific heatmap.

On map hover:

```text
LAT
15.25° N

LON
80.50° E

SST
28.34 °C

TIME
10 May 2026
```

Keep the tooltip small and instrument-like.

---

# 24. Current / Wind Mode

Use animated flow visualization for vectors.

Conceptually:

```text
→ → → ↗ ↗
  ↗ → →
← ← ↖
```

The interface should show both direction and relative magnitude without cluttering the map.

---

# 25. Location Selection

When the user clicks the map:

```text
15.25°N
80.50°E
```

the application should open the detailed profile panel.

The selected location should be clearly marked on the map.

Example:

```text
        ●
     selected
     location
```

---

# 26. Date Selection

The explorer needs an intuitive timeline.

```text
2026-05-01
      │
      ├────────●─────────────
      │
2026-05-10
```

The timeline should allow:

- previous day
- next day
- drag
- exact date selection
- play/pause through time

Do not make the timeline visually dominant.

---

# 27. Depth Selection

Use a depth slider:

```text
0 m ────────●──────────────── 1000 m
            200 m
```

The slider can control the visible depth layer or selected profile point.

Also provide standard depth shortcuts:

```text
Surface
100 m
200 m
500 m
1000 m
```

---

# 28. Right Panel — Temperature Profile

The selected point should produce a vertical profile.

Example:

```text
SUBSURFACE PROFILE

15.25°N
80.50°E

10 MAY 2026

Temperature
│
│ ●
│  \
│   \
│    ●
│      \
│       ●
│        \
└────────────────
          Depth
```

Hover:

```text
DEPTH
200 m

TEMPERATURE
18.72 °C
```

The user should be able to inspect all 15 standard depths.

---

# 29. Profile Interaction

Interactions:

- hover points
- drag along the profile
- highlight matching point on 3D/map view
- show depth + temperature
- toggle model/ARGO curves
- toggle uncertainty if model confidence becomes available

The map and profile should always remain synchronized.

---

# 30. ARGO Comparison

This should be a first-class feature.

Profile visualization:

```text
             TEMPERATURE
                  │
       MODEL      │      ARGO
         ╲        │       ╱
          ╲       │      ╱
           ╲      │     ╱
            ╲     │    ╱
             ╲    │   ╱
              ╲   │  ╱
               ╲  │ ╱
                  │
                  │
                 DEPTH
```

Metrics:

```text
RMSE
0.XX °C

BIAS
+0.XX °C

CORRELATION
0.XX
```

The profile comparison should clearly distinguish model output from observations.

---

# 31. Validation Dashboard

Create a dedicated validation experience.

Headline:

> **How accurate is the reconstruction?**

Display:

```text
North Indian Ocean
──────────────────

Bay of Bengal
──────────────────

Arabian Sea
──────────────────
```

Useful visualizations:

- RMSE map
- Bias map
- Correlation map
- Model vs Argo profile
- depth-wise error
- regional summary

The frontend should allow the user to understand where the model performs well or poorly without hiding uncertainty.

---

# 32. Dive Mode — Signature Feature

This is the main optional 3D interaction.

Button:

```text
[DIVE BELOW SURFACE]
```

When activated:

### Phase 1

Camera moves toward the selected location.

### Phase 2

The surface becomes semi-transparent.

### Phase 3

Depth grid appears.

### Phase 4

The vertical water column becomes visible.

### Phase 5

The reconstructed temperature structure emerges.

```text
Surface
──────────────────

      ● 0 m
      │
      ● 50 m
      │
      ● 100 m
      │
      ● 200 m
      │
      ● 500 m
      │
      ● 1000 m
```

This is where Three.js or Cesium can provide visual value.

---

# 33. 3D Strategy

Do not build a second complex globe just because Three.js is available.

Use:

## CesiumJS — optional

For:

- geographic Earth
- camera
- geographic layers
- 3D globe

## Three.js — optional

For:

- custom underwater effects
- particles
- depth visualization
- custom scientific geometry
- shader effects

The final product should remain useful even if the 3D layer is disabled.

---

# 34. Scientific Mode and Story Mode

A useful product distinction:

## Story Mode

Audience:

- judges
- visitors
- students
- non-specialists

Characteristics:

- cinematic
- guided
- large visuals
- fewer controls

## Scientific Mode

Audience:

- researchers
- oceanographers
- technical users

Characteristics:

- data dense
- precise
- charts
- filters
- metrics
- scientific legends

---

# 35. Methodology Page

Use a visual vertical pipeline.

```text
01
DATA SOURCES
─────────────
SST
SSS
SSH/SLA
Currents
Wind

        ↓

02
HARMONIZATION
─────────────
0.25°
Daily
Quality Control
Regridding

        ↓

03
EMBEDDING
──────────
Spatial-Temporal Encoder

        ↓

04
RECONSTRUCTION
───────────────
Depth-Aware Decoder

        ↓

05
VALIDATION
──────────
ARGO

        ↓

06
VISUALIZATION
────────────
Ocean Explorer
```

The page should explain the architecture without forcing the user to read a huge technical paragraph.

---

# 36. Research Page

Make the research page resemble a professional scientific data portal.

Sections:

```text
Datasets
Models
Validation
References
```

Dataset cards:

```text
OSTIA
SST
0.05°
Daily

DUACS
SSH / SLA
0.25°
Daily

OSCAR
Currents
0.25°

GLORYS
Temperature
Training Target

ARGO
Independent Validation
```

Each dataset should link to its official source or DOI.

---

# 37. Data Specification Strip

Show the official project scope prominently.

```text
NORTH INDIAN OCEAN

5°N — 30°N
45°E — 105°E

0.25° × 0.25°
DAILY

15 DEPTH LEVELS
0 — 1000 m
```

This is a powerful way to communicate the exact scope to technical judges.

---

# 38. Animation Strategy

Use three animation layers.

## Layer 1 — UI Micro-interactions

Use:

```text
Motion
```

For:

- buttons
- hover states
- panel transitions
- modals
- small layout changes
- profile transitions
- number changes

## Layer 2 — Cinematic Storytelling

Use:

```text
GSAP + ScrollTrigger
```

For:

- hero zoom
- ocean descent
- embedding transformation
- depth reveal
- validation sequence

## Layer 3 — Scientific Visualization

Use:

```text
Cesium / Three.js / WebGL
```

For:

- Earth
- currents
- particles
- subsurface visualization
- custom geometry

Do not use multiple animation libraries for the same job.

---

# 39. Loading Experience

Avoid:

```text
Loading...
```

Instead use a scientific initialization sequence:

```text
INITIALIZING OCEAN MODEL

Geographic context       ✓
Surface observations     ✓
Ocean layer              ✓
Reconstruction engine    ...
```

Then:

```text
OCEAN SYSTEM READY
```

---

# 40. Profile Request Animation

When generating/retrieving a profile:

```text
FETCHING SATELLITE STATE
        ↓
BUILDING EMBEDDING
        ↓
RECONSTRUCTING 15 DEPTH LEVELS
        ↓
MATCHING ARGO OBSERVATION
        ↓
READY
```

This provides feedback without pretending that the frontend itself is doing ML computation.

---

# 41. Error and Data-Quality States

The UI must distinguish between different failure cases.

Examples:

```text
NO DATA AVAILABLE

MODEL PREDICTION UNAVAILABLE

ARGO VALIDATION UNAVAILABLE

DATA QUALITY WARNING
```

Example message:

> **Prediction available — independent Argo observation is not available for the selected location/time.**

Do not hide uncertainty behind generic error messages.

---

# 42. Explain Scientific Metrics

For metrics such as:

```text
RMSE: 0.84°C
```

include an information control.

Example:

```text
ⓘ RMSE
```

Explanation:

> Root Mean Square Error between reconstructed temperature and independent observational temperature for the selected validation subset.

The interface should educate users rather than assume oceanographic expertise.

---

# 43. Performance Architecture

This application will be GPU/data intensive.

Potentially:

```text
3D visualization
+
WebGL
+
particles
+
scientific charts
+
large ocean datasets
+
animations
```

Therefore:

> **Never send complete scientific datasets directly to the browser.**

Instead:

```text
User selects:
Latitude
Longitude
Date
Variable
Depth

        ↓

Backend/API

        ↓

Only required data

        ↓

Browser
```

---

# 44. Progressive Loading

Recommended loading order:

```text
1. UI shell
       ↓
2. Hero / static content
       ↓
3. Map
       ↓
4. Base data layer
       ↓
5. Selected scientific layer
       ↓
6. High-resolution profile
```

The user should never wait for the entire scientific system before seeing useful content.

---

# 45. Frontend State Architecture

The Explorer has shared state.

Suggested central state:

```text
ExplorerState

selectedDate
selectedLatitude
selectedLongitude

activeLayer

depth

showArgo
showCurrents
showWinds
showSST

visualizationMode

selectedProfile

comparisonMode
```

Recommended state library:

```text
Zustand
```

Use it to synchronize:

```text
Map
 ↕
Controls
 ↕
Profile
 ↕
Timeline
 ↕
Validation
```

---

# 46. Data Fetching

Recommended:

```text
TanStack Query
```

Responsibilities:

- API requests
- caching
- loading states
- error states
- refetching
- stale-data management

The frontend should request only the selected spatial/temporal subset.

---

# 47. Recommended Frontend Stack

```text
Next.js
TypeScript
Tailwind CSS
shadcn/ui
Motion
GSAP + ScrollTrigger
MapLibre GL
Three.js
Optional CesiumJS
ECharts / Recharts / Visx
Zustand
TanStack Query
Lucide Icons
```

### Responsibilities

| Technology | Purpose |
|---|---|
| Next.js | Application framework |
| TypeScript | Type safety |
| Tailwind | Styling |
| shadcn/ui | Base UI components |
| Motion | UI animation |
| GSAP | Cinematic scroll animation |
| MapLibre | Main geospatial map |
| Cesium | Optional 3D globe |
| Three.js | Optional custom 3D effects |
| ECharts / Visx | Scientific charts |
| Zustand | Explorer state |
| TanStack Query | API state and caching |
| Lucide | Icons |

---

# 48. Recommended Folder Structure

```text
src/
│
├── app/
│   ├── page.tsx
│   ├── explorer/
│   │   └── page.tsx
│   ├── methodology/
│   │   └── page.tsx
│   ├── research/
│   │   └── page.tsx
│   └── about/
│       └── page.tsx
│
├── components/
│   ├── landing/
│   │   ├── Hero.tsx
│   │   ├── ProblemSection.tsx
│   │   ├── EmbeddingSection.tsx
│   │   ├── DepthSection.tsx
│   │   ├── ValidationSection.tsx
│   │   └── ImpactSection.tsx
│   │
│   ├── map/
│   │   ├── OceanMap.tsx
│   │   ├── OceanLayers.tsx
│   │   ├── CurrentField.tsx
│   │   ├── ArgoMarkers.tsx
│   │   └── LocationSelector.tsx
│   │
│   ├── explorer/
│   │   ├── ExplorerShell.tsx
│   │   ├── LayerPanel.tsx
│   │   ├── DataControls.tsx
│   │   ├── TimeSlider.tsx
│   │   ├── DepthSlider.tsx
│   │   ├── ProfilePanel.tsx
│   │   └── ValidationPanel.tsx
│   │
│   ├── 3d/
│   │   ├── OceanGlobe.tsx
│   │   ├── DiveMode.tsx
│   │   ├── UnderwaterColumn.tsx
│   │   └── ParticleField.tsx
│   │
│   ├── charts/
│   │   ├── TemperatureProfile.tsx
│   │   ├── ErrorChart.tsx
│   │   └── ComparisonChart.tsx
│   │
│   └── ui/
│
├── lib/
│   ├── map/
│   ├── cesium/
│   ├── api/
│   ├── formatters/
│   └── constants/
│
├── store/
│   └── explorerStore.ts
│
└── types/
    ├── ocean.ts
    ├── profile.ts
    └── api.ts
```

---

# 49. Core Frontend Components

Essential components:

```text
OceanMap
TemperatureProfile
TemperatureScale
DataLayerControl
Timeline
DepthSlider
CoordinateInspector
ArgoCompare
MetricCard
DataQualityBadge
DatasetSelector
Legend
OceanStatus
DiveButton
CameraController
ScientificTooltip
```

---

# 50. Three Signature Features

OceanEmbed should be remembered for three interactions:

## 1. Ocean Map

The North Indian Ocean becomes the exploration surface.

## 2. Dive Mode

The user transitions from:

```text
surface
   ↓
subsurface
```

This directly communicates the problem.

## 3. Argo Compare

The reconstructed profile is compared against observed Argo data.

Together:

```text
OBSERVE
   ↓
RECONSTRUCT
   ↓
VALIDATE
```

---

# 51. Responsive Design

## Desktop

Full experience:

```text
Map + Controls + Profile
```

## Tablet

```text
Map
↓
Controls Drawer
↓
Profile
```

## Mobile

Use:

```text
Map
↓
Bottom Sheet
↓
Profile
↓
Metrics
```

Do not try to squeeze the entire desktop scientific interface into a phone.

For the complete Explorer, it is acceptable to communicate:

> **Best experienced on desktop.**

---

# 52. Accessibility

Professional-grade UI should include:

- keyboard navigation
- visible focus states
- semantic controls
- accessible labels
- readable contrast
- reduced-motion support
- legends that do not depend only on color
- meaningful loading states
- accessible charts where possible

---

# 53. What Not to Do

Avoid:

- generic AI landing-page templates
- excessive neon
- huge decorative gradients
- constant globe rotation
- random floating glass cards
- too many buttons
- 15 individual depth cards
- fake "LIVE" labels for non-live data
- pretending simulated data is real observations
- burying validation inside an About page
- loading huge datasets directly into the browser

The interface should prioritize scientific clarity.

---

# 54. Frontend Development Phases

## Phase 1 — Design System

Build:

```text
Next.js
Tailwind
Typography
Colors
Navbar
Buttons
Panels
Cards
Tooltips
Scientific labels
Responsive foundations
```

---

## Phase 2 — Landing Page

Build:

```text
Hero
Problem
Surface Signals
Ocean Embedding
15 Depths
Validation
Impact
Explorer CTA
```

Use placeholder data if necessary.

---

## Phase 3 — Explorer Foundation

Build:

```text
Map
North Indian Ocean region
Layer controls
Location selection
Date selection
```

---

## Phase 4 — Profile System

Build:

```text
Temperature profile
Depth interaction
Date interaction
Location/profile synchronization
```

---

## Phase 5 — Backend Integration

Connect:

```text
Next.js
   ↓
FastAPI
   ↓
Ocean data
   ↓
Model inference
```

---

## Phase 6 — ARGO Validation

Implement:

```text
Prediction
   ↕
ARGO
   ↓
RMSE
Bias
Correlation
```

---

## Phase 7 — Advanced Layers

Add:

```text
Currents
Winds
SST
SSS
SSH/SLA
ARGO tracks
Subsurface layers
```

---

## Phase 8 — 3D Dive Mode

Only after the scientific workflow works:

```text
Surface
   ↓
Depth transition
   ↓
Subsurface column
   ↓
Temperature structure
```

---

## Phase 9 — Cinematic Polish

Add:

```text
GSAP
ScrollTrigger
Motion
Camera transitions
Profile animations
Data-loading animations
Page transitions
Micro interactions
```

---

## Phase 10 — Production Polish

Complete:

```text
Performance
Accessibility
Mobile
Error states
Caching
Data quality states
SEO
Deployment
Demo mode
```

---

# 55. Development Milestones

| Milestone | Result |
|---|---|
| M1 | Design system + landing skeleton |
| M2 | Cinematic homepage |
| M3 | Working scientific map |
| M4 | Location selection + profile |
| M5 | Satellite/API integration |
| M6 | Model prediction integration |
| M7 | Argo comparison |
| M8 | Validation metrics |
| M9 | Advanced scientific layers |
| M10 | Optional 3D Dive Mode |
| M11 | Animation + visual polish |
| M12 | Performance, responsive, accessibility, deployment |

---

# 56. Final Architecture

The recommended final frontend architecture is:

```text
                         OCEANEMBED
                              │
             ┌────────────────┴────────────────┐
             │                                 │
          LANDING                           EXPLORER
             │                                 │
      Cinematic Story                    Scientific App
             │                                 │
       ┌─────┴─────┐                  ┌───────┼────────┐
       │           │                  │       │        │
     Story       3D Hero            Map    Profile  Validation
       │                              │       │        │
       │                              └───────┼────────┘
       │                                      │
       └──────────────→ Ocean Data ←──────────┘
                              │
                           FastAPI
                              │
                  ┌───────────┴───────────┐
                  │                       │
              Data Layer              ML Model
                  │                       │
            Satellite +               Ocean
             GLORYS                    Embedding
                  │                       │
                  └───────────┬───────────┘
                              │
                            ARGO
                         Validation
```

---

# 57. Final User Journey

The ideal visitor journey is:

```text
1. ARRIVE
   ↓
"See Beneath the Surface."

2. UNDERSTAND
   ↓
The surface is only part of the ocean state.

3. DISCOVER
   ↓
SST + SSS + SSH + Currents + Winds

4. WATCH
   ↓
Surface signals become an ocean embedding.

5. DIVE
   ↓
The subsurface temperature profile is revealed.

6. VERIFY
   ↓
Compare reconstruction with ARGO.

7. EXPLORE
   ↓
Open the OceanEmbed scientific explorer.

8. ANALYZE
   ↓
Map + depth + profile + time + validation.

9. UNDERSTAND
   ↓
Turn ocean data into actionable scientific insight.
```

---

# 58. Final Design Principle

> **Do not design OceanEmbed as a website that happens to contain scientific data. Design it as a scientific instrument that happens to be a website.**

The project should visually communicate:

```text
Orbit
  ↓
Surface
  ↓
Signal
  ↓
Embedding
  ↓
Dive
  ↓
Temperature
  ↓
ARGO
  ↓
Validation
  ↓
Insight
```

That sequence should become the visual identity of OceanEmbed.

---

# 59. Final Recommendation

## Primary frontend

```text
Next.js
+
TypeScript
+
Tailwind
+
shadcn/ui
+
Motion
+
GSAP
+
MapLibre
+
ECharts / Visx
+
Zustand
+
TanStack Query
```

## Optional 3D

```text
Three.js
+
Optional CesiumJS
```

## Product strategy

```text
LANDING
= cinematic + story-driven

EXPLORER
= map-first + scientific

DIVE MODE
= selective 3D + signature interaction

VALIDATION
= first-class scientific experience
```

### Most important decision

**CesiumJS is optional.**

The Explorer should not depend on a 3D globe to be useful. Start with a strong 2D scientific map and profile/validation system. Add 3D where it provides meaningful interaction, especially for **Dive Mode** and the landing-page narrative.

This gives OceanEmbed the visual quality and "wow" factor expected from a strong SIH presentation while keeping the frontend aligned with the actual scientific problem rather than turning the project into a 3D-globe demo.
