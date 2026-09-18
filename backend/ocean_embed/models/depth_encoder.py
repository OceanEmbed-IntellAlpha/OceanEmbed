"""
OceanEmbed — Fourier Depth Encoder.

Encodes a continuous depth query z ∈ [0, 1000] m into a high-dimensional
feature vector using Fourier positional encoding.

This enables the depth decoder to query temperature at arbitrary depths,
not only fixed discrete levels.
"""

from __future__ import annotations

import math

import torch
import torch.nn as nn


class FourierDepthEncoder(nn.Module):
    """Fourier positional encoding for continuous depth queries.

    Encodes normalized depth z_norm ∈ [0, 1] as:
        γ(z) = [z_norm, sin(2π·1·z), cos(2π·1·z), ..., sin(2π·L·z), cos(2π·L·z)]

    Output dimension: 2*n_frequencies + 1

    Reference:
        Mildenhall et al. (2020), NeRF: Representing Scenes as Neural Radiance Fields,
        adapted for ocean depth representation (not scene rendering).
    """

    def __init__(self, n_frequencies: int = 16, max_depth: float = 1000.0):
        super().__init__()
        self.n_frequencies = n_frequencies
        self.max_depth = max_depth
        self.out_dim = 2 * n_frequencies + 1

        # Register frequency multipliers as buffer (not learned)
        freqs = torch.arange(1, n_frequencies + 1, dtype=torch.float32)
        self.register_buffer("freqs", freqs)

    def forward(self, depth: torch.Tensor) -> torch.Tensor:
        """Encode depth values.

        Args:
            depth: tensor of shape (...) with depth values in [0, max_depth] metres

        Returns:
            encoded: tensor of shape (..., out_dim)
        """
        z_norm = depth / self.max_depth  # normalize to [0, 1]
        z_norm = z_norm.clamp(0.0, 1.0)

        # Compute Fourier features
        # z_norm: (...) → expand to (..., n_frequencies)
        z_expanded = z_norm.unsqueeze(-1) * self.freqs * 2 * math.pi  # (..., L)
        sin_features = torch.sin(z_expanded)   # (..., L)
        cos_features = torch.cos(z_expanded)   # (..., L)

        # Concatenate: [z_norm, sin(f), cos(f)]
        encoded = torch.cat(
            [z_norm.unsqueeze(-1), sin_features, cos_features],
            dim=-1,
        )  # (..., 2L+1)

        return encoded


class LearnedDepthEmbedding(nn.Module):
    """Learned embedding for depth — alternative to Fourier encoding.

    Discretizes depth into bins and learns embeddings.
    Less flexible for truly arbitrary depths; prefer FourierDepthEncoder.
    """

    def __init__(
        self,
        n_bins: int = 100,
        embed_dim: int = 32,
        max_depth: float = 1000.0,
    ):
        super().__init__()
        self.max_depth = max_depth
        self.n_bins = n_bins
        self.embedding = nn.Embedding(n_bins, embed_dim)

    def forward(self, depth: torch.Tensor) -> torch.Tensor:
        """Embed depth values.

        Args:
            depth: tensor with values in [0, max_depth]

        Returns:
            embeddings: tensor of shape (..., embed_dim)
        """
        idx = (depth / self.max_depth * (self.n_bins - 1)).long().clamp(0, self.n_bins - 1)
        return self.embedding(idx)
