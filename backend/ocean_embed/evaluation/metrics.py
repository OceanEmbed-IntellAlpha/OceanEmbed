"""
OceanEmbed — Evaluation metrics.

Implements:
- RMSE, MAE, Bias, Pearson correlation, R²
- Depth-wise error computation
- Regional error computation
- Thermocline depth error
- Uncertainty calibration metrics
"""

from __future__ import annotations

import logging
from typing import Dict, List, Optional, Tuple

import numpy as np

logger = logging.getLogger(__name__)


def rmse(pred: np.ndarray, obs: np.ndarray, mask: Optional[np.ndarray] = None) -> float:
    """Root Mean Square Error.

    Args:
        pred: predicted values, any shape
        obs:  observed values, same shape
        mask: optional validity mask (1=valid, 0=missing)
    """
    diff = pred - obs
    if mask is not None:
        diff = diff[mask.astype(bool)]
    else:
        diff = diff[np.isfinite(obs) & np.isfinite(pred)]
    if len(diff) == 0:
        return np.nan
    return float(np.sqrt(np.mean(diff ** 2)))


def mae(pred: np.ndarray, obs: np.ndarray, mask: Optional[np.ndarray] = None) -> float:
    """Mean Absolute Error."""
    diff = np.abs(pred - obs)
    if mask is not None:
        diff = diff[mask.astype(bool)]
    else:
        diff = diff[np.isfinite(obs) & np.isfinite(pred)]
    if len(diff) == 0:
        return np.nan
    return float(np.mean(diff))


def bias(pred: np.ndarray, obs: np.ndarray, mask: Optional[np.ndarray] = None) -> float:
    """Mean Bias = mean(pred - obs)."""
    diff = pred - obs
    if mask is not None:
        diff = diff[mask.astype(bool)]
    else:
        diff = diff[np.isfinite(obs) & np.isfinite(pred)]
    if len(diff) == 0:
        return np.nan
    return float(np.mean(diff))


def pearson_r(pred: np.ndarray, obs: np.ndarray, mask: Optional[np.ndarray] = None) -> float:
    """Pearson correlation coefficient."""
    if mask is not None:
        p = pred[mask.astype(bool)]
        o = obs[mask.astype(bool)]
    else:
        valid = np.isfinite(obs) & np.isfinite(pred)
        p = pred[valid]
        o = obs[valid]
    if len(p) < 2:
        return np.nan
    return float(np.corrcoef(p, o)[0, 1])


def r_squared(pred: np.ndarray, obs: np.ndarray, mask: Optional[np.ndarray] = None) -> float:
    """R² = 1 - SS_res / SS_tot."""
    if mask is not None:
        p = pred[mask.astype(bool)]
        o = obs[mask.astype(bool)]
    else:
        valid = np.isfinite(obs) & np.isfinite(pred)
        p = pred[valid]
        o = obs[valid]
    if len(p) < 2:
        return np.nan
    ss_res = np.sum((o - p) ** 2)
    ss_tot = np.sum((o - np.mean(o)) ** 2)
    if ss_tot == 0:
        return np.nan
    return float(1.0 - ss_res / ss_tot)


def compute_all_metrics(
    pred: np.ndarray,
    obs: np.ndarray,
    mask: Optional[np.ndarray] = None,
) -> Dict[str, float]:
    """Compute RMSE, MAE, Bias, Pearson r, R² for a prediction/observation pair."""
    return {
        "rmse": rmse(pred, obs, mask),
        "mae": mae(pred, obs, mask),
        "bias": bias(pred, obs, mask),
        "pearson_r": pearson_r(pred, obs, mask),
        "r2": r_squared(pred, obs, mask),
    }


