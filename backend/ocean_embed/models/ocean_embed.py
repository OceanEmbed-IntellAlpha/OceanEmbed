"""
OceanEmbed — Full Model (V5+: Continuous Depth + Uncertainty + Regional Conditioning).

Architecture:
  E(x,y,t) = Encoder(X_{t-2:t}, mask_{t-2:t}, lat, lon, region)
  T(z)     = Decoder(E, γ(z), lat, lon, t)   — continuous depth query
  U(z)     = UncertaintyHead(E, γ(z), mask)  — heteroscedastic variance

Key features vs Baseline:
- Temporal context: 3-day window stacked as additional channels
- Explicit missingness masks concatenated with inputs
- Fourier-encoded continuous depth for arbitrary depth queries
- Heteroscedastic uncertainty (mean + log_variance)
- Regional embedding for Bay of Bengal / Arabian Sea
"""

from __future__ import annotations

from typing import Dict, List, Optional, Tuple

import torch
import torch.nn as nn
import torch.nn.functional as F

from ocean_embed.models.baseline import ConvBlock, EncoderBlock, DecoderBlock
from ocean_embed.models.depth_encoder import FourierDepthEncoder
from ocean_embed.grid import SIH_DEPTHS


class SurfaceEncoder(nn.Module):
    """Multimodal surface encoder with temporal context and missingness masks.

    Input: (B, T*(C_surf + C_mask) + 2, H, W)
      where T = temporal window, C_surf = 7, C_mask = 7, 2 = coord channels
    Output: latent embedding (B, latent_dim, H, W)
    """

    def __init__(
        self,
        in_channels: int,
        latent_dim: int = 128,
        base_channels: int = 32,
        encoder_depth: int = 4,
        dropout: float = 0.1,
        n_regions: int = 3,
        region_embed_dim: int = 16,
    ):
        super().__init__()

        # Region embedding (added to bottleneck)
        self.region_embedding = nn.Embedding(n_regions, region_embed_dim)

        # Build U-Net encoder
        channels = [in_channels] + [base_channels * (2 ** i) for i in range(encoder_depth)]
        self.encoders = nn.ModuleList([
            EncoderBlock(channels[i], channels[i + 1], dropout)
            for i in range(encoder_depth)
        ])

        bottleneck_ch = channels[-1]
        bottleneck_with_region = bottleneck_ch + region_embed_dim
        self.bottleneck = ConvBlock(bottleneck_with_region, latent_dim, dropout)

        self.skips_channels = channels[1:]  # skip connection channel sizes
        self.latent_dim = latent_dim
        self._encoder_channels = channels

    def forward(
        self,
        x: torch.Tensor,
        region_ids: Optional[torch.Tensor] = None,
    ) -> Tuple[torch.Tensor, List[torch.Tensor]]:
        """Encode surface observations.

        Args:
            x: (B, C_in, H, W)
            region_ids: (B,) integer region indices [0=AS, 1=BoB, 2=Open]

        Returns:
            latent: (B, latent_dim, H, W)
            skips:  list of skip tensors for potential decoder use
        """
        B, C, H, W = x.shape

        skips = []
        h = x
        for enc in self.encoders:
            skip, h = enc(h)
            skips.append(skip)

        # Add regional conditioning at bottleneck
        if region_ids is None:
            region_ids = torch.zeros(B, dtype=torch.long, device=x.device)

        # region_ids: (B,) → (B, region_embed_dim) → (B, region_embed_dim, 1, 1)
        reg_emb = self.region_embedding(region_ids)  # (B, R)
        reg_emb = reg_emb.unsqueeze(-1).unsqueeze(-1)  # (B, R, 1, 1)
        reg_emb = reg_emb.expand(-1, -1, h.shape[2], h.shape[3])  # (B, R, H', W')

        h = torch.cat([h, reg_emb], dim=1)
        latent = self.bottleneck(h)  # (B, latent_dim, H', W')

        return latent, skips


