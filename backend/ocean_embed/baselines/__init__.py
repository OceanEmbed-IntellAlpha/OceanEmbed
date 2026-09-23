"""
ocean_embed.baselines — Baseline model implementations.

Exports:
    fit_climatology        — Fit climatological mean baseline (training only)
    evaluate_climatology   — Evaluate climatology on val/test split
"""

from ocean_embed.baselines.climatology import fit_climatology, evaluate_climatology

__all__ = ["fit_climatology", "evaluate_climatology"]
