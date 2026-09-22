# INCOIS Ocean Digital Twin — Frontend

> **Google Maps for the ocean.** Explore the Indian Ocean, inspect model fields, navigate depth from surface to abyss, and compare model predictions against Argo float observations.

## Quick Start

```bash
cd ocean-twin
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll see a full-bleed ocean console framing the Indian Ocean.

## Environment Variables

Create `.env.local`:

```env
# Optional — Cesium Ion access token for premium imagery (bathymetry tiles, etc.)
# Get a free token at https://cesium.com/ion/signup
# App works without it (falls back to free OpenStreetMap imagery)
NEXT_PUBLIC_CESIUM_ION_TOKEN=your_token_here

# Optional — override API base URL when connecting real backend
# Default: same origin (uses Next.js mock API routes)
NEXT_PUBLIC_API_BASE_URL=
```

## Architecture

```
ocean-twin/
├── app/
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Entry — dynamic-imports OceanConsole
│   ├── globals.css             # Design tokens, glass panel utilities, fonts
│   └── api/
│       ├── field/route.ts      # Mock: GET /api/field
│       ├── observations/route.ts  # Mock: GET /api/observations
│       ├── profile/[floatId]/route.ts  # Mock: GET /api/profile/:id
│       └── matchup/[floatId]/route.ts  # Mock: GET /api/matchup/:id
│
├── components/
│   ├── console/
│   │   ├── OceanConsole.tsx    # Root shell — all panels over the globe
│   │   ├── TopBar.tsx          # Wordmark + live readout + region search
│   │   └── LiveReadout.tsx     # Lat/lon/depth/UTC in IBM Plex Mono
│   ├── globe/
│   │   ├── CesiumStage.tsx     # Client-only Cesium viewer
│   │   ├── ModelFieldLayer.tsx # Temperature/salinity field overlay
│   │   ├── ArgoMarkerLayer.tsx # Argo/glider/buoy markers + click
│   │   ├── DepthSliceShader.tsx # Cesium ClippingPlane cutaway effect
│   │   └── CameraChoreographer.ts # Surface→Cutaway→Dive transitions
│   ├── depth-rail/             # Signature element: depth slider + modes
│   ├── layers-panel/           # Variable, observations, colormap controls
│   ├── inspector/              # Float inspector: profile + matchup + dive
│   ├── timeline/               # Date scrubber + playback controls
│   └── shared/                 # GlassPanel, MonoValue, LoadingScan
│
├── lib/
│   ├── store/useConsoleStore.ts  # Zustand state
│   ├── api/queries.ts            # TanStack Query hooks
│   ├── api/types.ts              # Shared TypeScript types
│   ├── cesium/colormaps.ts       # Viridis, thermal, cividis, deep, haline
│   └── fixtures/                 # Mock JSON data (Indian Ocean demo)
```

## Demo Flow (Manual Test)

1. **Load** → Full-bleed ocean console, Indian Ocean framed, Argo markers visible
2. **Layers** → Click Temperature → Salinity → observe colormap change
3. **Depth Rail** → Drag slider down to 500 m → mode auto-switches to Cutaway, camera tilts
4. **Dive** → Drag to 1000+ m → mode switches to Dive, fog density increases
5. **Select Marker** → Click any Argo float (teal dot) → Inspector Drawer slides in
6. **Inspect** → View float summary, depth profile chart (T/S vs depth), model matchup table
7. **Dive Replay** → Click "REPLAY DIVE" → camera flies to Dive mode for selected float
8. **Timeline** → Press ▶ Play → date advances, field/observations re-query
9. **Reset** → Click ↺ reset button → Indian Ocean overview restored

## Connecting the Real Backend

Replace mock routes in `app/api/` with real endpoint URLs, or set `NEXT_PUBLIC_API_BASE_URL` to your backend. The query hooks in `lib/api/queries.ts` require no changes — the contract is identical.

## Design Tokens

```css
--abyss: #050B14          /* Base canvas — deep ocean dark */
--deep-panel: #0B1D2E     /* Glass panel fill */
--thermocline: #1C5C6B    /* Structural teal — dividers */
--biolume: #4CE0D2        /* Active/selected state */
--instrument-amber: #E8A33D /* Data/warning/anomaly */
--coral-delta: #FF6B5B    /* Critical delta/negative */
--foam: #E9F1F3           /* Primary text */
--foam-dim: #8FA5AC       /* Secondary/dim text */
```

Fonts: **Space Grotesk** (display) · **Inter** (UI) · **IBM Plex Mono** (all numeric values)

Colormaps: `thermal`, `viridis`, `cividis`, `deep`, `haline` — no rainbow/jet.

## Accessibility

- All controls have ARIA labels and roles
- Keyboard navigable (Tab / Enter / Space)
- `prefers-reduced-motion`: camera transitions become hard cuts
- Sufficient contrast on all glass panels (min 4.5:1 for text)

## Known Limitations

- **Cesium volume rendering**: uses Cesium ClippingPlane fallback for the depth cutaway (stable). True Three.js volume rendering is the next extension point.
- **Observation clustering**: simplified at wide zoom levels — proper Cesium clustering API can be added without state changes.
- **Real-time data**: timeline advances mock timestamps. Real streaming can be wired through TanStack Query's `refetchInterval`.

## Scripts

```bash
npm run dev     # Development server with hot reload
npm run build   # Production build
npm run lint    # ESLint check
```
