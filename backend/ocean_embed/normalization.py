"""
OceanEmbed — Normalization utilities.

Computes and applies feature normalization statistics,
fitted only on training data (leakage prevention).
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Dict, Optional

import numpy as np
import xarray as xr
import yaml

logger = logging.getLogger(__name__)


CHANNEL_NAMES = ["sst", "sss", "ssh", "current_u", "current_v", "wind_u", "wind_v"]
TARGET_VAR = "thetao"

# Fallback reference ranges (used only if no stats file exists yet).
# These are scientifically motivated approximations for the North Indian Ocean.
# Replace with computed values from real training data.
REFERENCE_STATS: Dict[str, Dict[str, float]] = {
    "sst":       {"mean": 27.0,  "std": 2.5},
    "sss":       {"mean": 34.5,  "std": 1.2},
    "ssh":       {"mean": 0.0,   "std": 0.15},
    "current_u": {"mean": 0.0,   "std": 0.20},
    "current_v": {"mean": 0.0,   "std": 0.20},
    "wind_u":    {"mean": 0.0,   "std": 4.0},
    "wind_v":    {"mean": 0.0,   "std": 4.0},
    "target_temp": {"mean": 15.0, "std": 10.0},  # subsurface temperature
}


class NormalizationStats:
    """Container for per-channel normalization statistics.

    Stats are computed from training data only to prevent leakage.
    """

    def __init__(self, stats: Optional[Dict[str, Dict[str, float]]] = None):
        self.stats: Dict[str, Dict[str, float]] = stats or {}
        self._fitted = bool(stats)

    @classmethod
    def from_reference(cls) -> "NormalizationStats":
        """Return stats initialized from scientifically motivated reference values.

        These should be replaced with stats computed from real training data.
        """
        logger.warning(
            "Using reference (approximate) normalization stats. "
            "Compute from real training data before training."
        )
        return cls(REFERENCE_STATS.copy())

    @classmethod
    def from_file(cls, path: Path | str) -> "NormalizationStats":
        """Load stats from a JSON or YAML file."""
        path = Path(path)
        with open(path, encoding="utf-8") as f:
            if path.suffix.lower() == ".json":
                raw = json.load(f)
            else:
                raw = yaml.safe_load(f)

        stats = {}
        # Handle nested formats: e.g. {"surface": {"sst": {...}}, "target": ...}
        if isinstance(raw, dict) and "surface" in raw and isinstance(raw["surface"], dict):
            for k, v in raw["surface"].items():
                stats[k] = v
        elif isinstance(raw, dict):
            for k, v in raw.items():
                if isinstance(v, dict) and "mean" in v and "std" in v:
                    stats[k] = v

        # Bidirectional aliases between short and dataset channel names
        aliases = {
            "sst": "analysed_sst",
            "sss": "sos",
            "ssh": "sla",
            "current_u": "u",
            "current_v": "v",
            "wind_u": "uwnd",
            "wind_v": "vwnd",
        }
        for short_name, long_name in aliases.items():
            if long_name in stats and short_name not in stats:
                stats[short_name] = stats[long_name]
            elif short_name in stats and long_name not in stats:
                stats[long_name] = stats[short_name]

        # Handle target per-depth or global target_temp stats
        if isinstance(raw, dict) and "target" in raw:
            if isinstance(raw["target"], list):
                stats["target_per_depth"] = raw["target"]
                means = [lvl["mean"] for lvl in raw["target"] if "mean" in lvl]
                stds = [lvl["std"] for lvl in raw["target"] if "std" in lvl]
                if means and stds and "target_temp" not in stats:
                    stats["target_temp"] = {
                        "mean": float(np.mean(means)),
                        "std": float(np.mean(stds)),
                    }
            elif isinstance(raw["target"], dict) and "mean" in raw["target"]:
                stats["target_temp"] = raw["target"]

        logger.info(f"Loaded normalization stats for {len(stats)} channels from {path}")
        return cls(stats)

    @classmethod
    def from_json(cls, path: Path | str) -> "NormalizationStats":
        """Load stats directly from a JSON file."""
        return cls.from_file(path)

    def save(self, path: Path | str) -> None:
        """Save stats to a JSON or YAML file."""
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            if path.suffix.lower() == ".json":
                json.dump(self.stats, f, indent=2)
            else:
                yaml.dump(self.stats, f, default_flow_style=False)
        logger.info(f"Saved normalization stats to {path}")

    def compute_from_dataset(
        self,
        ds: xr.Dataset,
        channel_vars: Dict[str, str],
    ) -> None:
        """Compute mean and std for each channel from an xarray Dataset.

        Args:
            ds: xarray Dataset with training data
            channel_vars: mapping from channel_name → variable name in ds
        """
        for channel_name, var_name in channel_vars.items():
            if var_name not in ds:
                logger.warning(f"Variable {var_name} not found in dataset; skipping.")
                continue

            values = ds[var_name].values
            valid_mask = np.isfinite(values)
            valid_values = values[valid_mask]

            if len(valid_values) == 0:
                logger.warning(f"No valid values for {var_name}; using reference stats.")
                if channel_name in REFERENCE_STATS:
                    self.stats[channel_name] = REFERENCE_STATS[channel_name].copy()
                continue

            self.stats[channel_name] = {
                "mean": float(np.mean(valid_values)),
                "std": float(np.std(valid_values)),
                "n_valid": int(len(valid_values)),
            }
            logger.info(
                f"  {channel_name}: mean={self.stats[channel_name]['mean']:.3f}, "
                f"std={self.stats[channel_name]['std']:.3f}"
            )

        self._fitted = True

    def normalize(self, values: np.ndarray, channel: str) -> np.ndarray:
        """Standardize values for a named channel.

        Missing values (NaN) are preserved.
        """
        # Check per-depth target normalization
        if channel in ("target_temp", "target") and "target_per_depth" in self.stats:
            depth_stats = self.stats["target_per_depth"]
            if values.ndim >= 2 and values.shape[0] == len(depth_stats):
                out = values.copy()
                for d_idx, lvl in enumerate(depth_stats):
                    m = lvl.get("mean", 0.0)
                    s = lvl.get("std", 1.0)
                    if s != 0:
                        out[d_idx] = (out[d_idx] - m) / s
                    else:
                        out[d_idx] = out[d_idx] - m
                return out

        if channel not in self.stats:
            logger.warning(f"No stats for channel '{channel}'; skipping normalization.")
            return values

        mean = self.stats[channel]["mean"]
        std = self.stats[channel]["std"]
        if std == 0:
            return values - mean
        return (values - mean) / std

    def denormalize(self, values: np.ndarray, channel: str) -> np.ndarray:
        """Reverse standardization for a named channel."""
        if channel in ("target_temp", "target") and "target_per_depth" in self.stats:
            depth_stats = self.stats["target_per_depth"]
            if values.ndim >= 2 and values.shape[0] == len(depth_stats):
                out = values.copy()
                for d_idx, lvl in enumerate(depth_stats):
                    m = lvl.get("mean", 0.0)
                    s = lvl.get("std", 1.0)
                    out[d_idx] = out[d_idx] * s + m
                return out

        if channel not in self.stats:
            return values

        mean = self.stats[channel]["mean"]
        std = self.stats[channel]["std"]
        return values * std + mean

    def normalize_array(
        self,
        data: np.ndarray,
        channels: list[str],
        channel_axis: int = 0,
    ) -> np.ndarray:
        """Normalize a multi-channel array.

        Args:
            data: array with channels along channel_axis
            channels: list of channel names matching the channel axis
            channel_axis: which axis contains the channels
        """
        result = data.copy().astype(np.float32)
        for i, channel in enumerate(channels):
            slices = [slice(None)] * data.ndim
            slices[channel_axis] = i
            result[tuple(slices)] = self.normalize(result[tuple(slices)], channel)
        return result


# Standard surface variables
SURFACE_VARS = ["analysed_sst", "sos", "sla", "u", "v", "uwnd", "vwnd"]


def load_normalization_stats(path: Path | str) -> Dict[str, Any]:
    """Load normalization statistics dictionary from JSON or YAML file."""
    path = Path(path)
    with open(path, encoding="utf-8") as f:
        if path.suffix.lower() == ".json":
            return json.load(f)
        return yaml.safe_load(f)


def apply_surface_norm(data: np.ndarray, stats: Dict[str, Any] | NormalizationStats, channel_names: list[str]) -> np.ndarray:
    """Normalize multi-channel surface observation tensor.

    Args:
        data: array with shape (..., C, H, W)
        stats: dictionary of stats or NormalizationStats instance
        channel_names: list of channel names
    """
    out = data.copy()
    if isinstance(stats, NormalizationStats):
        stats_dict = stats.stats
    else:
        stats_dict = stats

    for i, c in enumerate(channel_names):
        if "surface" in stats_dict and isinstance(stats_dict["surface"], dict) and c in stats_dict["surface"]:
            c_stats = stats_dict["surface"][c]
        elif c in stats_dict:
            c_stats = stats_dict[c]
        else:
            continue

        m = c_stats["mean"]
        s = c_stats["std"]
        if s > 0:
            out[:, i] = (out[:, i] - m) / s
        else:
            out[:, i] = out[:, i] - m
    return out


def denormalize_target(
    arr: np.ndarray,
    stats: Dict[str, Any] | NormalizationStats,
    depth_axis: int = -3,
) -> np.ndarray:
    """Denormalize target temperature predictions/observations back to physical units (°C)."""
    if isinstance(stats, NormalizationStats):
        raw_stats = stats.stats
    else:
        raw_stats = stats

    out = arr.copy()
    if isinstance(raw_stats, dict) and "target" in raw_stats and isinstance(raw_stats["target"], list):
        target_list = raw_stats["target"]
        num_depths = len(target_list)
        d_dim = None
        if arr.ndim >= 2:
            if arr.shape[depth_axis] == num_depths:
                d_dim = depth_axis
            else:
                for ax, s in enumerate(arr.shape):
                    if s == num_depths:
                        d_dim = ax
                        break
        if d_dim is not None:
            for d_idx, lvl in enumerate(target_list):
                m = lvl.get("mean", 0.0)
                s = lvl.get("std", 1.0)
                sl = [slice(None)] * arr.ndim
                sl[d_dim] = d_idx
                out[tuple(sl)] = out[tuple(sl)] * s + m
            return out

    if isinstance(raw_stats, dict) and "target_temp" in raw_stats:
        m = raw_stats["target_temp"].get("mean", 15.0)
        s = raw_stats["target_temp"].get("std", 10.0)
        return out * s + m

    return out


# Alias
Normalizer = NormalizationStats

