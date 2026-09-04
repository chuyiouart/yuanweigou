#!/usr/bin/env python3
"""Validate publication state against the immutable package and public bytes."""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import importlib.util
import json
import os
import re
from pathlib import Path

PUBLISHER_PATH = Path(__file__).with_name("publish_daily_updates.py")
spec = importlib.util.spec_from_file_location("daily_publisher", PUBLISHER_PATH)
publisher = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(publisher)
INDEX_SLUG_RE = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*")


def sha256_bytes(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def validate_grid_encoder_contract(record: dict, date: str) -> None:
    if date < publisher.ENCODER_MANIFEST_EFFECTIVE_DATE:
        return
    parameters = record.get("encoding_parameters")
    valid = (
        record.get("encoder") == "pillow-webp"
        and type(record.get("encoder")) is str
        and record.get("pillow_version") == "10.2.0"
        and type(record.get("pillow_version")) is str
        and record.get("libwebp_version") == "1.3.2"
        and type(record.get("libwebp_version")) is str
        and isinstance(parameters, dict)
        and set(parameters) == {"method", "exact"}
        and type(parameters.get("method")) is int
        and parameters.get("method") == 6
        and type(parameters.get("exact")) is bool
        and parameters.get("exact") is True
    )
    if not valid:
        raise ValueError("METRION grid encoder contract mismatch")


def derive_allowed_root(package: dict, explicit_root: Path | None, site_root: Path) -> Path:
    if explicit_root is not None:
        return explicit_root.resolve(strict=True)
    sources = [
        str(Path(name).resolve(strict=True))
        for entry in package.get("entries", [])
        for name in entry.get("image_files", [])
    ]
    if not sources:
        return site_root
    return Path(os.path.commonpath(sources)).resolve(strict=True)


def validate(
    site_root: Path,
    package_path: Path,
    state_path: Path,
    allowed_image_root: Path | None = None,
    previous_index_path: Path | None = None,
    previous_index_sha256: str | None = None,
    art_allowed_image_root: Path | None = None,
) -> list[dict[str, str]]:
    site_root = site_root.resolve(strict=True)
    package_bytes = package_path.read_bytes()
    package = json.loads(package_bytes)
    state = json.loads(state_path.read_text(encoding="utf-8"))
    required_state_keys = {"date", "status", "entries", "assets", "files", "package_sha256"}
    optional_state_keys = {"web_image_delivery"}
    if not isinstance(state, dict) or not required_state_keys.issubset(state) or not set(state).issubset(required_state_keys | optional_state_keys):
        raise ValueError("publication state structure mismatch")
    if state.get("status") != "published_locally":
        raise ValueError("publication state status mismatch")
    date = package["date"]
    if state.get("date") != date:
        raise ValueError("publication state date mismatch")
    if state.get("package_sha256") != sha256_bytes(package_bytes):
        raise ValueError("publication state package hash mismatch")

    approved_root = derive_allowed_root(package, allowed_image_root, site_root)
    art_approved_root = (
        art_allowed_image_root.resolve(strict=True)
        if art_allowed_image_root is not None
        else approved_root
    )
    entries = publisher.validate_package(package, approved_root, art_approved_root)
    expected_articles: list[str] = []
    expected_assets: list[str] = []
    independently_expected: dict[str, bytes] = {}

    web_records = state.get("web_image_delivery", [])
    if not isinstance(web_records, list):
        raise ValueError("publication web image manifest malformed")
    grid_by_date = {row.get("date"): row for row in web_records if isinstance(row, dict) and row.get("layout") == "grid-2x2-v1"}
    for entry in entries:
        article_urls: list[str] = []
        if entry["kind"] == "metrion" and date >= publisher.METRION_GRID_EFFECTIVE_DATE:
            record = grid_by_date.get(date)
            if not isinstance(record, dict):
                raise ValueError("METRION grid publication record missing")
            source_sha = [row["sha256"] for row in entry["_validated_images"]]
            if record.get("source_sha256") != source_sha or record.get("width") != 1200 or record.get("height") != 1200:
                raise ValueError("METRION grid source or geometry mismatch")
            if record.get("format") != "webp" or not isinstance(record.get("bytes"), int) or record["bytes"] > 450 * 1024:
                raise ValueError("METRION grid format or budget mismatch")
            validate_grid_encoder_contract(record, date)
            asset = record.get("path")
            if not isinstance(asset, str) or not re.fullmatch(rf"assets/daily-updates/{re.escape(date)}/metrion-grid-[0-9a-f]{{12}}\.webp", asset):
                raise ValueError("METRION grid path mismatch")
            asset_bytes = (site_root / asset).read_bytes()
            if len(asset_bytes) != record["bytes"] or sha256_bytes(asset_bytes) != record.get("output_sha256"):
                raise ValueError("METRION grid output identity mismatch")
            expected_assets.append(asset)
            independently_expected[asset] = asset_bytes
            versioned = f"../{asset}?v={record['output_sha256'][:12]}"
            article_urls.append(
                f'<img src="{versioned}" alt="{entry["title"]} 四图合图" width="1200" height="1200" loading="eager" decoding="async" fetchpriority="high" />'
            )
        else:
            if entry["kind"] == "art-briefing" and date >= publisher.ART_STORY_IMAGE_EFFECTIVE_DATE:
                story_records = []
                pairs = zip(entry["_validated_images"], entry["_story_images"], strict=True)
                for index, (image, metadata) in enumerate(pairs, 1):
                    data, width, height, quality = publisher.derive_art_story_asset_bytes(image["bytes"])
                    digest = sha256_bytes(data)
                    asset = f"assets/daily-updates/{date}/art-briefing-story-{index:02d}-{digest[:12]}.webp"
                    expected_assets.append(asset)
                    independently_expected[asset] = data
                    story_records.append({
                        **metadata, "path": asset, "sha256": digest, "bytes": len(data),
                        "width": width, "height": height, "quality": quality,
                        "source_sha256": image["sha256"],
                    })
                article = f"daily-updates/{entry['slug']}.html"
                expected_articles.append(article)
                independently_expected[article] = publisher.article_html(entry, [], story_records).encode("utf-8")
                continue
            for index, image in enumerate(entry["_validated_images"], 1):
                suffix = Path(image["path"]).suffix.lower()
                asset = f"assets/daily-updates/{date}/{entry['kind']}-{index:02d}{suffix}"
                expected_assets.append(asset)
                article_urls.append(f"../{asset}")
                independently_expected[asset] = image["bytes"]
        article = f"daily-updates/{entry['slug']}.html"
        expected_articles.append(article)
        independently_expected[article] = publisher.article_html(entry, article_urls).encode("utf-8")

    if len(expected_articles) != len(set(expected_articles)):
        raise ValueError("duplicate expected article path")
    if len(expected_assets) != len(set(expected_assets)):
        raise ValueError("duplicate expected asset path")
    if state.get("entries") != expected_articles:
        raise ValueError("publication state article manifest mismatch")
    if state.get("assets") != expected_assets:
        raise ValueError("publication state asset manifest mismatch")

    expected_paths = ["daily-updates/index.json", *expected_articles, *expected_assets]
    state_files = state.get("files")
    if not isinstance(state_files, list) or len(state_files) != len(expected_paths):
        raise ValueError("publication state file digest manifest mismatch")
    manifest: list[dict[str, str]] = []
    for expected_path, record in zip(expected_paths, state_files, strict=True):
        if not isinstance(record, dict) or set(record) != {"path", "sha256"}:
            raise ValueError("publication state file digest record malformed")
        digest = record.get("sha256")
        if record.get("path") != expected_path or not isinstance(digest, str) or len(digest) != 64:
            raise ValueError("publication state file digest manifest mismatch")
        try:
            int(digest, 16)
        except ValueError as exc:
            raise ValueError("publication state file digest malformed") from exc
        candidate = (site_root / expected_path).resolve(strict=True)
        try:
            candidate.relative_to(site_root)
        except ValueError as exc:
            raise ValueError("public file outside site root") from exc
        if not candidate.is_file():
            raise ValueError("public file is not a regular file")
        actual_bytes = candidate.read_bytes()
        if sha256_bytes(actual_bytes) != digest:
            raise ValueError("public file digest mismatch")
        independent_bytes = independently_expected.get(expected_path)
        if independent_bytes is not None and actual_bytes != independent_bytes:
            role = "asset" if expected_path in expected_assets else "article"
            raise ValueError(f"public {role} does not match immutable package")
        manifest.append({"path": expected_path, "sha256": digest})

    index = json.loads((site_root / "daily-updates" / "index.json").read_text(encoding="utf-8"))
    if not isinstance(index, dict) or set(index) != {
        "schema_version", "updated_at", "content_through", "scope", "entries"
    }:
        raise ValueError("public index structure mismatch")
    if index.get("schema_version") != 1:
        raise ValueError("public index schema mismatch")
    try:
        dt.datetime.fromisoformat(index["updated_at"])
    except (KeyError, TypeError, ValueError) as exc:
        raise ValueError("public index updated_at invalid") from exc
    expected_scope = {"included": ["metrion", "art-briefing"], "excluded": ["ai-evening"]}
    if index.get("scope") != expected_scope:
        raise ValueError("public index scope mismatch")
    index_entries = index.get("entries")
    if not isinstance(index_entries, list) or not index_entries:
        raise ValueError("public index entries invalid")

    indexed: dict[tuple[str, str], dict] = {}
    seen_urls: set[str] = set()
    for item in index_entries:
        if not isinstance(item, dict) or set(item) != {
            "date", "kind", "title", "summary", "url", "source_status"
        }:
            raise ValueError("public index entry structure mismatch")
        item_date = publisher.clean_text(item.get("date"), "index date")
        dt.date.fromisoformat(item_date)
        kind = item.get("kind")
        if kind not in {"metrion", "art-briefing"}:
            raise ValueError("public index contains excluded kind")
        publisher.clean_text(item.get("title"), "index title")
        publisher.clean_text(item.get("summary"), "index summary")
        status = item.get("source_status")
        if kind == "metrion" and status != "delivered_verified":
            raise ValueError("public index contains unverified METRION entry")
        if kind == "art-briefing" and status not in {"delivered_verified", "formal_archived"}:
            raise ValueError("public index contains unverified art briefing")
        url = item.get("url")
        if not isinstance(url, str) or not url.startswith("daily-updates/") or not url.endswith(".html"):
            raise ValueError("public index URL invalid")
        slug = url.removeprefix("daily-updates/").removesuffix(".html")
        if not INDEX_SLUG_RE.fullmatch(slug) or not slug.startswith(f"{item_date}-"):
            raise ValueError("public index URL slug invalid")
        key = (item_date, kind)
        if key in indexed or url in seen_urls:
            raise ValueError("public index duplicate key or URL")
        indexed[key] = item
        seen_urls.add(url)

    if previous_index_path is None or previous_index_sha256 is None:
        raise ValueError("trusted previous index is required")
    previous_index_bytes = previous_index_path.read_bytes()
    if sha256_bytes(previous_index_bytes) != previous_index_sha256:
        raise ValueError("trusted previous index hash mismatch")
    previous_index = json.loads(previous_index_bytes)
    previous_entries = previous_index.get("entries")
    if not isinstance(previous_entries, list):
        raise ValueError("trusted previous index entries invalid")
    expected_by_key: dict[tuple[str, str], dict] = {}
    for item in previous_entries:
        if isinstance(item, dict) and item.get("kind") in {"metrion", "art-briefing"}:
            key = (item.get("date"), item.get("kind"))
            if key in expected_by_key:
                raise ValueError("trusted previous index duplicate key")
            expected_by_key[key] = item
    for entry in entries:
        expected_by_key[(entry["date"], entry["kind"])] = {
            "date": entry["date"],
            "kind": entry["kind"],
            "title": entry["title"],
            "summary": entry["summary"],
            "url": f"daily-updates/{entry['slug']}.html",
            "source_status": entry["source_status"],
        }
    expected_merged_entries = sorted(
        expected_by_key.values(),
        key=publisher.index_sort_key,
    )
    if index_entries != expected_merged_entries:
        raise ValueError("public index does not match trusted previous index and immutable package")

    if index_entries != sorted(index_entries, key=publisher.index_sort_key):
        raise ValueError("public index ordering mismatch")
    for entry in entries:
        expected_item = {
            "date": entry["date"],
            "kind": entry["kind"],
            "title": entry["title"],
            "summary": entry["summary"],
            "url": f"daily-updates/{entry['slug']}.html",
            "source_status": entry["source_status"],
        }
        if indexed.get((entry["date"], entry["kind"])) != expected_item:
            raise ValueError("public index does not match immutable package")
    if index.get("content_through") != max(item["date"] for item in index_entries):
        raise ValueError("public index content-through mismatch")
    return manifest


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--site-root", required=True, type=Path)
    parser.add_argument("--package", required=True, type=Path)
    parser.add_argument("--state", required=True, type=Path)
    parser.add_argument("--allowed-image-root", type=Path)
    parser.add_argument("--art-allowed-image-root", type=Path)
    parser.add_argument("--previous-index", required=True, type=Path)
    parser.add_argument("--previous-index-sha256", required=True)
    args = parser.parse_args()
    manifest = validate(
        args.site_root, args.package, args.state, args.allowed_image_root,
        args.previous_index, args.previous_index_sha256,
        args.art_allowed_image_root,
    )
    for record in manifest:
        print(f"{record['sha256']}\t{record['path']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
