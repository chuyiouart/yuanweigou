#!/usr/bin/env python3
"""Shared, state-free responsive website image derivation and publication gates.

Only website derivatives are written. Source archives are read and hash-checked but
never modified. Business locks/state remain owned by each publisher.
"""
from __future__ import annotations

import argparse
import hashlib
import html
import json
import os
import shutil
import tempfile
from pathlib import Path
from typing import Any, Iterable

from PIL import Image, ImageOps, UnidentifiedImageError

EFFECTIVE_DATE = "2026-08-12"
SCHEMA_VERSION = 1
DEFAULT_WIDTHS = (480, 768, 1280)
DEFAULT_QUALITY_LADDER = (84, 78, 72)
DEFAULT_SIZES = {
    "card": "(max-width: 680px) 100vw, 360px",
    "hero": "(max-width: 680px) 100vw, 70vw",
    "content": "(max-width: 680px) 100vw, 760px",
    "gallery": "(max-width: 680px) 100vw, 50vw",
}


class WebImageError(ValueError):
    pass


def _sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _decode(path: Path) -> tuple[Image.Image, dict[str, Any]]:
    if not path.is_file() or path.is_symlink():
        raise WebImageError(f"source_not_regular_file:{path}")
    before = path.read_bytes()
    try:
        with Image.open(path) as opened:
            opened.verify()
        with Image.open(path) as opened:
            source_format = str(opened.format or "").upper()
            icc = opened.info.get("icc_profile")
            image = ImageOps.exif_transpose(opened)
            image.load()
            has_alpha = image.mode in {"RGBA", "LA"} or "transparency" in opened.info
            image = image.convert("RGBA" if has_alpha else "RGB")
    except (OSError, SyntaxError, ValueError, UnidentifiedImageError) as exc:
        raise WebImageError(f"source_decode_failed:{path}:{exc}") from exc
    if source_format not in {"PNG", "JPEG", "WEBP"}:
        raise WebImageError(f"unsupported_source_format:{source_format}")
    return image, {
        "bytes": len(before), "sha256": _sha(before), "format": source_format,
        "width": image.width, "height": image.height, "icc_profile": icc,
        "has_alpha": has_alpha,
    }


def _budget(width: int, role: str, overrides: dict[int, int] | None) -> int:
    if overrides and width in overrides:
        return int(overrides[width])
    if role == "card" or width <= 480:
        return 180 * 1024
    if role == "hero" and width <= 768:
        return 450 * 1024
    if width <= 768:
        return 300 * 1024
    return 800 * 1024


def _save_webp(image: Image.Image, path: Path, quality: int, icc_profile: bytes | None) -> None:
    kwargs: dict[str, Any] = {"format": "WEBP", "quality": quality, "method": 6, "exact": True}
    if icc_profile:
        kwargs["icc_profile"] = icc_profile
    image.save(path, **kwargs)


def _verified_row(path: Path, *, quality: int | str, page_use: str, expected_size: tuple[int, int], fmt: str) -> dict[str, Any]:
    data = path.read_bytes()
    try:
        with Image.open(path) as opened:
            opened.load()
            width, height = opened.size
            actual_format = str(opened.format or "").lower()
    except Exception as exc:
        raise WebImageError(f"derivative_decode_failed:{path}:{exc}") from exc
    if (width, height) != expected_size:
        raise WebImageError(f"derivative_dimensions_mismatch:{path}:{width}x{height}")
    if actual_format != fmt:
        raise WebImageError(f"derivative_format_mismatch:{path}:{actual_format}")
    return {
        "path": str(path), "width": width, "height": height, "format": fmt,
        "mime": "image/webp" if fmt == "webp" else ("image/png" if fmt == "png" else "image/jpeg"),
        "bytes": len(data), "sha256": _sha(data), "quality": quality, "page_use": page_use,
    }


