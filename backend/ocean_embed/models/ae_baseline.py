"""
ae_baseline.py — OceanEmbed Phase 9C: Supervised Autoencoder Baseline (Spatial Pooling Bottleneck).

Architecture:
  - Encoder (same as v2 U-Net encoder):
      Input: [B, 14, H, W] (7 surface variables + 7 validity masks)
      Stage 1: ConvBlock(14, 32) + MaxPool2d(2, ceil_mode=True) -> [32, 51, 121]
      Stage 2: ConvBlock(32, 64) + MaxPool2d(2, ceil_mode=True) -> [64, 26, 61]
      Stage 3: ConvBlock(64, 128) + MaxPool2d(2, ceil_mode=True) -> [128, 13, 31]
  - Bottleneck (Small Spatial Pool — preserves coarse spatial structure):
      AdaptiveAvgPool2d((2, 3)) -> [B, 128, 2, 3] -> flatten -> Linear(768, 256) -> [B, 256]
      (2 lat bands x 3 lon bands ≈ N/S x Arabian Sea/central/Bay of Bengal)
  - Decoder (NO SKIP CONNECTIONS):
      Linear(256, 768) -> view [B, 128, 2, 3] -> Interpolate to (13, 31)
      Stage 1: Interpolate to (26, 61) + ConvBlock(128, 128) -> [128, 26, 61]
      Stage 2: Interpolate to (51, 121) + ConvBlock(128, 64) -> [64, 51, 121]
      Stage 3: Interpolate to (101, 241) + ConvBlock(64, 32) -> [32, 101, 241]
      Output Head: Conv2d(32, 15, kernel_size=1) -> [15, 101, 241]
"""

from __future__ import annotations

from typing import Tuple

import torch
import torch.nn as nn
import torch.nn.functional as F


class ConvBlock(nn.Module):
    """Two-layer 3x3 Convolution block with BatchNorm and ReLU."""

    def __init__(self, in_channels: int, out_channels: int, dropout: float = 0.0):
        super().__init__()
        layers = [
            nn.Conv2d(in_channels, out_channels, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(inplace=True),
            nn.Conv2d(out_channels, out_channels, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(inplace=True),
        ]
        if dropout > 0:
            layers.append(nn.Dropout2d(dropout))
        self.block = nn.Sequential(*layers)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.block(x)


class AEBaseline(nn.Module):
    """Phase 9C Supervised Autoencoder Baseline (Spatial Pooling Bottleneck).

    Supervised encoder-decoder with a 256-dimensional bottleneck using a small
    (2, 3) spatial average pool that preserves coarse N/S and lon-band structure.
    NO skip connections between encoder and decoder.

    Bottleneck spatial size (2, 3) gives 128*2*3=768 features before the FC.
    This avoids the complete spatial information loss of pure GAP(1,1) while
    keeping total params ~1.0M.

    Args:
        in_channels: Number of surface input channels + mask channels (default 14).
        latent_dim: Dimension of latent bottleneck vector (default 256).
        out_depths: Number of target depth levels (default 15).
        dropout: Dropout rate (default 0.1).
        pool_size: Spatial size for the adaptive average pool bottleneck (default (2, 3)).
    """

    TARGET_GRID = (101, 241)
    BOTTLENECK_GRID = (13, 31)

    def __init__(
        self,
        in_channels: int = 14,
        latent_dim: int = 256,
        out_depths: int = 15,
        dropout: float = 0.1,
        pool_size: Tuple[int, int] = (2, 3),
    ):
        super().__init__()
        self.in_channels = in_channels
        self.latent_dim = latent_dim
        self.out_depths = out_depths
        self.pool_size = pool_size

        # Encoder stages
        self.enc1 = ConvBlock(in_channels, 32, dropout=dropout)
        self.pool1 = nn.MaxPool2d(2, ceil_mode=True)  # 101x241 -> 51x121

        self.enc2 = ConvBlock(32, 64, dropout=dropout)
        self.pool2 = nn.MaxPool2d(2, ceil_mode=True)  # 51x121 -> 26x61

        self.enc3 = ConvBlock(64, 128, dropout=dropout)
        self.pool3 = nn.MaxPool2d(2, ceil_mode=True)  # 26x61 -> 13x31

        # Bottleneck: Small spatial pool (2,3) -> flatten -> FC
        # [B, 128, 2, 3] -> flatten -> [B, 768] -> [B, 256]
        self.spatial_pool = nn.AdaptiveAvgPool2d(pool_size)
        _flat_dim = 128 * pool_size[0] * pool_size[1]  # 128*2*3 = 768
        self.fc_enc = nn.Linear(_flat_dim, latent_dim)
        self.fc_dec = nn.Linear(latent_dim, _flat_dim)
        self._flat_dim = _flat_dim

        # Decoder stages (NO SKIP CONNECTIONS)
        self.dec1 = ConvBlock(128, 128, dropout=dropout)
        self.dec2 = ConvBlock(128, 64, dropout=dropout)
        self.dec3 = ConvBlock(64, 32, dropout=dropout)

        # Output head
        self.head = nn.Conv2d(32, out_depths, kernel_size=1)

    def encode(self, x: torch.Tensor) -> torch.Tensor:
        """Encode input observations to 256-d latent vector via spatial pooling bottleneck.

        Args:
            x: Tensor of shape [B, 14, H, W]

        Returns:
            z: Tensor of shape [B, 256]
        """
        B, C, H, W = x.shape
        if (H, W) != self.TARGET_GRID:
            x = F.interpolate(x, size=self.TARGET_GRID, mode="bilinear", align_corners=False)

        h = self.pool1(self.enc1(x))          # [B, 32, 51, 121]
        h = self.pool2(self.enc2(h))          # [B, 64, 26, 61]
        h = self.pool3(self.enc3(h))          # [B, 128, 13, 31]

        h_sp = self.spatial_pool(h).flatten(1)  # [B, 128*ph*pw] e.g. [B, 768]
        z = self.fc_enc(h_sp)                    # [B, 256]
        return z

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """Forward pass.

        Args:
            x: Tensor of shape [B, 14, H, W]

        Returns:
            out: Tensor of shape [B, 15, H, W]
        """
        orig_shape = x.shape[2:]
        z = self.encode(x)  # [B, 256]

        # Decode: FC -> reshape to pool spatial dims -> upsample
        h = self.fc_dec(z)                            # [B, 768]
        ph, pw = self.pool_size
        h = h.view(-1, 128, ph, pw)                   # [B, 128, 2, 3]

        # Upsample through bottleneck grid
        h = F.interpolate(h, size=self.BOTTLENECK_GRID, mode="bilinear", align_corners=False)  # [B, 128, 13, 31]

        # Decoder stages
        h = F.interpolate(h, size=(26, 61), mode="bilinear", align_corners=False)
        h = self.dec1(h)   # [B, 128, 26, 61]

        h = F.interpolate(h, size=(51, 121), mode="bilinear", align_corners=False)
        h = self.dec2(h)   # [B, 64, 51, 121]

        h = F.interpolate(h, size=(101, 241), mode="bilinear", align_corners=False)
        h = self.dec3(h)   # [B, 32, 101, 241]

        out = self.head(h)  # [B, 15, 101, 241]

        if orig_shape != self.TARGET_GRID:
            out = F.interpolate(out, size=orig_shape, mode="bilinear", align_corners=False)

        return out

    def count_parameters(self) -> int:
        return sum(p.numel() for p in self.parameters() if p.requires_grad)
