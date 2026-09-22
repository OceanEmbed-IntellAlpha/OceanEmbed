"""
Phase 8C — Argo Service.

Loads cached Argo profiles from data/argo/ and answers:
  - Nearby profiles within radius_km of a coordinate
  - Profile by float ID
  - Validation matchup (model vs Argo at a given point/date)
  - Regional validation statistics

All data is loaded once at startup and held in memory (profiles are ~few MB).
"""

from __future__ import annotations

import json
import logging
import math
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np

logger = logging.getLogger(__name__)

ROOT = Path(__file__).resolve().parents[3]
ARGO_DIR = ROOT / "data" / "argo"

# Model native depth levels (GLORYS12V1 / SIH_DEPTHS)
MODEL_DEPTHS = [
    0.49, 5.08, 14.19, 26.84, 42.55, 59.81,
    78.49, 99.45, 123.94, 153.08, 188.50,
    233.07, 290.24, 365.13, 902.34,
]

# Empirical per-depth RMSE from test-set evaluation (Phase 6.2)
DEPTH_RMSE = [
    0.4149, 0.4113, 0.4069, 0.4260, 0.4592, 0.5271, 0.7512,
    0.8404, 0.7866, 0.6939, 0.5624, 0.3160, 0.2270, 0.2336, 0.2392,
]


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance between two (lat, lon) points in km."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _interp_to_model_depths(
    argo_depths: List[float],
    argo_temps: List[float],
    target_depths: List[float] = MODEL_DEPTHS,
) -> List[float]:
    """Linearly interpolate Argo profile to model depth levels."""
    if len(argo_depths) < 2:
        return [float("nan")] * len(target_depths)

    arr_d = np.array(argo_depths, dtype=float)
    arr_t = np.array(argo_temps, dtype=float)

    # Sort by depth
    sort_idx = np.argsort(arr_d)
    arr_d = arr_d[sort_idx]
    arr_t = arr_t[sort_idx]

    return list(np.interp(target_depths, arr_d, arr_t))