def _fallback(stage: Path, stem: str, image: Image.Image, meta: dict[str, Any]) -> dict[str, Any]:
    source_format = meta["format"]
    suffix = ".png" if source_format == "PNG" else ".jpg"
    fmt = "png" if source_format == "PNG" else "jpeg"
    width_candidates = [min(image.width, value) for value in (1280, 960, 768, 480)]
    width_candidates = list(dict.fromkeys(width_candidates))
    for width in width_candidates:
        height = max(1, round(image.height * width / image.width))
        candidate = image if (width, height) == image.size else image.resize((width, height), Image.Resampling.LANCZOS)
        qualities: Iterable[int | str] = ("lossless",) if fmt == "png" else DEFAULT_QUALITY_LADDER
        for quality in qualities:
            path = stage / f"{stem}-fallback{suffix}"
            kwargs: dict[str, Any]
            if fmt == "png":
                kwargs = {"format": "PNG", "optimize": True, "compress_level": 9}
            else:
                kwargs = {"format": "JPEG", "quality": int(quality), "optimize": True, "progressive": True, "subsampling": 0}
            if meta.get("icc_profile"):
                kwargs["icc_profile"] = meta["icc_profile"]
            save_image = candidate
            if fmt == "jpeg" and save_image.mode != "RGB":
                background = Image.new("RGB", save_image.size, "white")
                background.paste(save_image, mask=save_image.getchannel("A"))
                save_image = background
            save_image.save(path, **kwargs)
            if path.stat().st_size <= 1024 * 1024:
                return _verified_row(path, quality=quality, page_use="fallback", expected_size=(width, height), fmt=fmt)
    raise WebImageError("fallback_budget_exceeded")


def derive_responsive_assets(
    source: Path | str,
    output_dir: Path | str,
    stem: str,
    *,
    widths: Iterable[int] = DEFAULT_WIDTHS,
    page_role: str,
    original_url: str | None = None,
    sizes: str | None = None,
    budgets: dict[int, int] | None = None,
    quality_ladder: Iterable[int] = DEFAULT_QUALITY_LADDER,
    expected_text: list[str] | None = None,
    require_text_qa: bool = False,
) -> dict[str, Any]:
    source = Path(source)
    output_dir = Path(output_dir)
    if not stem or any(part in stem for part in ("/", "\\", "..")):
        raise WebImageError("unsafe_stem")
    image, meta = _decode(source)
    requested = sorted({int(value) for value in widths if int(value) > 0 and int(value) <= image.width})
    if not requested:
        requested = [image.width]
    output_dir.mkdir(parents=True, exist_ok=True)
    stage = Path(tempfile.mkdtemp(prefix=f".{stem}-stage-", dir=output_dir))
    rows: list[dict[str, Any]] = []
    committed: list[Path] = []
    try:
        for width in requested:
            height = max(1, round(image.height * width / image.width))
            resized = image if (width, height) == image.size else image.resize((width, height), Image.Resampling.LANCZOS)
            budget = _budget(width, page_role, budgets)
            accepted = None
            for quality in quality_ladder:
                candidate = stage / f"{stem}-{width}.webp"
                _save_webp(resized, candidate, int(quality), meta.get("icc_profile"))
                row = _verified_row(candidate, quality=int(quality), page_use=page_role, expected_size=(width, height), fmt="webp")
                if row["bytes"] <= budget:
                    row["budget_bytes"] = budget
                    accepted = row
                    break
            if accepted is None:
                raise WebImageError(f"derivative_budget_exceeded:{stem}:{width}:{budget}")
            rows.append(accepted)
        fallback = _fallback(stage, stem, image, meta)
        for row in [*rows, fallback]:
            src = Path(row["path"])
            dst = output_dir / src.name
            os.replace(src, dst)
            row["path"] = str(dst)
            committed.append(dst)
        if source.read_bytes() != source.read_bytes() or _sha(source.read_bytes()) != meta["sha256"]:
            raise WebImageError("source_mutated_during_derivation")
    except Exception:
        for path in committed:
            path.unlink(missing_ok=True)
        raise
    finally:
        shutil.rmtree(stage, ignore_errors=True)
    srcset = ", ".join(f"{Path(row['path']).name}?v={row['sha256'][:12]} {row['width']}w" for row in rows)
    manifest = {
        "schema_version": SCHEMA_VERSION, "effective_date": EFFECTIVE_DATE,
        "original_path": str(source), "original_url": original_url, "original_sha256": meta["sha256"],
        "original_bytes": meta["bytes"], "original_width": meta["width"], "original_height": meta["height"],
        "page_role": page_role, "sizes": sizes or DEFAULT_SIZES.get(page_role, "100vw"),
        "srcset": srcset, "derivatives": rows, "fallback": fallback,
        "expected_text": list(expected_text or []), "require_text_qa": bool(require_text_qa),
        "qa_receipts": {}, "source_preserved": True,
    }
    validate_web_image_manifest(manifest, require_qa=False)
    return manifest


