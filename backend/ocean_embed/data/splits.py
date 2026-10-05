"""
OceanEmbed — Temporal data splitting utilities.

Provides:
- make_date_range_split: Splits time indices according to explicit date ranges.
- make_temporal_split: Splits time indices chronologically by fraction.
- config_driven_split: Loads date ranges from data_config.yaml.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple, Union

import numpy as np
import pandas as pd
import yaml

logger = logging.getLogger(__name__)


def _to_timestamp_array(times: Sequence[Any]) -> pd.DatetimeIndex:
    """Convert sequence of dates/times/strings to pandas DatetimeIndex."""
    return pd.to_datetime(times)


def make_date_range_split(
    times: Sequence[Any],
    train_range: Sequence[str],
    val_range: Sequence[str],
    test_range: Sequence[str],
) -> Dict[str, np.ndarray]:
    """Split time indices according to explicit date ranges.

    Args:
        times: Array/Series of dates (datetime64 or string)
        train_range: [start_date, end_date] strings inclusive
        val_range: [start_date, end_date] strings inclusive
        test_range: [start_date, end_date] strings inclusive

    Returns:
        Dict mapping 'train', 'val', 'test' to 1D integer index arrays.
    """
    dt_index = _to_timestamp_array(times)

    def _get_indices(date_range: Sequence[str]) -> np.ndarray:
        start = pd.to_datetime(date_range[0])
        end = pd.to_datetime(date_range[1]) + pd.Timedelta(days=1) - pd.Timedelta(nanoseconds=1)
        mask = (dt_index >= start) & (dt_index <= end)
        return np.where(mask)[0]

    train_idx = _get_indices(train_range)
    val_idx = _get_indices(val_range)
    test_idx = _get_indices(test_range)

    logger.info(
        f"Temporal split sizes: train={len(train_idx)} ({train_range[0]} to {train_range[1]}), "
        f"val={len(val_idx)} ({val_range[0]} to {val_range[1]}), "
        f"test={len(test_idx)} ({test_range[0]} to {test_range[1]})"
    )

    return {
        "train": train_idx,
        "val": val_idx,
        "test": test_idx,
    }


def make_temporal_split(
    times: Sequence[Any],
    train_frac: float = 0.70,
    val_frac: float = 0.15,
    test_frac: float = 0.15,
) -> Dict[str, np.ndarray]:
    """Split time indices chronologically by fractional proportions."""
    n = len(times)
    n_train = int(n * train_frac)
    n_val = int(n * val_frac)

    train_idx = np.arange(0, n_train)
    val_idx = np.arange(n_train, n_train + n_val)
    test_idx = np.arange(n_train + n_val, n)

    return {
        "train": train_idx,
        "val": val_idx,
        "test": test_idx,
    }


def config_driven_split(
    times: Sequence[Any],
    config_path: Optional[Path | str] = None,
) -> Dict[str, np.ndarray]:
    """Load date ranges from data_config.yaml and split time indices."""
    if config_path is None:
        root = Path(__file__).resolve().parents[3]
        config_path = root / "backend" / "ocean_embed" / "configs" / "data_config.yaml"

    config_path = Path(config_path)
    with open(config_path, encoding="utf-8") as f:
        cfg = yaml.safe_load(f)

    splits = cfg.get("splits", {})
    if "train_range" in splits:
        return make_date_range_split(
            times,
            splits["train_range"],
            splits["val_range"],
            splits["test_range"],
        )
    elif "train" in splits:
        return make_date_range_split(
            times,
            [splits["train"]["start"], splits["train"]["end"]],
            [splits["validation"]["start"], splits["validation"]["end"]],
            [splits["test"]["start"], splits["test"]["end"]],
        )
    else:
        raise ValueError(f"No recognizable splits format found in {config_path}")
