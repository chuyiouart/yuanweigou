#!/usr/bin/env python3
"""Deterministic publisher for METRION Daily Updates.

Consumes a validated package produced downstream from existing Telegram jobs.
It never sends Telegram messages and never mutates upstream archives.
"""
from __future__ import annotations

import argparse
import contextlib
import datetime as dt
import hashlib
import html
import io
import json
import os
import re
import tempfile
import zlib
from pathlib import Path
from typing import Iterable

ALLOWED_KINDS = {"metrion", "art-briefing"}
FORBIDDEN_KINDS = {"ai-evening", "art-evening", "evening-briefing"}
FORBIDDEN_PUBLIC_TEXT = ("/root/.hermes", "FAIL_CLOSED", "TELEGRAM_API", "BOT_TOKEN", "api_hash")
FORBIDDEN_PATH_PATTERNS = (
    re.compile(r"(?i)(?<![a-z0-9+.-])[a-z]:[\\/]"),
    re.compile(r"(?i)(?<![a-z0-9._-])/+(?:root|home|users|tmp|etc|usr|var|opt|srv|mnt|private|volumes|applications|library|system|workspace|data|media|boot|bin|sbin|dev|proc|sys|run)(?:/|\b)"),
    re.compile(r"(?i)(?<![a-z0-9._-])/+[a-z]/users(?:/|\b)"),
    re.compile(r"\\+[^\\/\s]+[\\/]+[^\\/\s]+"),
    re.compile(r"(?<!:)/{2,}[^/\s]+/+[^/\s]+"),
    re.compile(r"(?i)appdata[\\/]local[\\/]hermes(?:[\\/]|\b)"),
)
KIND_LABEL = {"metrion": "元维构项目日更", "art-briefing": "视觉艺术早报"}


def valid_image_dimensions(path: Path, data: bytes | None = None) -> tuple[int, int] | None:
    data = path.read_bytes() if data is None else data
    suffix = path.suffix.lower()
    if suffix == ".png":
        if len(data) < 57 or not data.startswith(b"\x89PNG\r\n\x1a\n"):
            return None
        cursor = 8
        width = height = 0
        seen_ihdr = seen_idat = seen_iend = False
        channels = 0
        compressed_parts = []
        idat_closed = False
        while cursor + 12 <= len(data):
            length = int.from_bytes(data[cursor:cursor + 4], "big")
            kind = data[cursor + 4:cursor + 8]
            end = cursor + 12 + length
            if end > len(data):
                return None
            payload = data[cursor + 8:cursor + 8 + length]
            expected_crc = int.from_bytes(data[cursor + 8 + length:end], "big")
            if zlib.crc32(kind + payload) & 0xFFFFFFFF != expected_crc:
                return None
            if kind == b"IHDR":
                if seen_ihdr or cursor != 8 or length != 13:
                    return None
                width = int.from_bytes(payload[:4], "big")
                height = int.from_bytes(payload[4:8], "big")
                bit_depth, color_type, compression, filter_method, interlace = payload[8:13]
                if bit_depth != 8 or color_type not in {2, 6} or compression != 0 or filter_method != 0 or interlace != 0:
                    return None
                channels = 3 if color_type == 2 else 4
                seen_ihdr = True
            elif kind == b"IDAT":
                if not seen_ihdr or length == 0 or idat_closed:
                    return None
                seen_idat = True
                compressed_parts.append(payload)
            elif kind == b"PLTE":
                if not seen_ihdr or seen_idat or length == 0 or length > 768 or length % 3:
                    return None
            elif kind == b"IEND":
                if length != 0 or end != len(data):
                    return None
                seen_iend = True
                break
            else:
                if len(kind) != 4 or any(not (65 <= byte <= 90 or 97 <= byte <= 122) for byte in kind):
                    return None
                if not (65 <= kind[2] <= 90):
                    return None
                if not (97 <= kind[0] <= 122):
                    return None
                if seen_idat:
                    idat_closed = True
            cursor = end
        if not (seen_ihdr and seen_idat and seen_iend and width > 0 and height > 0):
            return None
        if width * height > 16_000_000:
            return None
        row_size = 1 + width * channels
        expected_size = height * row_size
        if expected_size > 64_000_000:
            return None
        try:
            decompressor = zlib.decompressobj()
            pixels = decompressor.decompress(b"".join(compressed_parts), expected_size + 1)
        except zlib.error:
            return None
        if len(pixels) != expected_size:
            return None
        if not decompressor.eof or decompressor.unused_data or decompressor.unconsumed_tail:
            return None
        if any(pixels[row * row_size] > 4 for row in range(height)):
            return None
        return (width, height)
    if suffix in {".jpg", ".jpeg"}:
        if len(data) < 12 or not data.startswith(b"\xff\xd8") or not data.endswith(b"\xff\xd9"):
            return None
        try:
            from PIL import Image, UnidentifiedImageError
            with Image.open(io.BytesIO(data)) as image:
                if image.format != "JPEG":
                    return None
                dimensions = image.size
                if dimensions[0] * dimensions[1] > 50_000_000:
                    return None
                image.verify()
            with Image.open(io.BytesIO(data)) as image:
                image.load()
        except (ImportError, UnidentifiedImageError, OSError, SyntaxError, ValueError):
            return None
        return dimensions if dimensions[0] > 0 and dimensions[1] > 0 else None
    return None


