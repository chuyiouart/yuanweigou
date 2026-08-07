#!/usr/bin/env python3
"""Validate publication state and emit deterministic public asset paths."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

ALLOWED_KINDS = {"metrion", "art-briefing"}
ALLOWED_SUFFIXES = {".jpg", ".jpeg", ".png"}


def validate(site_root: Path, package_path: Path, state_path: Path) -> list[str]:
    site_root = site_root.resolve(strict=True)
    package_bytes = package_path.read_bytes()
    package = json.loads(package_bytes)
    state = json.loads(state_path.read_text(encoding="utf-8"))
    date = package["date"]
    if state.get("date") != date:
        raise ValueError("publication state date mismatch")
    if state.get("package_sha256") != hashlib.sha256(package_bytes).hexdigest():
        raise ValueError("publication state package hash mismatch")

    expected_articles: list[str] = []
    expected_assets: list[str] = []
    for entry in package["entries"]:
        kind = entry["kind"]
        slug = entry["slug"]
        if kind not in ALLOWED_KINDS:
            raise ValueError("unsupported publication kind")
        expected_articles.append(f"daily-updates/{slug}.html")
        for index, source_name in enumerate(entry.get("image_files", []), 1):
            suffix = Path(source_name).suffix.lower()
            if suffix not in ALLOWED_SUFFIXES:
                raise ValueError("unsupported publication image suffix")
            expected_assets.append(f"assets/daily-updates/{date}/{kind}-{index:02d}{suffix}")

    if len(expected_articles) != len(set(expected_articles)):
        raise ValueError("duplicate expected article path")
    if len(expected_assets) != len(set(expected_assets)):
        raise ValueError("duplicate expected asset path")
    if state.get("entries") != expected_articles:
        raise ValueError("publication state article manifest mismatch")
    if state.get("assets") != expected_assets:
        raise ValueError("publication state asset manifest mismatch")

    approved_public_root = (site_root / "assets" / "daily-updates" / date).resolve()
    for relative_name in expected_assets:
        candidate = (site_root / relative_name).resolve(strict=True)
        try:
            candidate.relative_to(approved_public_root)
        except ValueError as exc:
            raise ValueError("public asset outside dated asset root") from exc
        if not candidate.is_file():
            raise ValueError("public asset is not a regular file")
    return expected_assets


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--site-root", required=True, type=Path)
    parser.add_argument("--package", required=True, type=Path)
    parser.add_argument("--state", required=True, type=Path)
    args = parser.parse_args()
    for asset in validate(args.site_root, args.package, args.state):
        print(asset)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
