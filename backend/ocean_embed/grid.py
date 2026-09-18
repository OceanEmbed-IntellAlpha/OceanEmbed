"""
OceanEmbed — Grid utilities.

Defines the canonical 0.25° North Indian Ocean grid and coordinate helpers.
Domain: 5°N–30°N, 45°E–105°E (North Indian Ocean).
"""

from __future__ import annotations

import numpy as np
import xarray as xr
from typing import Tuple


# ── Canonical grid parameters ─────────────────────────────────────────────────

DOMAIN = {
    "lat_min": 5.0,
    "lat_max": 30.0,
    "lon_min": 45.0,
    "lon_max": 105.0,
    "resolution": 0.25,
}

NIO_LAT_MIN = DOMAIN["lat_min"]
NIO_LAT_MAX = DOMAIN["lat_max"]
NIO_LON_MIN = DOMAIN["lon_min"]
NIO_LON_MAX = DOMAIN["lon_max"]
GRID_SHAPE = (101, 241)  # (n_lat, n_lon) at 0.25 deg resolution

SIH_DEPTHS: list[float] = [
    0, 5, 10, 20, 30, 50, 75, 100, 125, 150, 200, 300, 500, 700, 1000
]

REGIONS = {
    "arabian_sea": {
        "lat_min": 5.0, "lat_max": 27.0,
        "lon_min": 45.0, "lon_max": 78.0,
        "id": 0,
    },
    "bay_of_bengal": {
        "lat_min": 5.0, "lat_max": 23.0,
        "lon_min": 80.0, "lon_max": 100.0,
        "id": 1,
    },
    "open_ocean": {
        "lat_min": 5.0, "lat_max": 30.0,
        "lon_min": 45.0, "lon_max": 105.0,
        "id": 2,
    },
}


def make_grid(
    lat_min: float = DOMAIN["lat_min"],
    lat_max: float = DOMAIN["lat_max"],
    lon_min: float = DOMAIN["lon_min"],
    lon_max: float = DOMAIN["lon_max"],
    resolution: float = DOMAIN["resolution"],
) -> Tuple[np.ndarray, np.ndarray]:
    """Return (latitudes, longitudes) arrays for the canonical grid.

    Grid centres are at multiples of resolution, from lat_min to lat_max inclusive.
    """
    lats = np.arange(lat_min, lat_max + resolution / 2, resolution)
    lons = np.arange(lon_min, lon_max + resolution / 2, resolution)
    return lats, lons


def make_empty_grid_da(
    name: str = "temperature",
    units: str = "°C",
) -> xr.DataArray:
    """Return an empty (NaN) DataArray on the canonical grid."""
    lats, lons = make_grid()
    data = np.full((len(lats), len(lons)), np.nan)
    return xr.DataArray(
        data,
        dims=["latitude", "longitude"],
        coords={"latitude": lats, "longitude": lons},
        name=name,
        attrs={"units": units},
    )


def normalize_lat(lat: np.ndarray | float) -> np.ndarray | float:
    """Normalize latitude to [-1, 1] over [5, 30] N."""
    return (lat - 17.5) / 12.5


def normalize_lon(lon: np.ndarray | float) -> np.ndarray | float:
    """Normalize longitude to [-1, 1] over [45, 105] E."""
    return (lon - 75.0) / 30.0


def normalize_depth(depth: np.ndarray | float, max_depth: float = 1000.0) -> np.ndarray | float:
    """Normalize depth to [0, 1]."""
    return np.clip(depth / max_depth, 0.0, 1.0)


def normalize_doy(doy: int | np.ndarray) -> np.ndarray | float:
    """Normalize day-of-year to [0, 1]."""
    return np.asarray(doy, dtype=float) / 365.25


def get_region_id(lat: float, lon: float) -> int:
    """Return integer region ID for a lat/lon point.

    0 = Arabian Sea, 1 = Bay of Bengal, 2 = Open Ocean.
    """
    as_cfg = REGIONS["arabian_sea"]
    bob_cfg = REGIONS["bay_of_bengal"]

    if (as_cfg["lat_min"] <= lat <= as_cfg["lat_max"] and
            as_cfg["lon_min"] <= lon <= as_cfg["lon_max"]):
        return 0  # Arabian Sea

    if (bob_cfg["lat_min"] <= lat <= bob_cfg["lat_max"] and
            bob_cfg["lon_min"] <= lon <= bob_cfg["lon_max"]):
        return 1  # Bay of Bengal

    return 2  # Open Ocean


def get_region_name(lat: float, lon: float) -> str:
    """Return region name string for a given lat/lon."""
    rid = get_region_id(lat, lon)
    if rid == 0:
        return "Arabian Sea"
    elif rid == 1:
        return "Bay of Bengal"
    return "Open Ocean"


def get_region_grid() -> np.ndarray:
    """Return a 2D array of region IDs for each grid point.

    Shape: (n_lat, n_lon)
    """
    lats, lons = make_grid()
    region_map = np.full((len(lats), len(lons)), 2, dtype=np.int32)  # default: open ocean

    for i, lat in enumerate(lats):
        for j, lon in enumerate(lons):
            region_map[i, j] = get_region_id(lat, lon)

    return region_map


def nearest_grid_index(
    target_lat: float,
    target_lon: float,
    lats: np.ndarray | None = None,
    lons: np.ndarray | None = None,
) -> Tuple[int, int]:
    """Return (lat_idx, lon_idx) of the nearest grid point.

    Raises ValueError if target is outside the domain.
    """
    lats = lats if lats is not None else make_grid()[0]
    lons = lons if lons is not None else make_grid()[1]

    if not (DOMAIN["lat_min"] <= target_lat <= DOMAIN["lat_max"]):
        raise ValueError(
            f"Latitude {target_lat} outside domain [{DOMAIN['lat_min']}, {DOMAIN['lat_max']}]"
        )
    if not (DOMAIN["lon_min"] <= target_lon <= DOMAIN["lon_max"]):
        raise ValueError(
            f"Longitude {target_lon} outside domain [{DOMAIN['lon_min']}, {DOMAIN['lon_max']}]"
        )

    lat_idx = int(np.argmin(np.abs(lats - target_lat)))
    lon_idx = int(np.argmin(np.abs(lons - target_lon)))
    return lat_idx, lon_idx
