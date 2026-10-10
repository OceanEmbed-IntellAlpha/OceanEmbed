"""
OceanEmbed — ViT Baseline Model (Phase 9A).

Architecture: Vision Transformer (ViT) patch-based encoder-decoder
Input:  (B, 14, H, W) — 7 surface variables + 7 validity masks
Output: (B, 15, H, W) — temperature anomaly at 15 depth levels

Specification:
- Patch size: 16x16, stride 16
- Dynamic padding so H and W are divisible by 16 (for 101x241 -> 112x256, 7x16=112 patches)
- Linear projection: 14 * 16 * 16 -> embed_dim (192)
- Learned 2D positional embedding: [112, 192] (interpolated dynamically for non-canonical grids e.g. training crops)
- 6 Transformer encoder blocks (embed_dim 192, 6 heads, 768 MLP hidden, GELU, norm_first=True)
- Output head: token reshape -> [B, 192, 7, 16] -> ConvTranspose2d 8x -> ConvTranspose2d 2x -> crop [:H, :W] -> 1x1 Conv -> 15 depths
"""

from __future__ import annotations

from typing import Tuple

import torch
import torch.nn as nn
import torch.nn.functional as F


class ViTBaseline(nn.Module):
    """OceanEmbed Phase 9A Baseline: Patch-based Vision Transformer.

    Maps 14 surface channels (7 normalized variables + 7 validity masks)
    to 15 subsurface temperature anomaly channels.

    Args:
        in_channels:   number of surface + mask input channels (default 14)
        out_depths:    number of output depth levels (default 15)
        embed_dim:     transformer embedding dimension (default 192)
        depth:         number of transformer encoder layers (default 6)
        num_heads:     number of attention heads (default 6, 32 dim/head)
        mlp_ratio:     ratio of mlp hidden dim to embed_dim (default 4.0 -> 768)
        dropout:       dropout rate (default 0.1)
        patch_size:    patch resolution (default 16)
    """

    def __init__(
        self,
        in_channels: int = 14,
        out_depths: int = 15,
        embed_dim: int = 192,
        depth: int = 6,
        num_heads: int = 6,
        mlp_ratio: float = 4.0,
        dropout: float = 0.1,
        patch_size: int = 16,
    ):
        super().__init__()
        self.in_channels = in_channels
        self.out_depths = out_depths
        self.embed_dim = embed_dim
        self.patch_size = patch_size

        # Patch embedding: 16x16 patch projection
        self.patch_embed = nn.Conv2d(
            in_channels,
            embed_dim,
            kernel_size=patch_size,
            stride=patch_size,
        )

        # Canonical patch grid for 101x241 padded to 112x256 is 7x16 = 112 patches
        self.base_grid = (7, 16)
        self.num_patches = self.base_grid[0] * self.base_grid[1]  # 112
        self.pos_embed = nn.Parameter(torch.zeros(1, self.num_patches, embed_dim))
        nn.init.trunc_normal_(self.pos_embed, std=0.02)
        self.pos_drop = nn.Dropout(p=dropout)

        # Transformer encoder
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=embed_dim,
            nhead=num_heads,
            dim_feedforward=int(embed_dim * mlp_ratio),
            dropout=dropout,
            activation="gelu",
            batch_first=True,
            norm_first=True,
        )
        self.encoder = nn.TransformerEncoder(encoder_layer, num_layers=depth)
        self.norm = nn.LayerNorm(embed_dim)

        # Output head: upsample 8x, then 2x (total 16x) back to padded resolution
        self.up1 = nn.ConvTranspose2d(embed_dim, embed_dim, kernel_size=8, stride=8)
        self.act1 = nn.GELU()
        self.up2 = nn.ConvTranspose2d(embed_dim, embed_dim, kernel_size=2, stride=2)
        self.act2 = nn.GELU()

        # 1x1 convolution to project from embed_dim to out_depths (15)
        self.head = nn.Conv2d(embed_dim, out_depths, kernel_size=1)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """Forward pass.

        Args:
            x: (B, in_channels, H, W) surface observations + masks

        Returns:
            out: (B, out_depths, H, W) temperature anomaly predictions
        """
        B, C, H, W = x.shape

        # Pad dynamically so H and W are divisible by patch_size (16)
        # For 101 -> 112 (pad 11 rows) and 241 -> 256 (pad 15 cols)
        pad_h = (self.patch_size - (H % self.patch_size)) % self.patch_size
        pad_w = (self.patch_size - (W % self.patch_size)) % self.patch_size
        if pad_h > 0 or pad_w > 0:
            x = F.pad(x, (0, pad_w, 0, pad_h))

        H_pad, W_pad = x.shape[2], x.shape[3]
        grid_h = H_pad // self.patch_size
        grid_w = W_pad // self.patch_size

        # Patch projection: (B, embed_dim, grid_h, grid_w)
        x_proj = self.patch_embed(x)
        # Flatten spatial dims to tokens: (B, num_patches, embed_dim)
        tokens = x_proj.flatten(2).transpose(1, 2)

        # Add positional embedding
        if (grid_h, grid_w) == self.base_grid:
            tokens = tokens + self.pos_embed
        else:
            # Interpolate 2D positional embedding for dynamic crop resolutions (e.g. 51x121)
            pe_2d = self.pos_embed.reshape(1, self.base_grid[0], self.base_grid[1], self.embed_dim).permute(0, 3, 1, 2)
            pe_interp = F.interpolate(pe_2d, size=(grid_h, grid_w), mode="bicubic", align_corners=False)
            pe_flat = pe_interp.permute(0, 2, 3, 1).flatten(1, 2)
            tokens = tokens + pe_flat

        tokens = self.pos_drop(tokens)

        # Transformer encoder blocks
        tokens = self.encoder(tokens)
        tokens = self.norm(tokens)

        # Reshape tokens back to spatial feature map: (B, embed_dim, grid_h, grid_w)
        feat = tokens.transpose(1, 2).reshape(B, self.embed_dim, grid_h, grid_w)

        # Upsample 8x -> 2x back to (H_pad, W_pad)
        feat = self.act1(self.up1(feat))
        feat = self.act2(self.up2(feat))

        # Crop back to exact input resolution (H, W)
        feat = feat[:, :, :H, :W]

        # Final 1x1 projection to depth channels
        out = self.head(feat)
        return out

    def count_parameters(self) -> int:
        return sum(p.numel() for p in self.parameters() if p.requires_grad)
