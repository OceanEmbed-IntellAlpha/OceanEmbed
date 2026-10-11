"""
OceanEmbed — Normalization utilities for data pipeline.

Re-exports core normalization primitives from ocean_embed.normalization.
"""

from ocean_embed.normalization import (
    CHANNEL_NAMES,
    REFERENCE_STATS,
    SURFACE_VARS,
    TARGET_VAR,
    NormalizationStats,
    Normalizer,
    apply_surface_norm,
    denormalize_target,
    load_normalization_stats,
)

__all__ = [
    "CHANNEL_NAMES",
    "REFERENCE_STATS",
    "SURFACE_VARS",
    "TARGET_VAR",
    "NormalizationStats",
    "Normalizer",
    "apply_surface_norm",
    "denormalize_target",
    "load_normalization_stats",
]
