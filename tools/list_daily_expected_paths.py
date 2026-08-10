#!/usr/bin/env python3
"""List the canonical ordered public paths expected from a daily package."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


def expected_paths(package: dict[str, Any]) -> list[str]:
    date = package["date"]
    entries = package["entries"]
    paths = ["daily-updates/index.json"]
    paths.extend(f"daily-updates/{entry['slug']}.html" for entry in entries)
    for entry in entries:
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
