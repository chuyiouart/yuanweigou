#!/usr/bin/env python3
"""Exact WebP encoder contract for deterministic METRION website assets."""
from __future__ import annotations

from typing import Any

import PIL
from PIL import features

ENCODER = "pillow-webp"
PILLOW_VERSION = "10.2.0"
LIBWEBP_VERSION = "1.3.2"
ENCODING_PARAMETERS = {"method": 6, "exact": True}
MANIFEST_EFFECTIVE_DATE = "2026-08-13"


def assert_encoder_contract(
    *,
    pillow_version: str | None = None,
    webp_available: bool | None = None,
    libwebp_version: str | None = None,
) -> dict[str, Any]:
    actual_pillow = PIL.__version__ if pillow_version is None else pillow_version
    actual_available = features.check("webp") if webp_available is None else webp_available
    actual_libwebp = features.version("webp") if libwebp_version is None else libwebp_version
    if actual_pillow != PILLOW_VERSION:
        raise RuntimeError(f"Pillow encoder contract mismatch: expected {PILLOW_VERSION}, got {actual_pillow}")
    if actual_available is not True:
        raise RuntimeError("WebP encoder contract mismatch: WebP support unavailable")
    if actual_libwebp != LIBWEBP_VERSION:
        raise RuntimeError(f"libwebp encoder contract mismatch: expected {LIBWEBP_VERSION}, got {actual_libwebp}")
    return manifest_fields()


def manifest_fields() -> dict[str, Any]:
    return {
        "encoder": ENCODER,
        "pillow_version": PILLOW_VERSION,
        "libwebp_version": LIBWEBP_VERSION,
        "encoding_parameters": dict(ENCODING_PARAMETERS),
    }