def inspect_existing_web_asset(path: Path | str, *, page_role: str, max_bytes: int) -> dict[str, Any]:
    """Validate an already-derived asset used by an existing production publisher."""
    path = Path(path)
    if not path.is_file() or path.is_symlink():
        raise WebImageError(f"existing_asset_missing:{path}")
    data = path.read_bytes()
    if len(data) > max_bytes:
        raise WebImageError(f"existing_asset_budget_exceeded:{path}:{len(data)}:{max_bytes}")
    try:
        with Image.open(path) as image:
            image.load()
            width, height = image.size
            fmt = str(image.format or "").lower()
    except Exception as exc:
        raise WebImageError(f"existing_asset_decode_failed:{path}:{exc}") from exc
    if fmt != "webp" or path.suffix.lower() != ".webp":
        raise WebImageError(f"existing_asset_not_webp:{path}:{fmt}")
    return {
        "path": str(path), "bytes": len(data), "sha256": _sha(data),
        "width": width, "height": height, "format": "webp", "mime": "image/webp",
        "page_use": page_role, "budget_bytes": int(max_bytes),
        "web_image_delivery_effective_date": EFFECTIVE_DATE,
    }


def validate_web_image_manifest(manifest: dict[str, Any], *, require_qa: bool) -> None:
    if manifest.get("schema_version") != SCHEMA_VERSION or manifest.get("effective_date") != EFFECTIVE_DATE:
        raise WebImageError("manifest_version_or_effective_date_invalid")
    if manifest.get("source_preserved") is not True:
        raise WebImageError("source_preservation_not_proven")
    original = Path(str(manifest.get("original_path") or ""))
    if not original.is_file() or _sha(original.read_bytes()) != manifest.get("original_sha256"):
        raise WebImageError("original_identity_drift")
    derivatives = manifest.get("derivatives")
    if not isinstance(derivatives, list) or not derivatives:
        raise WebImageError("derivatives_missing")
    all_rows = [*derivatives, manifest.get("fallback")]
    for row in all_rows:
        if not isinstance(row, dict):
            raise WebImageError("asset_manifest_row_invalid")
        path = Path(str(row.get("path") or ""))
        if not path.is_file() or path.stat().st_size != row.get("bytes") or _sha(path.read_bytes()) != row.get("sha256"):
            raise WebImageError(f"asset_identity_invalid:{path}")
        with Image.open(path) as image:
            image.load()
            if image.size != (row.get("width"), row.get("height")):
                raise WebImageError(f"asset_dimensions_invalid:{path}")
        if row.get("width", 0) > manifest.get("original_width", 0) or row.get("height", 0) > manifest.get("original_height", 0):
            raise WebImageError("upscaling_forbidden")
    if manifest.get("fallback", {}).get("bytes", 2**63) > 1024 * 1024:
        raise WebImageError("fallback_budget_exceeded")
    if require_qa and manifest.get("require_text_qa"):
        receipts = manifest.get("qa_receipts")
        if not isinstance(receipts, dict):
            raise WebImageError("qa_receipts_missing")
        keyed = [(str(row["width"]), row) for row in derivatives] + [("fallback", manifest["fallback"])]
        for key, row in keyed:
            receipt = receipts.get(key)
            if not isinstance(receipt, dict) or receipt.get("image_sha256") != row["sha256"]:
                raise WebImageError(f"qa_receipt_identity_missing:{key}")
            if receipt.get("ocr_exact_match") is not True or receipt.get("vision_mobile_readable") is not True or receipt.get("artifacts") is not False:
                raise WebImageError(f"qa_failed:{key}")


