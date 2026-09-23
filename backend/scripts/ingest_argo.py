#!/usr/bin/env python3
"""
Phase 8C — Argo Data Ingestion Script.

Downloads North Indian Ocean Argo float profiles for 2020-2022 from the
ArgoVis REST API (https://argovis-api.colorado.edu) and caches them as
JSON in data/argo/.

Run once:
    python backend/scripts/ingest_argo.py

Outputs:
    data/argo/argo_nio_2022.json   # 2022 test-year profiles (primary)
    data/argo/argo_nio_all.json    # 2020-2022 profiles (for regional stats)

Regional model-validation statistics are intentionally not produced here.
Run ``backend/scripts/compute_real_regional_argo.py`` after ingestion; it
performs real ModelService/Argo collocation and records provenance.
"""

from __future__ import annotations

import json
import logging
import sys
import time
from datetime import date, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional

import requests

# ── Config ────────────────────────────────────────────────────────────────────

ARGOVIS_BASE = "https://argovis-api.colorado.edu"

# North Indian Ocean bounding box [lon_min, lat_min, lon_max, lat_max]
# ArgoVis polygon: list of [lon, lat] pairs, closed ring
NIO_POLYGON = [[45, 5], [105, 5], [105, 30], [45, 30], [45, 5]]
NIO_POLYGON_STR = json.dumps(NIO_POLYGON)

ROOT = Path(__file__).resolve().parents[2]
OUTPUT_DIR = ROOT / "data" / "argo"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)


# ── ArgoVis Fetcher ───────────────────────────────────────────────────────────

def fetch_argo_month(year: int, month: int, max_retries: int = 3) -> List[Dict]:
    """Fetch all Argo profiles for a single month in the NIO domain."""
    start_day = date(year, month, 1)
    if month == 12:
        end_day = date(year + 1, 1, 1)
    else:
        end_day = date(year, month + 1, 1)

    url = f"{ARGOVIS_BASE}/argo"
    params = {
        "polygon": NIO_POLYGON_STR,
        "startDate": start_day.strftime("%Y-%m-%dT00:00:00Z"),
        "endDate": end_day.strftime("%Y-%m-%dT00:00:00Z"),
        "data": "temperature,salinity,pressure",  # Required to include measurement arrays
    }

    for attempt in range(max_retries):
        try:
            r = requests.get(url, params=params, timeout=30)
            if r.status_code == 200:
                return r.json()
            elif r.status_code == 429:
                wait = 2 ** attempt * 5
                logger.warning(f"Rate limited, waiting {wait}s...")
                time.sleep(wait)
            else:
                logger.warning(f"HTTP {r.status_code} for {year}-{month:02d}: {r.text[:200]}")
                return []
        except requests.RequestException as e:
            logger.warning(f"Request error for {year}-{month:02d} (attempt {attempt+1}): {e}")
            if attempt < max_retries - 1:
                time.sleep(2 ** attempt)

    return []