def atomic_write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temp_name = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as stream:
            stream.write(content)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temp_name, path)
    finally:
        with contextlib.suppress(FileNotFoundError):
            os.unlink(temp_name)


def atomic_write_bytes(path: Path, content: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temp_name = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    try:
        with os.fdopen(fd, "wb") as stream:
            stream.write(content)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temp_name, path)
    finally:
        with contextlib.suppress(FileNotFoundError):
            os.unlink(temp_name)


@contextlib.contextmanager
def site_lock(site_root: Path):
    lock_path = site_root / ".daily-sync-state" / "publish.lock"
    lock_path.parent.mkdir(parents=True, exist_ok=True)
    os.close(os.open(lock_path, os.O_CREAT | os.O_RDWR, 0o600))
    handle = lock_path.open("r+b")
    acquired = False
    try:
        if os.name == "nt":
            import msvcrt
            handle.seek(0)
            try:
                msvcrt.locking(handle.fileno(), msvcrt.LK_NBLCK, 1)
            except OSError as exc:
                raise RuntimeError("daily website sync already running") from exc
        else:
            import fcntl
            try:
                fcntl.flock(handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
            except OSError as exc:
                raise RuntimeError("daily website sync already running") from exc
        acquired = True
        yield handle.fileno()
    finally:
        if acquired and os.name == "nt":
            with contextlib.suppress(OSError):
                handle.seek(0)
                msvcrt.locking(handle.fileno(), msvcrt.LK_UNLCK, 1)
        elif acquired:
            with contextlib.suppress(OSError):
                fcntl.flock(handle.fileno(), fcntl.LOCK_UN)
        handle.close()


@contextlib.contextmanager
def inherited_site_lock(site_root: Path, file_descriptor: int):
    if os.name == "nt":
        raise RuntimeError("inherited publish lock is supported only on POSIX")
    lock_path = site_root / ".daily-sync-state" / "publish.lock"
    try:
        descriptor_stat = os.fstat(file_descriptor)
        path_stat = lock_path.stat()
    except OSError as exc:
        raise RuntimeError("invalid inherited publish lock") from exc
    if (descriptor_stat.st_dev, descriptor_stat.st_ino) != (path_stat.st_dev, path_stat.st_ino):
        raise RuntimeError("inherited descriptor does not match publish.lock")
    import fcntl
    try:
        fcntl.flock(file_descriptor, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError as exc:
        raise RuntimeError("daily website sync already running") from exc
    yield


def clean_text(value: object, field: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{field} must be non-empty text")
    text = value.strip()
    if any(marker.lower() in text.lower() for marker in FORBIDDEN_PUBLIC_TEXT):
        raise ValueError(f"{field} contains non-public operational text")
    path_scan_text = re.sub(r"(?i)\b(?:https?|ftp)://[^\s<>\"'`()\[\]{}]+", "", text)
    if any(pattern.search(path_scan_text) for pattern in FORBIDDEN_PATH_PATTERNS):
        raise ValueError(f"{field} contains non-public filesystem path")
    return text


def validate_package(payload: dict, allowed_image_root: Path) -> list[dict]:
    approved_root = allowed_image_root.resolve(strict=True)
    if not approved_root.is_dir():
        raise ValueError("allowed image root must be a directory")
    if payload.get("schema_version") != 2:
        raise ValueError("schema_version must be 2")
    package_date = clean_text(payload.get("date"), "date")
    dt.date.fromisoformat(package_date)
    entries = payload.get("entries")
    if not isinstance(entries, list) or not entries:
        raise ValueError("entries must be a non-empty list")

    validated = []
    seen = set()
    seen_slugs = set()
    for raw in entries:
        if not isinstance(raw, dict):
            raise ValueError("entry must be an object")
        kind = raw.get("kind")
        if kind in FORBIDDEN_KINDS:
            raise ValueError("evening briefing is explicitly excluded")
        if kind not in ALLOWED_KINDS:
            raise ValueError(f"unsupported kind: {kind}")
        if kind in seen:
            raise ValueError(f"duplicate kind for date: {kind}")
        seen.add(kind)
        if raw.get("date") != package_date:
            raise ValueError("entry date must match package date")
        if raw.get("website_eligible") is not True:
            raise ValueError(f"{kind} is not website_eligible")

        status = raw.get("source_status")
        if kind == "metrion" and status != "delivered_verified":
            raise ValueError("METRION requires delivered_verified")
        if kind == "art-briefing" and status not in {"delivered_verified", "formal_archived"}:
            raise ValueError("art briefing requires delivered_verified or formal_archived")
        if kind == "art-briefing" and raw.get("briefing_period") != "morning":
            raise ValueError("art briefing requires briefing_period=morning")

        item = dict(raw)
        for field in ("title", "summary", "deck", "body_markdown"):
            item[field] = clean_text(raw.get(field), field)
        slug = clean_text(raw.get("slug"), "slug")
        if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", slug):
            raise ValueError("slug must be lowercase ASCII kebab-case")
        if not slug.startswith(f"{package_date}-"):
            raise ValueError("slug must begin with the package date")
        if slug in seen_slugs:
            raise ValueError(f"duplicate slug: {slug}")
        seen_slugs.add(slug)
        item["slug"] = slug

        image_files = raw.get("image_files", [])
        if not isinstance(image_files, list):
            raise ValueError("image_files must be a list")
        declared_image_hashes = raw.get("image_sha256", [])
        if not isinstance(declared_image_hashes, list) or len(declared_image_hashes) != len(image_files):
            raise ValueError("image_sha256 must contain one digest per image")
        if any(
            not isinstance(digest, str)
            or len(digest) != 64
            or any(character not in "0123456789abcdef" for character in digest)
            for digest in declared_image_hashes
        ):
            raise ValueError("image_sha256 contains an invalid digest")
        if kind == "metrion" and len(image_files) != 4:
            raise ValueError("METRION website entry requires exactly four approved images")
        if kind == "metrion" and raw.get("images_approved") is not True:
            raise ValueError("METRION requires images_approved=true")
        approved_images = []
        validated_images = []
        image_paths = set()
        image_hashes = set()
        for image_index, image in enumerate(image_files):
            path = Path(image).resolve(strict=True)
            try:
                path.relative_to(approved_root)
            except ValueError as exc:
                raise ValueError(f"image outside approved root: {path}") from exc
            if not path.is_file() or path.stat().st_size <= 0:
                raise ValueError(f"missing image: {path}")
            if path.stat().st_size > 100_000_000:
                raise ValueError(f"image file exceeds size limit: {path}")
            image_bytes = path.read_bytes()
            if valid_image_dimensions(path, image_bytes) is None:
                raise ValueError(f"invalid image content: {path}")
            digest = hashlib.sha256(image_bytes).hexdigest()
            if digest != declared_image_hashes[image_index]:
                raise ValueError(f"image digest does not match immutable package: {path}")
            if path in image_paths or digest in image_hashes:
                raise ValueError("METRION images must be distinct")
            image_paths.add(path)
            image_hashes.add(digest)
            approved_images.append(str(path))
            validated_images.append({"path": str(path), "sha256": digest, "bytes": image_bytes})
        item["image_files"] = approved_images
        item["image_sha256"] = list(declared_image_hashes)
        item["_validated_images"] = validated_images
        validated.append(item)
    return validated


def markdown_to_html(markdown: str) -> str:
    lines = markdown.replace("\r\n", "\n").split("\n")
    output: list[str] = []
    paragraph: list[str] = []
    list_type: str | None = None
    numbered_headings = False

    def flush_paragraph() -> None:
        if paragraph:
            output.append(f"<p>{html.escape(' '.join(paragraph))}</p>")
            paragraph.clear()

    def close_list() -> None:
        nonlocal list_type
        if list_type:
            output.append(f"</{list_type}>")
            list_type = None

    for raw_line in lines:
        line = raw_line.strip()
        if not line:
            flush_paragraph(); close_list(); continue
        if line in {"今日一句话总览", "信息来源与检索范围"} or re.match(r"^[一二三四五六七八九十]+、", line):
            flush_paragraph(); close_list()
            output.append(f"<h2>{html.escape(line)}</h2>")
            numbered_headings = any(keyword in line for keyword in ("必看头条", "最新展览", "机构动态", "市场与政策", "技术、知识"))
            continue
        heading = re.match(r"^(#{2,3})\s+(.+)$", line)
        if heading:
            flush_paragraph(); close_list()
            level = len(heading.group(1))
            output.append(f"<h{level}>{html.escape(heading.group(2))}</h{level}>")
            continue
        bullet = re.match(r"^[-*]\s+(.+)$", line)
        numbered = re.match(r"^\d+[.)]\s+(.+)$", line)
        if numbered and numbered_headings:
            flush_paragraph(); close_list()
            output.append(f"<h3>{html.escape(numbered.group(1))}</h3>")
            continue
        if bullet or numbered:
            flush_paragraph()
            wanted = "ul" if bullet else "ol"
            if list_type != wanted:
                close_list(); output.append(f"<{wanted}>"); list_type = wanted
            output.append(f"<li>{html.escape((bullet or numbered).group(1))}</li>")
            continue
        close_list()
        paragraph.append(line)
    flush_paragraph(); close_list()
    return "\n".join(output)


def copy_images(site_root: Path, entry: dict) -> list[str]:
    urls = []
    target_dir = site_root / "assets" / "daily-updates" / entry["date"]
    target_dir.mkdir(parents=True, exist_ok=True)
    for index, validated in enumerate(entry["_validated_images"], 1):
        source = Path(validated["path"])
        suffix = source.suffix.lower()
        if suffix not in {".jpg", ".jpeg", ".png"}:
            raise ValueError(f"unsupported image format: {source}")
        target = target_dir / f"{entry['kind']}-{index:02d}{suffix}"
        image_bytes = validated["bytes"]
        if not target.exists() or hashlib.sha256(target.read_bytes()).hexdigest() != validated["sha256"]:
            atomic_write_bytes(target, image_bytes)
        urls.append(f"../assets/daily-updates/{entry['date']}/{target.name}")
    return urls


def article_html(entry: dict, image_urls: Iterable[str]) -> str:
    date_cn = dt.date.fromisoformat(entry["date"]).strftime("%Y年%m月%d日").replace("年0", "年").replace("月0", "月")
    gallery = ""
    urls = list(image_urls)
    if urls:
        figures = "".join(
            f'<figure><img src="{html.escape(url)}" alt="{html.escape(entry["title"])} 配图{index}" loading="lazy" /><figcaption>合作方向场景示意 {index}</figcaption></figure>'
            for index, url in enumerate(urls, 1)
        )
        gallery = f'<div class="daily-article-gallery" aria-label="文章配图">{figures}</div>'
    body = markdown_to_html(entry["body_markdown"])
    aside_title = "从作品开始判断" if entry["kind"] == "metrion" else "阅读说明"
    aside_copy = "提交作品类型、预计用途和公开边界，先判断合作入口。" if entry["kind"] == "metrion" else "早报内容基于公开来源整理；分析与来源立场相互区分。"
    aside_link = '<a href="../submit-check.html">提交作品判断 →</a>' if entry["kind"] == "metrion" else '<a href="./index.html">返回每日新构 →</a>'
    canonical = f'https://chuyiouart.github.io/yuanweigou/daily-updates/{entry["slug"]}.html'
    return f'''<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>{html.escape(entry["title"])}｜每日新构</title><meta name="description" content="{html.escape(entry["summary"])}" />
<link rel="canonical" href="{canonical}" /><link rel="stylesheet" href="../daily-updates.css?v=20260807-daily-v1" /></head>
<body class="daily-page"><nav class="daily-page-nav" aria-label="文章导航"><a class="daily-page-brand" href="../index.html">元维构 METRION</a><div><a href="./index.html">每日新构</a><a href="../submit-check.html">提交作品</a></div></nav>
<header class="daily-article-hero"><div><p class="daily-article-kicker">{KIND_LABEL[entry["kind"]]}</p><h1>{html.escape(entry["title"])}</h1><p class="daily-article-deck">{html.escape(entry["deck"])}</p><p class="daily-article-meta"><time datetime="{entry["date"]}">{date_cn}</time></p></div></header>
<main class="daily-article-layout"><article class="daily-article-body">{gallery}{body}</article><aside class="daily-article-aside"><strong>{aside_title}</strong><p>{aside_copy}</p>{aside_link}</aside></main>
<footer class="daily-page-footer">元维构 METRION · 每日新构</footer></body></html>'''


def update_index(site_root: Path, entries: list[dict]) -> None:
    index_path = site_root / "daily-updates" / "index.json"
    current = {"schema_version": 1, "entries": []}
    if index_path.exists():
        current = json.loads(index_path.read_text(encoding="utf-8"))
    retained = [item for item in current.get("entries", []) if item.get("kind") in ALLOWED_KINDS]
    by_key = {(item["date"], item["kind"]): item for item in retained}
    for entry in entries:
        by_key[(entry["date"], entry["kind"])] = {
            "date": entry["date"], "kind": entry["kind"], "title": entry["title"],
            "summary": entry["summary"], "url": f'daily-updates/{entry["slug"]}.html',
            "source_status": entry["source_status"],
        }
    ordered = sorted(by_key.values(), key=lambda item: (item["date"], item["kind"] == "metrion"), reverse=True)
    scope = {"included": ["metrion", "art-briefing"], "excluded": ["ai-evening"]}
    public_content_changed = ordered != current.get("entries", []) or scope != current.get("scope")
    updated_at = current.get("updated_at")
    if public_content_changed or not updated_at:
        updated_at = dt.datetime.now(dt.timezone(dt.timedelta(hours=8))).isoformat(timespec="seconds")
    payload = {
        "schema_version": 1,
        "updated_at": updated_at,
        "content_through": max(item["date"] for item in ordered),
        "scope": scope,
        "entries": ordered,
    }
    atomic_write(index_path, json.dumps(payload, ensure_ascii=False, indent=2) + "\n")


def validate_against_existing_index(site_root: Path, entries: list[dict]) -> None:
    index_path = site_root / "daily-updates" / "index.json"
    current_entries = []
    if index_path.exists():
        current_entries = json.loads(index_path.read_text(encoding="utf-8")).get("entries", [])
    existing_by_key = {}
    existing_by_url = {}
    for item in current_entries:
        key = (item.get("date"), item.get("kind"))
        url = item.get("url")
        if key in existing_by_key:
            raise ValueError(f"duplicate existing index key: {key}")
        owner = existing_by_url.get(url)
        if owner is not None and owner != key:
            raise ValueError(f"duplicate existing index URL: {url}")
        existing_by_key[key] = item
        existing_by_url[url] = key
    for entry in entries:
        key = (entry["date"], entry["kind"])
        desired_url = f'daily-updates/{entry["slug"]}.html'
        previous = existing_by_key.get(key)
        if previous and previous.get("url") != desired_url:
            raise ValueError(f"published entry cannot change slug: {entry['slug']}")
        owner = existing_by_url.get(desired_url)
        if owner is not None and owner != key:
            raise ValueError(f"slug collides with existing entry: {entry['slug']}")
        target = site_root / desired_url
        if target.exists() and previous is None:
            raise ValueError(f"article path already exists outside index key: {entry['slug']}")


def publish(package_path: Path, site_root: Path, allowed_image_root: Path, lock_fd: int | None = None) -> dict:
    written = []
    written_assets = []
    lock_context = inherited_site_lock(site_root, lock_fd) if lock_fd is not None else site_lock(site_root)
    with lock_context:
        package_bytes = package_path.read_bytes()
        payload = json.loads(package_bytes.decode("utf-8"))
        entries = validate_package(payload, allowed_image_root)
        validate_against_existing_index(site_root, entries)
        for entry in entries:
            image_urls = copy_images(site_root, entry)
            written_assets.extend(url.removeprefix("../") for url in image_urls)
            target = site_root / "daily-updates" / f'{entry["slug"]}.html'
            atomic_write(target, article_html(entry, image_urls))
            written.append(str(target.relative_to(site_root)).replace("\\", "/"))
        update_index(site_root, entries)
        public_paths = ["daily-updates/index.json", *written, *written_assets]
        files = [
            {
                "path": relative_name,
                "sha256": hashlib.sha256((site_root / relative_name).read_bytes()).hexdigest(),
            }
            for relative_name in public_paths
        ]
        state = {
            "date": payload["date"], "status": "published_locally", "entries": written,
            "assets": written_assets, "files": files,
            "package_sha256": hashlib.sha256(package_bytes).hexdigest(),
        }
        atomic_write(site_root / ".daily-sync-state" / f'{payload["date"]}.json', json.dumps(state, ensure_ascii=False, indent=2) + "\n")
    return state


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--package", required=True, type=Path)
    parser.add_argument("--site-root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--allowed-image-root", required=True, type=Path)
    parser.add_argument("--lock-fd", type=int, help=argparse.SUPPRESS)
    args = parser.parse_args()
    print(json.dumps(publish(args.package.resolve(), args.site_root.resolve(), args.allowed_image_root, args.lock_fd), ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