def _url(path: str, sha256: str, prefix: str) -> str:
    base = f"{prefix}{Path(path).name}"
    return f"{base}{'&' if '?' in base else '?'}v={sha256[:12]}"


def build_picture_html(
    manifest: dict[str, Any], *, alt: str, sizes: str | None = None,
    lcp: bool, relative_prefix: str = "", css_class: str | None = None,
) -> str:
    validate_web_image_manifest(manifest, require_qa=bool(manifest.get("require_text_qa")))
    sizes = sizes or str(manifest["sizes"])
    srcset = ", ".join(f"{_url(row['path'], row['sha256'], relative_prefix)} {row['width']}w" for row in manifest["derivatives"])
    fallback = manifest["fallback"]
    attrs = [
        f'src="{html.escape(_url(fallback["path"], fallback["sha256"], relative_prefix), quote=True)}"',
        f'srcset="{html.escape(srcset, quote=True)}"', f'sizes="{html.escape(sizes, quote=True)}"',
        f'alt="{html.escape(alt, quote=True)}"', f'width="{fallback["width"]}"', f'height="{fallback["height"]}"',
        'loading="eager"' if lcp else 'loading="lazy"', 'decoding="async"',
    ]
    if lcp:
        attrs.append('fetchpriority="high"')
    if css_class:
        attrs.append(f'class="{html.escape(css_class, quote=True)}"')
    source = f'<source type="image/webp" srcset="{html.escape(srcset, quote=True)}" sizes="{html.escape(sizes, quote=True)}" />'
    return f'<picture>{source}<img {" ".join(attrs)} /></picture>'


def prepare_from_spec(spec: dict[str, Any]) -> dict[str, Any]:
    """Prepare deterministic derivatives for a later Agent OCR/Vision receipt pass."""
    target_date = str(spec.get("date") or "")
    if target_date < EFFECTIVE_DATE:
        raise WebImageError("web_delivery_not_effective_for_date")
    jobs = spec.get("jobs")
    if not isinstance(jobs, list) or not jobs:
        raise WebImageError("prepare_jobs_missing")
    assets = []
    for job in jobs:
        if not isinstance(job, dict):
            raise WebImageError("prepare_job_invalid")
        asset = derive_responsive_assets(
            job["source"], job["output_dir"], job["stem"],
            widths=tuple(job.get("widths") or DEFAULT_WIDTHS), page_role=job["page_role"],
            original_url=job.get("original_url"), sizes=job.get("sizes"),
            expected_text=list(job.get("expected_text") or []),
            require_text_qa=bool(job.get("require_text_qa", True)),
        )
        asset["source_sha256"] = asset["original_sha256"]
        assets.append(asset)
    return {"schema_version": SCHEMA_VERSION, "effective_date": EFFECTIVE_DATE, "date": target_date, "assets": assets, "image_generation_called": False, "publication_called": False, "telegram_called": False}


def main() -> int:
    parser = argparse.ArgumentParser(description="Prepare/validate website-only responsive image derivatives")
    sub = parser.add_subparsers(dest="command", required=True)
    prepare = sub.add_parser("prepare")
    prepare.add_argument("--spec", required=True)
    prepare.add_argument("--manifest", required=True)
    validate = sub.add_parser("validate")
    validate.add_argument("--manifest", required=True)
    args = parser.parse_args()
    manifest_path = Path(args.manifest)
    if args.command == "prepare":
        spec = json.loads(Path(args.spec).read_text(encoding="utf-8"))
        result = prepare_from_spec(spec)
        manifest_path.parent.mkdir(parents=True, exist_ok=True)
        temporary = manifest_path.with_name(f".{manifest_path.name}.tmp")
        temporary.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        os.replace(temporary, manifest_path)
    else:
        result = json.loads(manifest_path.read_text(encoding="utf-8"))
        if result.get("effective_date") != EFFECTIVE_DATE or not isinstance(result.get("assets"), list):
            raise WebImageError("package_manifest_invalid")
        for asset in result["assets"]:
            validate_web_image_manifest(asset, require_qa=True)
    print(json.dumps({"status": "PASS", "command": args.command, "manifest": str(manifest_path), "asset_count": len(result["assets"])}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
