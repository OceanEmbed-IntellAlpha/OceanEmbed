-- ====================================================================
-- OceanEmbed Supabase Metadata Schema
-- Run this in your Supabase Dashboard -> SQL Editor
-- ====================================================================

-- 1. Enable PostGIS (optional, for spatial bounding box operations)
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Dataset Catalog Table
-- Stores metadata for Zarr stores, PyTorch model checkpoints, 3D GLB assets, and NetCDF files
CREATE TABLE IF NOT EXISTS public.dataset_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_name TEXT NOT NULL UNIQUE,          -- e.g. 'surface_features', 'climatology_2010_2020', 'model_v2'
    dataset_type TEXT NOT NULL,                 -- 'zarr', 'pytorch_checkpoint', '3d_asset', 'netcdf', 'json_metadata'
    r2_key TEXT NOT NULL,                       -- S3 key in R2 bucket (e.g. 'zarr/surface_features.zarr/')
    r2_url TEXT NOT NULL,                       -- Full S3 URI (e.g. 's3://oceanembed/zarr/surface_features.zarr/')
    public_url TEXT,                            -- Public CDN URL (e.g. 'https://pub-xxx.r2.dev/assets/argo_float.glb')
    size_bytes BIGINT,                          -- File or store size in bytes
    start_date DATE,                            -- Temporal coverage start
    end_date DATE,                              -- Temporal coverage end
    lat_min REAL,                               -- Spatial bounds
    lat_max REAL,
    lon_min REAL,
    lon_max REAL,
    depth_levels REAL[],                        -- Vertical depth levels if 3D
    variables JSONB DEFAULT '[]'::jsonb,        -- Array of variable names (e.g. ["analysed_sst", "sos", "sla"])
    metadata JSONB DEFAULT '{}'::jsonb,         -- Flexible metadata (units, grid resolution, RMSE, etc.)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for instant querying by dataset type or dates
CREATE INDEX IF NOT EXISTS idx_dataset_catalog_name ON public.dataset_catalog (dataset_name);
CREATE INDEX IF NOT EXISTS idx_dataset_catalog_dates ON public.dataset_catalog (start_date, end_date);

-- 3. Argo Float Profiles Metadata Table
-- Stores metadata for thousands of Argo float profiles (so spatial/temporal queries take <10ms)
CREATE TABLE IF NOT EXISTS public.argo_profiles (
    id SERIAL PRIMARY KEY,
    platform_wmo TEXT NOT NULL,                 -- WMO float identifier
    cycle_number INT NOT NULL,                  -- Cycle number
    profile_date TIMESTAMPTZ NOT NULL,          -- Timestamp of observation
    latitude REAL NOT NULL,                     -- Latitude (-90 to 90)
    longitude REAL NOT NULL,                    -- Longitude (-180 to 180)
    max_depth REAL,                             -- Maximum depth reached (e.g. 2000m)
    qc_flag INT DEFAULT 1,                      -- Quality control flag (1 = good)
    storage_r2_key TEXT,                        -- R2 path if stored in R2
    profile_data JSONB,                         -- Optional full profile (depths, temps, salinities)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Spatial and temporal indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_argo_coords ON public.argo_profiles (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_argo_date ON public.argo_profiles (profile_date);
CREATE INDEX IF NOT EXISTS idx_argo_platform ON public.argo_profiles (platform_wmo);