class ContinuousDepthDecoder(nn.Module):
    """Continuous depth-conditioned temperature decoder.

    For each spatial location, queries temperature at an arbitrary depth z.
    Conditioned on the ocean latent embedding and Fourier depth encoding.

    Input:
        latent: (B, latent_dim) per grid point
        depth_enc: (B, depth_enc_dim) Fourier encoding of depth
        lat_norm: (B,) normalized latitude
        lon_norm: (B,) normalized longitude
        doy_norm: (B,) normalized day of year

    Output:
        mean:    (B,) predicted temperature
        log_var: (B,) log predictive variance (for uncertainty)
    """

    def __init__(
        self,
        latent_dim: int = 128,
        depth_enc_dim: int = 33,  # 2*16+1 for L=16 Fourier
        coord_dim: int = 3,        # lat_norm, lon_norm, doy_norm
        hidden_dims: Tuple[int, ...] = (256, 256, 128),
        activation: str = "gelu",
    ):
        super().__init__()

        in_dim = latent_dim + depth_enc_dim + coord_dim
        act = nn.GELU() if activation == "gelu" else nn.ReLU(inplace=True)

        layers: list[nn.Module] = []
        prev = in_dim
        for h_dim in hidden_dims:
            layers += [nn.Linear(prev, h_dim), act]
            prev = h_dim

        self.mlp = nn.Sequential(*layers)
        self.head_mean = nn.Linear(prev, 1)
        self.head_log_var = nn.Linear(prev, 1)

    def forward(
        self,
        latent: torch.Tensor,
        depth_enc: torch.Tensor,
        lat_norm: torch.Tensor,
        lon_norm: torch.Tensor,
        doy_norm: torch.Tensor,
    ) -> Tuple[torch.Tensor, torch.Tensor]:
        """Query temperature at encoded depth.

        Args:
            latent:   (..., latent_dim)
            depth_enc: (..., depth_enc_dim)
            lat_norm:  (...,)
            lon_norm:  (...,)
            doy_norm:  (...,)

        Returns:
            mean:    (..., 1)
            log_var: (..., 1)
        """
        coords = torch.stack(
            [lat_norm, lon_norm, doy_norm], dim=-1
        )  # (..., 3)

        x = torch.cat([latent, depth_enc, coords], dim=-1)
        h = self.mlp(x)
        mean = self.head_mean(h)
        log_var = self.head_log_var(h)
        return mean, log_var