def parse_profile(raw: Dict) -> Optional[Dict]:
    """Parse ArgoVis profile into canonical format.
    
    ArgoVis returns data in COLUMN-MAJOR format when ?data= is used:
      data_info[0] = ['temperature', 'salinity', 'pressure']
      data[0]      = [temp_at_depth0, temp_at_depth1, ...]
      data[1]      = [sal_at_depth0, sal_at_depth1, ...]
      data[2]      = [press_at_depth0, press_at_depth1, ...]
    """
    try:
        profile_id = raw.get("_id", "unknown")
        geo = raw.get("geolocation", {}).get("coordinates", [None, None])
        lon, lat = geo[0], geo[1]
        timestamp = raw.get("timestamp", "")
        date_str = timestamp[:10] if timestamp else ""

        data_info = raw.get("data_info", [])
        if not data_info or len(data_info) < 1:
            return None

        columns = data_info[0]  # ['temperature', 'salinity', 'pressure']
        col_idx = {name: i for i, name in enumerate(columns)}

        data = raw.get("data", [])
        if not data:
            return None

        temp_idx = col_idx.get("temperature")
        salt_idx = col_idx.get("salinity")
        press_idx = col_idx.get("pressure")

        if temp_idx is None or press_idx is None:
            return None

        # Column-major: data[col_idx] is the full array for that variable
        temperatures_raw = data[temp_idx] if temp_idx < len(data) else []
        pressures_raw = data[press_idx] if press_idx < len(data) else []
        salinities_raw = data[salt_idx] if salt_idx is not None and salt_idx < len(data) else []

        if not temperatures_raw or not pressures_raw:
            return None

        n = min(len(temperatures_raw), len(pressures_raw))

        depths: List[float] = []
        temperatures: List[float] = []
        salinities: List[Optional[float]] = []
        qcs: List[str] = []

        for i in range(n):
            press = pressures_raw[i]
            temp = temperatures_raw[i]

            if press is None or temp is None:
                continue
            if not (0 <= float(press) <= 2000):
                continue

            salt = salinities_raw[i] if i < len(salinities_raw) else None
            depths.append(float(press))
            temperatures.append(float(temp))
            salinities.append(float(salt) if salt is not None else None)
            qcs.append("good")  # ArgoVis already filters by QC=1,2

        if len(depths) < 3:
            return None

        has_salinity = any(s is not None for s in salinities)

        return {
            "floatId": str(profile_id),
            "lat": round(float(lat), 4),
            "lon": round(float(lon), 4),
            "date": date_str,
            "depths": depths,
            "temperature": temperatures,
            "salinity": salinities if has_salinity else None,
            "qc": qcs,
            "source": "argo",
        }
    except Exception as e:
        logger.debug(f"Failed to parse profile {raw.get('_id', '?')}: {e}")
        return None


def fetch_year(year: int, months: Optional[List[int]] = None) -> List[Dict]:
    """Fetch all valid profiles for a given year."""
    if months is None:
        months = list(range(1, 13))

    profiles: List[Dict] = []
    for month in months:
        logger.info(f"  Fetching {year}-{month:02d}...")
        raw_profiles = fetch_argo_month(year, month)
        parsed = [parse_profile(p) for p in raw_profiles]
        valid = [p for p in parsed if p is not None]
        profiles.extend(valid)
        logger.info(f"    Got {len(raw_profiles)} raw, {len(valid)} valid profiles")
        time.sleep(0.3)  # Polite rate limiting

    return profiles


# ── Regional Stats ────────────────────────────────────────────────────────────

# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    logger.info("=" * 60)
    logger.info("OceanEmbed — Phase 8C: Argo Data Ingestion")
    logger.info("=" * 60)

    # 1. Fetch 2022 test-year profiles
    out_2022 = OUTPUT_DIR / "argo_nio_2022.json"
    if out_2022.exists():
        logger.info(f"2022 profiles already cached. Loading...")
        with open(out_2022) as f:
            profiles_2022 = json.load(f)
        logger.info(f"Loaded {len(profiles_2022)} profiles.")
    else:
        logger.info("Fetching 2022 profiles from ArgoVis...")
        profiles_2022 = fetch_year(2022)
        with open(out_2022, "w") as f:
            json.dump(profiles_2022, f, separators=(",", ":"))
        logger.info(f"Saved {len(profiles_2022)} profiles to {out_2022}")

    # 2. Fetch broader sample for regional stats (2020-2022)
    out_all = OUTPUT_DIR / "argo_nio_all.json"
    if out_all.exists():
        logger.info(f"All-year profiles already cached. Loading...")
        with open(out_all) as f:
            profiles_all = json.load(f)
        logger.info(f"Loaded {len(profiles_all)} profiles.")
    else:
        logger.info("Fetching 2020-2022 profiles for regional stats...")
        profiles_all = []
        for year in [2020, 2021, 2022]:
            logger.info(f"Fetching year {year}...")
            profiles_all.extend(fetch_year(year))
        with open(out_all, "w") as f:
            json.dump(profiles_all, f, separators=(",", ":"))
        logger.info(f"Saved {len(profiles_all)} profiles to {out_all}")

    logger.info(
        "Profile ingestion complete. Run backend/scripts/compute_real_regional_argo.py "
        "to create provenance-backed regional model validation metrics."
    )

    logger.info("=" * 60)
    logger.info(f"Done! 2022: {len(profiles_2022)} | All: {len(profiles_all)}")
    logger.info("=" * 60)


if __name__ == "__main__":
    main()
