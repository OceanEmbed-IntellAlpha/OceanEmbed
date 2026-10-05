"""
OceanEmbed — Data loading, splitting, and normalization package.
"""

from ocean_embed.dataset import OceanEmbedDataset
from ocean_embed.normalization import (
    NormalizationStats,
    Normalizer,
    load_normalization_stats,
    denormalize_target,
    apply_surface_norm,
    SURFACE_VARS,
)
from ocean_embed.data.splits import (
    make_date_range_split,
    make_temporal_split,
    config_driven_split,
)

__all__ = [
    "OceanEmbedDataset",
    "NormalizationStats",
    "Normalizer",
    "load_normalization_stats",
    "denormalize_target",
    "apply_surface_norm",
    "SURFACE_VARS",
    "make_date_range_split",
    "make_temporal_split",
    "config_driven_split",
]
