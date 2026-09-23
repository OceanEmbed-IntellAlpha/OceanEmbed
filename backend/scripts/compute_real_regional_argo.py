"""Compute regional Argo validation metrics from real profile/model collocations.

The script deliberately reuses the date-grouped full-field inference used by
``compute_real_argo_validation.py``.  ``ModelService.predict_profile`` calls
the same ``predict_full_3d`` method for every profile; grouping by date gives
identical nearest-grid-point predictions without repeatedly evaluating the
same daily field.  No metric is estimated, scaled, or randomly generated.
"""

from __future__ import annotations

import hashlib
import json
import logging
import sys
import time
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.api.services.argo_service import MODEL_DEPTHS, _interp_to_model_depths
from backend.api.services.model_service import ModelService

ARGO_FILE = ROOT / "data" / "argo" / "argo_nio_all.json"
OUTPUT_FILE = ROOT / "data" / "argo" / "regional_stats.json"

# Bounds requested for the corrected regional report.  Bounds are inclusive.
REGIONS = {
    "arabian_sea": {"name": "Arabian Sea", "lat": (5.0, 25.0), "lon": (45.0, 75.0)},
    "bay_of_bengal": {"name": "Bay of Bengal", "lat": (5.0, 25.0), "lon": (80.0, 100.0)},
    "north_indian_ocean": {"name": "North Indian Ocean", "lat": (5.0, 30.0), "lon": (45.0, 105.0)},
}

LOG = logging.getLogger("real_regional_argo")


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def in_region(profile: dict[str, Any], region: dict[str, Any]) -> bool:
    return (
        region["lat"][0] <= float(profile["lat"]) <= region["lat"][1]
        and region["lon"][0] <= float(profile["lon"]) <= region["lon"][1]
    )


def rmse(values: Iterable[float]) -> float | None:
    array = np.asarray(list(values), dtype=np.float64)
    return float(np.sqrt(np.mean(array**2))) if array.size else None