class ArgoService:
    """Singleton Argo observation service backed by cached ArgoVis data."""

    _instance: Optional["ArgoService"] = None

    def __init__(self) -> None:
        self._profiles_2022: List[Dict] = []
        self._profiles_all: List[Dict] = []
        self._regional_stats: List[Dict] = []
        self._profile_index: Dict[str, Dict] = {}  # floatId -> profile
        self._available = False
        self._load()

    @classmethod
    def get_instance(cls) -> "ArgoService":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def _load(self) -> None:
        """Load cached Argo data from disk. Non-fatal if files don't exist."""
        argo_2022_path = ARGO_DIR / "argo_nio_2022.json"
        argo_all_path = ARGO_DIR / "argo_nio_all.json"
        regional_stats_path = ARGO_DIR / "regional_stats.json"

        if not argo_2022_path.exists():
            logger.warning(
                f"Argo cache not found at {argo_2022_path}. "
                "Run backend/scripts/ingest_argo.py to populate."
            )
            return

        try:
            with open(argo_2022_path) as f:
                self._profiles_2022 = json.load(f)
            logger.info(f"Loaded {len(self._profiles_2022)} Argo 2022 profiles from cache")

            if argo_all_path.exists():
                with open(argo_all_path) as f:
                    self._profiles_all = json.load(f)
                logger.info(f"Loaded {len(self._profiles_all)} all-year Argo profiles from cache")
            else:
                self._profiles_all = self._profiles_2022

            if regional_stats_path.exists():
                with open(regional_stats_path) as f:
                    self._regional_stats = json.load(f)
                logger.info(f"Loaded {len(self._regional_stats)} regional stats")

            # Build index for O(1) profile lookup
            for p in self._profiles_all:
                fid = p.get("floatId", "")
                if fid:
                    self._profile_index[fid] = p

            self._available = True

        except Exception as e:
            logger.error(f"Failed to load Argo cache: {e}", exc_info=True)
            self._available = False

    @property
    def is_available(self) -> bool:
        return self._available

    def get_nearby(
        self,
        lat: float,
        lon: float,
        date_str: str,
        radius_km: float = 200.0,
        max_days: int = 30,
        max_profiles: int = 20,
    ) -> List[Dict]:
        """
        Return Argo profiles within radius_km of (lat, lon) and ±max_days of date.
        Falls back to all-year profiles if 2022 has no results.
        """
        if not self._available:
            return []

        try:
            target_date = datetime.strptime(date_str, "%Y-%m-%d")
        except ValueError:
            target_date = datetime.now()

        date_min = target_date - timedelta(days=max_days)
        date_max = target_date + timedelta(days=max_days)

        def _matches(p: Dict) -> bool:
            try:
                p_date = datetime.strptime(p["date"], "%Y-%m-%d")
            except (ValueError, KeyError):
                return False
            if not (date_min <= p_date <= date_max):
                return False
            dist = _haversine_km(lat, lon, p["lat"], p["lon"])
            return dist <= radius_km

        # Try 2022 first; fall back to all profiles
        candidates = [p for p in self._profiles_2022 if _matches(p)]
        if not candidates:
            candidates = [p for p in self._profiles_all if _matches(p)]

        # Sort by distance
        candidates.sort(key=lambda p: _haversine_km(lat, lon, p["lat"], p["lon"]))
        return candidates[:max_profiles]

    def get_profile(self, float_id: str) -> Optional[Dict]:
        """Return a single Argo profile by float ID."""
        if not self._available:
            return None
        return self._profile_index.get(float_id)

    def get_regional_stats(self) -> List[Dict]:
        """Return pre-computed regional validation statistics."""
        return self._regional_stats

    def compute_validation_matchup(
        self,
        lat: float,
        lon: float,
        date_str: str,
        model_temps: List[float],
        model_depths: List[float] = MODEL_DEPTHS,
    ) -> Optional[Dict]:
        """
        Find nearest Argo profile and compute model vs Argo matchup statistics.
        Returns None if no nearby profile is found.
        """
        if not self._available:
            return None

        # Find nearest profile within 200km, 30 days
        nearby = self.get_nearby(lat, lon, date_str, radius_km=200.0, max_days=30, max_profiles=1)
        if not nearby:
            return None

        argo = nearby[0]

        # Interpolate Argo to model depth levels
        argo_at_model_depths = _interp_to_model_depths(
            argo["depths"], argo["temperature"], model_depths
        )

        # Compute delta, RMSE, bias, correlation
        model_arr = np.array(model_temps, dtype=float)
        argo_arr = np.array(argo_at_model_depths, dtype=float)

        valid_mask = ~np.isnan(argo_arr)
        if valid_mask.sum() < 3:
            return None

        delta = (model_arr - argo_arr).tolist()
        model_valid = model_arr[valid_mask]
        argo_valid = argo_arr[valid_mask]

        rmse = float(np.sqrt(np.mean((model_valid - argo_valid) ** 2)))
        bias = float(np.mean(model_valid - argo_valid))

        # Correlation
        if np.std(model_valid) > 0 and np.std(argo_valid) > 0:
            corr = float(np.corrcoef(model_valid, argo_valid)[0, 1])
        else:
            corr = 0.0

        return {
            "lat": argo["lat"],
            "lon": argo["lon"],
            "date": argo["date"],
            "depths": [float(d) for d in model_depths],
            "modelTemp": [round(float(t), 3) for t in model_temps],
            "argoTemp": [round(float(t), 3) if not math.isnan(t) else None for t in argo_at_model_depths],
            "delta": [round(float(d), 3) if not math.isnan(d) else None for d in delta],
            "rmse": round(rmse, 4),
            "bias": round(bias, 4),
            "correlation": round(corr, 4),
        }
