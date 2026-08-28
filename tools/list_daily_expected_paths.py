#!/usr/bin/env python3
"""List the canonical ordered public paths expected from a daily package."""
from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
from typing import Any

PUBLISHER_PATH = Path(__file__).with_name("publish_daily_updates.py")
spec = importlib.util.spec_from_file_location("daily_publisher_for_paths", PUBLISHER_PATH)
publisher = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(publisher)


def expected_paths(package: dict[str, Any]) -> list[str]:
    date = package["date"]
    entries = package["entries"]
    paths = ["daily-updates/index.json"]
    paths.extend(f"daily-updates/{entry['slug']}.html" for entry in entries)
    for entry in entries:
        if entry.get("kind") == "metrion" and date >= "2026-08-11":
            digests = entry.get("image_sha256", [])
            if not isinstance(digests, list) or len(digests) != 4:
                raise ValueError("METRION grid requires four source digests")
            stem = hashlib.sha256("".join(digests).encode()).hexdigest()[:12]
            paths.append(f"assets/daily-updates/{date}/metrion-grid-{stem}.webp")
            continue
        if entry.get("kind") == "art-briefing" and date >= publisher.ART_STORY_IMAGE_EFFECTIVE_DATE:
            images = entry.get("image_files", [])
            if not isinstance(images, list):
                raise ValueError("art briefing image_files must be a list")
            for index, image_name in enumerate(images, 1):
                data, _, _, _ = publisher.derive_art_story_asset_bytes(Path(image_name).read_bytes())
                digest = hashlib.sha256(data).hexdigest()
                paths.append(f"assets/daily-updates/{date}/art-briefing-story-{index:02d}-{digest[:12]}.webp")
            continue
        for index, image_name in enumerate(entry.get("image_files", []), 1):
            suffix = Path(image_name).suffix.lower()
            paths.append(
                f"assets/daily-updates/{date}/{entry['kind']}-{index:02d}{suffix}"
            )
    return paths


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("package", type=Path)
    args = parser.parse_args()
    package = json.loads(args.package.read_text(encoding="utf-8"))
    for path in expected_paths(package):
        print(path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