class OceanEmbedModel(nn.Module):
    """Full OceanEmbed model (V5–V7 combined).

    Encodes surface observations into a latent ocean state, then
    decodes temperature at arbitrary continuous depth z.

    Usage:
        model = OceanEmbedModel()

        # Query at 15 SIH standard depths:
        means, log_vars = model.forward_at_depths(batch, sih_depths)

        # Query at arbitrary depth:
        mean, log_var = model.forward_at_depth(batch, depth=137.0)
    """

    def __init__(
        self,
        temporal_window: int = 3,
        n_surface_channels: int = 7,
        use_masks: bool = True,
        use_coords: bool = True,
        base_channels: int = 32,
        encoder_depth: int = 4,
        latent_dim: int = 128,
        n_fourier_freqs: int = 16,
        decoder_hidden: Tuple[int, ...] = (256, 256, 128),
        n_regions: int = 3,
        region_embed_dim: int = 16,
        dropout: float = 0.1,
        max_depth: float = 1000.0,
    ):
        super().__init__()

        self.temporal_window = temporal_window
        self.n_surface_channels = n_surface_channels
        self.use_masks = use_masks
        self.use_coords = use_coords
        self.max_depth = max_depth

        # Compute total input channels
        channels_per_step = n_surface_channels
        if use_masks:
            channels_per_step += n_surface_channels  # add mask channels
        total_channels = channels_per_step * temporal_window
        if use_coords:
            total_channels += 2  # lat, lon normalized

        # Surface encoder
        self.encoder = SurfaceEncoder(
            in_channels=total_channels,
            latent_dim=latent_dim,
            base_channels=base_channels,
            encoder_depth=encoder_depth,
            dropout=dropout,
            n_regions=n_regions,
            region_embed_dim=region_embed_dim,
        )

        # Depth encoder (Fourier)
        self.depth_enc = FourierDepthEncoder(n_frequencies=n_fourier_freqs, max_depth=max_depth)
        depth_enc_dim = self.depth_enc.out_dim

        # Continuous depth decoder MLP
        self.decoder = ContinuousDepthDecoder(
            latent_dim=latent_dim,
            depth_enc_dim=depth_enc_dim,
            coord_dim=3,
            hidden_dims=decoder_hidden,
        )

        self.latent_dim = latent_dim
        self._n_params = sum(p.numel() for p in self.parameters() if p.requires_grad)

    def build_input(
        self,
        inputs: torch.Tensor,       # (B, T, 7, H, W)
        masks: torch.Tensor,        # (B, T, 7, H, W)
        lat_norm: torch.Tensor,     # (B, H, W)
        lon_norm: torch.Tensor,     # (B, H, W)
    ) -> torch.Tensor:
        """Build the full input tensor from components."""
        B, T, C, H, W = inputs.shape

        parts = []
        for t in range(T):
            parts.append(inputs[:, t])   # (B, C, H, W)
            if self.use_masks:
                parts.append(masks[:, t])  # (B, C, H, W)

        if self.use_coords:
            parts.append(lat_norm)   # (B, H, W) → add channel dim
            parts.append(lon_norm)

        # Stack all parts along channel dim
        stacked = []
        for p in parts:
            if p.dim() == 3:
                p = p.unsqueeze(1)  # (B, 1, H, W)
            stacked.append(p)

        return torch.cat(stacked, dim=1)  # (B, C_total, H, W)

    def encode(
        self,
        inputs: torch.Tensor,
        masks: torch.Tensor,
        lat_norm: torch.Tensor,
        lon_norm: torch.Tensor,
        region_ids: Optional[torch.Tensor] = None,
    ) -> torch.Tensor:
        """Encode surface inputs to latent embedding.

        Returns: latent (B, latent_dim, H, W)
        """
        x = self.build_input(inputs, masks, lat_norm, lon_norm)
        latent, _ = self.encoder(x, region_ids)
        return latent  # (B, latent_dim, H', W')

    def forward_at_depth(
        self,
        latent: torch.Tensor,   # (B, latent_dim, H, W)
        depth: float,
        lat_norm: torch.Tensor,  # (B, H, W)
        lon_norm: torch.Tensor,  # (B, H, W)
        doy_norm: torch.Tensor,  # (B,)
    ) -> Tuple[torch.Tensor, torch.Tensor]:
        """Query continuous decoder at a single depth.

        Returns:
            mean:    (B, H, W)
            log_var: (B, H, W)
        """
        B, D, H, W = latent.shape

        # Flatten spatial dims for MLP
        lat_flat = lat_norm.reshape(B * H * W)        # (B*H*W,)
        lon_flat = lon_norm.reshape(B * H * W)
        doy_flat = doy_norm.unsqueeze(1).unsqueeze(2).expand(B, H, W).reshape(B * H * W)
        latent_flat = latent.permute(0, 2, 3, 1).reshape(B * H * W, D)  # (B*H*W, D)

        # Encode depth
        depth_t = torch.full((B * H * W,), float(depth), device=latent.device)
        depth_enc = self.depth_enc(depth_t)  # (B*H*W, depth_enc_dim)

        mean_flat, log_var_flat = self.decoder(
            latent_flat, depth_enc, lat_flat, lon_flat, doy_flat
        )

        mean = mean_flat.reshape(B, H, W)
        log_var = log_var_flat.reshape(B, H, W)
        return mean, log_var

    def forward_at_depths(
        self,
        latent: torch.Tensor,
        depths: List[float],
        lat_norm: torch.Tensor,
        lon_norm: torch.Tensor,
        doy_norm: torch.Tensor,
    ) -> Tuple[torch.Tensor, torch.Tensor]:
        """Query decoder at multiple depths.

        Returns:
            means:    (B, n_depths, H, W)
            log_vars: (B, n_depths, H, W)
        """
        means_list, log_vars_list = [], []
        for z in depths:
            m, lv = self.forward_at_depth(latent, z, lat_norm, lon_norm, doy_norm)
            means_list.append(m)
            log_vars_list.append(lv)

        means = torch.stack(means_list, dim=1)      # (B, n_depths, H, W)
        log_vars = torch.stack(log_vars_list, dim=1)
        return means, log_vars

    def forward(
        self,
        inputs: torch.Tensor,
        masks: torch.Tensor,
        lat_norm: torch.Tensor,
        lon_norm: torch.Tensor,
        doy_norm: torch.Tensor,
        depths: Optional[List[float]] = None,
        region_ids: Optional[torch.Tensor] = None,
    ) -> Dict[str, torch.Tensor]:
        """Full forward pass.

        Args:
            inputs:    (B, T, 7, H, W)
            masks:     (B, T, 7, H, W)
            lat_norm:  (B, H, W)
            lon_norm:  (B, H, W)
            doy_norm:  (B,)
            depths:    list of depth values to query (default: SIH_DEPTHS)
            region_ids: (B,) optional region indices

        Returns:
            dict with 'means' (B, D, H, W) and 'log_vars' (B, D, H, W)
        """
        if depths is None:
            depths = SIH_DEPTHS

        latent = self.encode(inputs, masks, lat_norm, lon_norm, region_ids)

        # Upsample latent back to full resolution if downsampled by encoder
        B, C, H_enc, W_enc = latent.shape
        B_in, T, C_surf, H, W = inputs.shape
        if H_enc != H or W_enc != W:
            latent = F.interpolate(latent, size=(H, W), mode="bilinear", align_corners=False)

        means, log_vars = self.forward_at_depths(latent, depths, lat_norm, lon_norm, doy_norm)

        return {"means": means, "log_vars": log_vars}

    def count_parameters(self) -> int:
        return sum(p.numel() for p in self.parameters() if p.requires_grad)


def build_model(config: dict) -> OceanEmbedModel:
    """Factory function: build OceanEmbedModel from a config dict."""
    arch = config.get("architecture", {})
    enc = arch.get("encoder", {})
    dec = arch.get("depth_decoder", {})
    reg = arch.get("regional", {})

    return OceanEmbedModel(
        temporal_window=arch.get("temporal", {}).get("window", 3),
        n_surface_channels=7,
        use_masks=arch.get("masks", {}).get("enabled", True),
        base_channels=enc.get("base_channels", 32),
        encoder_depth=enc.get("depth", 4),
        latent_dim=arch.get("latent_dim", 128),
        n_fourier_freqs=dec.get("fourier_frequencies", 16),
        decoder_hidden=tuple(dec.get("hidden_dims", [256, 256, 128])),
        n_regions=len(reg.get("regions", ["arabian_sea", "bay_of_bengal", "open_ocean"])),
        region_embed_dim=reg.get("embedding_dim", 16),
        dropout=enc.get("dropout", 0.1),
    )


# Alias
OceanEmbed = OceanEmbedModel