def compute_metrics(pairs: list[tuple[np.ndarray, np.ndarray]]) -> dict[str, Any]:
    """Compute only from finite model/Argo depth pairs."""
    residuals: list[float] = []
    model_values: list[float] = []
    argo_values: list[float] = []
    per_depth: dict[float, list[float]] = defaultdict(list)

    for predicted, observed in pairs:
        for index, depth in enumerate(MODEL_DEPTHS):
            pred = float(predicted[index])
            obs = float(observed[index])
            if np.isfinite(pred) and np.isfinite(obs):
                diff = pred - obs
                residuals.append(diff)
                model_values.append(pred)
                argo_values.append(obs)
                per_depth[float(depth)].append(diff)

    if not residuals:
        return {
            "n_profiles": len(pairs),
            "n_measurements": 0,
            "rmse": None,
            "mae": None,
            "bias": None,
            "correlation": None,
            "rmse_by_band": {"mixed_layer": None, "thermocline": None, "deep": None},
            "rmse_by_depth": [],
        }

    residual_array = np.asarray(residuals, dtype=np.float64)
    model_array = np.asarray(model_values, dtype=np.float64)
    argo_array = np.asarray(argo_values, dtype=np.float64)
    correlation = (
        float(np.corrcoef(model_array, argo_array)[0, 1])
        if np.std(model_array) > 1e-12 and np.std(argo_array) > 1e-12
        else None
    )

    bands = {"mixed_layer": [], "thermocline": [], "deep": []}
    per_depth_rows = []
    for depth in MODEL_DEPTHS:
        depth_float = float(depth)
        values = per_depth.get(depth_float, [])
        if depth_float <= 50.0:
            band = "mixed_layer"
        elif depth_float <= 200.0:
            band = "thermocline"
        else:
            band = "deep"
        bands[band].extend(values)
        per_depth_rows.append(
            {
                "depth_m": round(depth_float, 2),
                "n_measurements": len(values),
                "rmse": round(rmse(values), 4) if values else None,
            }
        )

    return {
        "n_profiles": len(pairs),
        "n_measurements": len(residuals),
        "rmse": round(rmse(residual_array), 4),
        "mae": round(float(np.mean(np.abs(residual_array))), 4),
        "bias": round(float(np.mean(residual_array)), 4),
        "correlation": round(correlation, 4) if correlation is not None else None,
        "rmse_by_band": {
            name: round(rmse(values), 4) if values else None for name, values in bands.items()
        },
        "rmse_by_depth": per_depth_rows,
    }


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
    if not ARGO_FILE.exists():
        raise FileNotFoundError(ARGO_FILE)

    with ARGO_FILE.open(encoding="utf-8") as handle:
        profiles = json.load(handle)
    LOG.info("Loaded %d Argo profiles from %s", len(profiles), ARGO_FILE)

    profiles_by_date: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for profile in profiles:
        profiles_by_date[profile["date"]].append(profile)

    service = ModelService.get_instance()
    LOG.info("Running date-grouped ModelService.predict_full_3d inference for %d dates", len(profiles_by_date))
    started = time.monotonic()
    collocations: list[tuple[dict[str, Any], np.ndarray, np.ndarray]] = []
    skipped_dates: list[dict[str, str]] = []

    for date_index, (date_str, date_profiles) in enumerate(profiles_by_date.items(), start=1):
        try:
            temperature_3d, _, _, _ = service.predict_full_3d(date_str)
        except Exception as exc:  # preserve evidence rather than silently inventing a value
            LOG.warning("Skipping %s: %s", date_str, exc)
            skipped_dates.append({"date": date_str, "error": str(exc)})
            continue

        for profile in date_profiles:
            lat_idx, lon_idx, _, _ = service.find_nearest_lat_lon(profile["lat"], profile["lon"])
            predicted = temperature_3d[:, lat_idx, lon_idx]
            observed = np.asarray(
                _interp_to_model_depths(profile["depths"], profile["temperature"], MODEL_DEPTHS),
                dtype=np.float64,
            )
            if np.count_nonzero(np.isfinite(predicted) & np.isfinite(observed)) >= 3:
                collocations.append((profile, predicted, observed))

        if date_index % 100 == 0:
            LOG.info("Processed %d/%d dates; %d valid collocations", date_index, len(profiles_by_date), len(collocations))

    region_metrics = {}
    for key, region in REGIONS.items():
        pairs = [(prediction, observed) for profile, prediction, observed in collocations if in_region(profile, region)]
        region_metrics[key] = {"name": region["name"], "bounds": {"lat": region["lat"], "lon": region["lon"]}, **compute_metrics(pairs)}

    elapsed = time.monotonic() - started
    output = {
        "_provenance": {
            "generated_at_utc": datetime.now(timezone.utc).isoformat(),
            "script": str(Path(__file__).relative_to(ROOT)).replace("\\", "/"),
            "source_profiles": str(ARGO_FILE.relative_to(ROOT)).replace("\\", "/"),
            "source_profile_count": len(profiles),
            "source_sha256": sha256(ARGO_FILE),
            "model_checkpoint": str(service.checkpoint_path.relative_to(ROOT)).replace("\\", "/"),
            "model_checkpoint_sha256": sha256(service.checkpoint_path),
            "method": "date-grouped ModelService.predict_full_3d; nearest grid cell; Argo interpolated to MODEL_DEPTHS; finite collocations require >=3 depths",
            "model_depths_m": [float(depth) for depth in MODEL_DEPTHS],
            "skipped_dates": skipped_dates,
            "elapsed_seconds": round(elapsed, 2),
            "no_randomness_or_metric_scaling": True,
        },
        "n_valid_collocations": len(collocations),
        "regions": region_metrics,
    }
    with OUTPUT_FILE.open("w", encoding="utf-8") as handle:
        json.dump(output, handle, indent=2)
        handle.write("\n")

    print(json.dumps({"n_valid_collocations": len(collocations), "regions": region_metrics}, indent=2))
    LOG.info("Wrote %s in %.2fs", OUTPUT_FILE, elapsed)


if __name__ == "__main__":
    main()
