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
        """Load stats from a YAML file."""
        path = Path(path)
        with open(path) as f:
            stats = yaml.safe_load(f)
        logger.info(f"Loaded normalization stats from {path}")
        return cls(stats)

    def save(self, path: Path | str) -> None:
        """Save stats to a YAML file."""
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w") as f:
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


# Alias
Normalizer = NormalizationStats
