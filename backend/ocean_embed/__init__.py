"""
OceanEmbed — Satellite Embedding-Based Subsurface Ocean Temperature Reconstruction.

SIH26066 | Ministry of Earth Sciences / INCOIS

Reconstructs depth-wise subsurface temperature (0–1000 m) from daily surface
satellite observations at 0.25° spatial resolution for the North Indian Ocean
(5°N–30°N, 45°E–105°E).

Architecture:
    Surface observations → U-Net Encoder → Ocean Latent Embedding
    → Fourier Depth Decoder → Temperature(z) + Uncertainty(z)
"""

__version__ = "1.0.0"
__sih_id__ = "SIH26066"
__organization__ = "Ministry of Earth Sciences / INCOIS"
