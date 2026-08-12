#!/usr/bin/env python3
"""Fail-fast production WebP encoder preflight."""
from __future__ import annotations

import importlib.util
from pathlib import Path

CONTRACT_PATH = Path(__file__).resolve().with_name("webp_encoder_contract.py")
spec = importlib.util.spec_from_file_location("yuanweigou_webp_encoder_contract_preflight", CONTRACT_PATH)
if spec is None or spec.loader is None:
    raise ImportError(f"cannot load WebP encoder contract: {CONTRACT_PATH}")
contract = importlib.util.module_from_spec(spec)
spec.loader.exec_module(contract)


def main() -> int:
    contract.assert_encoder_contract()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
