"""
OceanEmbed — V1 Baseline Model.

Architecture: CNN Encoder-Decoder (U-Net style)
Input:  (B, 7, H, W) — 7 surface channels
Output: (B, 15, H, W) — temperature at 15 SIH standard depths

This is the starting point in the development sequence (spec §9).
"""

from __future__ import annotations

from typing import Tuple

import torch
import torch.nn as nn
import torch.nn.functional as F


class ConvBlock(nn.Module):
    """Two-layer convolution block with BatchNorm and ReLU."""

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


class EncoderBlock(nn.Module):
    """Encoder block: ConvBlock + MaxPool downsampling."""

    def __init__(self, in_channels: int, out_channels: int, dropout: float = 0.0):
        super().__init__()
        self.conv = ConvBlock(in_channels, out_channels, dropout)
        self.pool = nn.MaxPool2d(2)

    def forward(self, x: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        features = self.conv(x)
        downsampled = self.pool(features)
        return features, downsampled


class DecoderBlock(nn.Module):
    """Decoder block: bilinear upsample + skip connection + ConvBlock."""

    def __init__(self, in_channels: int, skip_channels: int, out_channels: int):
        super().__init__()
        self.up = nn.Upsample(scale_factor=2, mode="bilinear", align_corners=False)
        self.conv = ConvBlock(in_channels + skip_channels, out_channels)

    def forward(self, x: torch.Tensor, skip: torch.Tensor) -> torch.Tensor:
        x = self.up(x)
        # Handle size mismatch due to odd dimensions
        if x.shape != skip.shape:
            x = F.interpolate(x, size=skip.shape[2:], mode="bilinear", align_corners=False)
        x = torch.cat([x, skip], dim=1)
        return self.conv(x)


class BaselineModel(nn.Module):
    """OceanEmbed V1 Baseline: U-Net CNN encoder-decoder.

    Maps 7 surface channels to 15 depth-wise temperature maps.

    Args:
        in_channels:   number of surface input channels (default 7)
        out_depths:    number of output depth levels (default 15)
        base_channels: base channel width for encoder (default 32)
        encoder_depth: number of encoder levels (default 4)
        dropout:       dropout rate (default 0.1)
    """

    def __init__(
        self,
        in_channels: int = 7,
        out_depths: int = 15,
        base_channels: int = 32,
        encoder_depth: int = 4,
        dropout: float = 0.1,
    ):
        super().__init__()
        self.in_channels = in_channels
        self.out_depths = out_depths

        # Build encoder
        channels = [in_channels] + [base_channels * (2 ** i) for i in range(encoder_depth)]
        self.encoders = nn.ModuleList([
            EncoderBlock(channels[i], channels[i + 1], dropout)
            for i in range(encoder_depth)
        ])

        # Bottleneck
        bottleneck_ch = channels[-1]
        self.bottleneck = ConvBlock(bottleneck_ch, bottleneck_ch * 2, dropout)
        bottleneck_out = bottleneck_ch * 2

        # Build decoder (reversed)
        self.decoders = nn.ModuleList()
        dec_in = bottleneck_out
        for i in range(encoder_depth - 1, -1, -1):
            skip_ch = channels[i + 1]
            dec_out = channels[i + 1]
            self.decoders.append(DecoderBlock(dec_in, skip_ch, dec_out))
            dec_in = dec_out

        # Output head: project to out_depths channels
        self.head = nn.Conv2d(dec_in, out_depths, kernel_size=1)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """Forward pass.

        Args:
            x: (B, in_channels, H, W) surface observations

        Returns:
            out: (B, out_depths, H, W) temperature predictions
        """
        skips = []
        for enc in self.encoders:
            skip, x = enc(x)
            skips.append(skip)

        x = self.bottleneck(x)

        for dec, skip in zip(self.decoders, reversed(skips)):
            x = dec(x, skip)

        return self.head(x)

    def count_parameters(self) -> int:
        return sum(p.numel() for p in self.parameters() if p.requires_grad)