def compute_depth_wise_metrics(
    pred: np.ndarray,    # (D, H, W) or (N_samples, D)
    obs: np.ndarray,
    depths: List[float],
) -> Dict[float, Dict[str, float]]:
    """Compute metrics at each depth level.

    Args:
        pred: (D, ...) predictions
        obs:  (D, ...) observations
        depths: list of depth values, length D

    Returns:
        dict: depth → metrics dict
    """
    assert pred.shape[0] == len(depths), \
        f"Shape mismatch: pred.shape[0]={pred.shape[0]}, len(depths)={len(depths)}"

    result = {}
    for d_idx, z in enumerate(depths):
        p = pred[d_idx].ravel()
        o = obs[d_idx].ravel()
        result[z] = compute_all_metrics(p, o)

    return result


def compute_band_metrics(
    pred: np.ndarray,
    obs: np.ndarray,
    depths: List[float],
    bands: Optional[List[Tuple[float, float]]] = None,
) -> Dict[str, Dict[str, float]]:
    """Compute metrics per depth band.

    Default bands: 0–100, 100–300, 300–500, 500–700, 700–1000 m.
    """
    if bands is None:
        bands = [(0, 100), (100, 300), (300, 500), (500, 700), (700, 1000)]

    result = {}
    depths_arr = np.array(depths)

    for lo, hi in bands:
        key = f"{lo}-{hi}m"
        idx = np.where((depths_arr >= lo) & (depths_arr <= hi))[0]
        if len(idx) == 0:
            continue
        p = pred[idx].ravel()
        o = obs[idx].ravel()
        result[key] = compute_all_metrics(p, o)

    return result


def compute_thermocline_metrics(
    pred_thermo_depths: np.ndarray,
    ref_thermo_depths: np.ndarray,
) -> Dict[str, float]:
    """Compute thermocline depth error metrics.

    Args:
        pred_thermo_depths: (N,) predicted thermocline depths (m)
        ref_thermo_depths:  (N,) reference thermocline depths (m)

    Returns:
        dict with RMSE, MAE, Bias
    """
    valid = np.isfinite(pred_thermo_depths) & np.isfinite(ref_thermo_depths)
    p = pred_thermo_depths[valid]
    r = ref_thermo_depths[valid]

    if len(p) == 0:
        return {"rmse": np.nan, "mae": np.nan, "bias": np.nan}

    return {
        "rmse": float(np.sqrt(np.mean((p - r) ** 2))),
        "mae": float(np.mean(np.abs(p - r))),
        "bias": float(np.mean(p - r)),
        "n_profiles": int(len(p)),
    }


def compute_uncertainty_calibration(
    pred_mean: np.ndarray,
    pred_var: np.ndarray,   # predictive variance σ²
    obs: np.ndarray,
    n_bins: int = 10,
) -> Dict[str, float]:
    """Evaluate uncertainty calibration.

    Checks whether predictive variance correlates with actual squared error.
    A well-calibrated model has: E[(T - μ)²] ≈ σ²

    Returns:
        calibration_slope: OLS slope of (T-μ)² on σ² (should be ~1.0 if calibrated)
        correlation: Pearson r between σ² and (T-μ)²
        ece: expected calibration error (approximation)

    Note: Proper calibration evaluation requires independent ARGO validation.
    """
    valid = np.isfinite(pred_mean) & np.isfinite(pred_var) & np.isfinite(obs)
    p = pred_mean[valid]
    v = pred_var[valid].clip(min=1e-8)
    o = obs[valid]

    if len(p) < 2:
        return {"calibration_slope": np.nan, "correlation": np.nan}

    sq_err = (o - p) ** 2

    # Pearson correlation between variance and squared error
    corr = float(np.corrcoef(v, sq_err)[0, 1])

    # OLS slope
    cov_vv = float(np.var(v))
    if cov_vv < 1e-12:
        slope = np.nan
    else:
        slope = float(np.cov(v, sq_err)[0, 1] / cov_vv)

    return {
        "calibration_slope": slope,
        "correlation": corr,
        "mean_var": float(np.mean(v)),
        "mean_sq_err": float(np.mean(sq_err)),
    }
