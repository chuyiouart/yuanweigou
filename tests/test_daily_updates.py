import hashlib
import importlib.util
import json
import struct
import subprocess
import sys
import tempfile
import unittest
import zlib
from PIL import Image
from unittest import mock
from pathlib import Path

MODULE_PATH = Path(__file__).resolve().parents[1] / "tools" / "publish_daily_updates.py"
spec = importlib.util.spec_from_file_location("publisher", MODULE_PATH)
publisher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(publisher)


def png_bytes(red: int, green: int, blue: int) -> bytes:
    def chunk(kind: bytes, payload: bytes) -> bytes:
        body = kind + payload
        return struct.pack(">I", len(payload)) + body + struct.pack(">I", zlib.crc32(body) & 0xFFFFFFFF)

    signature = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0)
    scanline = b"\x00" + bytes((red, green, blue))
    return signature + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(scanline)) + chunk(b"IEND", b"")


class DailyPublisherTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        (self.root / "daily-updates").mkdir()
        (self.root / "daily-updates" / "index.json").write_text(
            json.dumps({"schema_version": 1, "entries": []}), encoding="utf-8"
        )
        self.approved = self.root / "approved-images"
        self.approved.mkdir()
        self.art_approved = self.root / "art-approved-images"
        self.art_approved.mkdir()
        self.images = []
        for index in range(4):
            path = self.approved / f"source-{index}.png"
            path.write_bytes(png_bytes(index + 1, index + 2, index + 3))
            self.images.append(str(path))

    def tearDown(self):
        self.temp.cleanup()

    def package(self, kind="metrion", status="delivered_verified", date="2026-08-06"):
        images = self.images if kind == "metrion" else []
        image_hashes = [hashlib.sha256(Path(image).read_bytes()).hexdigest() for image in images]
        entry = {
            "date": date,
            "kind": kind,
            "title": "测试标题",
            "summary": "公开摘要",
            "deck": "公开导语",
            "body_markdown": "## 第一节\n\n正文。\n\n- 要点一",
            "slug": f"{date}-{kind}",
            "website_eligible": True,
            "source_status": status,
            "image_files": images,
            "image_sha256": image_hashes,
        }
        if kind == "metrion":
            entry["images_approved"] = True
        if kind == "art-briefing":
            entry["briefing_period"] = "morning"
        return {"schema_version": 2, "date": date, "entries": [entry]}

    def write_package(self, payload):
        path = self.root / "package.json"
        path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
        return path

    def publish(self, payload):
        return publisher.publish(self.write_package(payload), self.root, self.approved)

    def add_future_delivery(self, payload, *, text_qa=True):
        records = []
        for index, image_name in enumerate(payload["entries"][0]["image_files"], 1):
            source = Path(image_name)
            preview_dir = self.root / "receipt-preview" / str(index)
            manifest = publisher.derive_responsive_assets(
                source, preview_dir, f"preview-{index}", widths=(480, 768, 1280),
                page_role="gallery", expected_text=[f"图中文字 {index}"],
                require_text_qa=text_qa,
            )
            receipts = {}
            if text_qa:
                for key, row in [
                    *[(str(row["width"]), row) for row in manifest["derivatives"]],
                    ("fallback", manifest["fallback"]),
                ]:
                    receipts[key] = {
                        "image_sha256": row["sha256"],
                        "ocr_exact_match": True,
                        "vision_mobile_readable": True,
                        "artifacts": False,
                    }
            records.append({
                "source_sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
                "expected_text": [f"图中文字 {index}"] if text_qa else [],
                "qa_receipts": receipts,
            })
        payload["entries"][0]["web_image_delivery"] = records
        return payload

    def test_publishes_verified_metrion_and_is_idempotent(self):
        package = self.write_package(self.package())
        first = publisher.publish(package, self.root, self.approved)
        target = self.root / first["entries"][0]
        before = target.read_bytes()
        index_before = (self.root / "daily-updates" / "index.json").read_bytes()
        second = publisher.publish(package, self.root, self.approved)
        self.assertEqual(first["entries"], second["entries"])
        self.assertEqual(before, target.read_bytes())
        self.assertEqual(index_before, (self.root / "daily-updates" / "index.json").read_bytes())
        self.assertEqual(len(first["assets"]), 4)
        self.assertTrue(all(asset.startswith("assets/daily-updates/2026-08-06/") for asset in first["assets"]))
        index = json.loads((self.root / "daily-updates" / "index.json").read_text(encoding="utf-8"))
        self.assertEqual(index["entries"][0]["source_status"], "delivered_verified")
        self.assertEqual(len(list((self.root / "assets" / "daily-updates" / "2026-08-06").glob("*"))), 4)

    def test_future_metrion_requires_package_bound_web_image_qa(self):
        payload = self.package(date="2026-08-12")
        with self.assertRaisesRegex(ValueError, "web_image_delivery"):
            self.publish(payload)

    def test_future_metrion_derives_sha_bound_responsive_picture_chain(self):
        for index, image_name in enumerate(self.images):
            Image.new("RGB", (1400, 900), (20 + index, 40 + index, 60 + index)).save(image_name)
        payload = self.add_future_delivery(self.package(date="2026-08-12"))
        state = self.publish(payload)
        page = (self.root / state["entries"][0]).read_text(encoding="utf-8")

        self.assertEqual(len(state["web_image_delivery"]), 4)
        self.assertEqual(page.count("<picture>"), 4)
        self.assertEqual(page.count('loading="eager"'), 1)
        self.assertEqual(page.count('fetchpriority="high"'), 1)
        self.assertEqual(page.count('loading="lazy"'), 3)
        self.assertEqual(page.count('sizes="(max-width: 680px) 100vw, 50vw"'), 8)
        self.assertIn(" 480w", page)
        self.assertIn(" 768w", page)
        self.assertIn(" 1280w", page)
        for manifest in state["web_image_delivery"]:
            self.assertEqual([row["width"] for row in manifest["derivatives"]], [480, 768, 1280])
            self.assertTrue(manifest["require_text_qa"])
            self.assertEqual(set(manifest["qa_receipts"]), {"480", "768", "1280", "fallback"})
            self.assertTrue(all(row["width"] <= manifest["original_width"] for row in manifest["derivatives"]))
            publisher.validate_web_image_manifest(manifest, require_qa=True)
        self.assertTrue(all((self.root / asset).is_file() for asset in state["assets"]))

    def test_future_art_image_is_responsive_without_canonical_text_qa(self):
        image = self.art_approved / "future-art.png"
        Image.new("RGB", (900, 600), (90, 100, 110)).save(image)
        payload = self.package("art-briefing", "delivered_verified", date="2026-08-12")
        payload["entries"][0]["image_files"] = [str(image)]
        payload["entries"][0]["image_sha256"] = [hashlib.sha256(image.read_bytes()).hexdigest()]
        self.add_future_delivery(payload, text_qa=False)
        state = publisher.publish(
            self.write_package(payload), self.root, self.approved,
            art_allowed_image_root=self.art_approved,
        )
        manifest = state["web_image_delivery"][0]
        self.assertFalse(manifest["require_text_qa"])
        self.assertEqual(manifest["qa_receipts"], {})
        self.assertLessEqual(manifest["fallback"]["bytes"], 1024 * 1024)
        publisher.validate_web_image_manifest(manifest, require_qa=False)

    def test_accepts_formal_art_brief_without_images(self):
        payload = self.package("art-briefing", "formal_archived")
        payload["entries"][0]["body_markdown"] = "一、必看头条（1条）\n\n1. 新闻标题\n\n- 来源：机构\n\n五、今日组合观察\n\n1. 保持为列表"
        state = self.publish(payload)
        page = (self.root / state["entries"][0]).read_text(encoding="utf-8")
        self.assertIn("视觉艺术早报", page)
        self.assertIn("<h3>新闻标题</h3>", page)
        self.assertIn("<li>保持为列表</li>", page)

    def test_art_briefing_image_uses_separate_narrow_approved_root(self):
        image = self.art_approved / "source-preview.png"
        image.write_bytes(png_bytes(80, 90, 100))
        payload = self.package("art-briefing", "delivered_verified")
        payload["entries"][0]["image_files"] = [str(image)]
        payload["entries"][0]["image_sha256"] = [hashlib.sha256(image.read_bytes()).hexdigest()]
        package = self.write_package(payload)
        state = publisher.publish(
            package, self.root, self.approved,
            art_allowed_image_root=self.art_approved,
        )
        self.assertEqual(state["assets"], ["assets/daily-updates/2026-08-06/art-briefing-01.png"])
        page = (self.root / state["entries"][0]).read_text(encoding="utf-8")
        self.assertIn("../assets/daily-updates/2026-08-06/art-briefing-01.png", page)
        self.assertIn("来源文章配图", page)

    def test_art_brief_renders_safe_external_markdown_links(self):
        payload = self.package("art-briefing", "formal_archived")
        payload["entries"][0]["body_markdown"] = (
            "## 来源\n\n"
            "- [The Met](https://www.metmuseum.org/art/collection/search/123)\n"
            "- [危险链接](javascript:alert(1))"
        )
        state = self.publish(payload)
        page = (self.root / state["entries"][0]).read_text(encoding="utf-8")
        self.assertIn(
            '<a href="https://www.metmuseum.org/art/collection/search/123" rel="external nofollow noopener">The Met</a>',
            page,
        )
        self.assertNotIn('href="javascript:', page)
        self.assertIn("[危险链接](javascript:alert(1))", page)
        self.assertNotIn("合作方向场景示意", page)

    def test_rejects_evening_brief(self):
        payload = self.package("art-briefing", "formal_archived")
        payload["entries"][0]["kind"] = "ai-evening"
        with self.assertRaisesRegex(ValueError, "evening briefing"):
            self.publish(payload)

    def test_rejects_evening_content_mislabeled_as_art_briefing(self):
        payload = self.package("art-briefing", "formal_archived")
        payload["entries"][0]["briefing_period"] = "evening"
        with self.assertRaisesRegex(ValueError, "briefing_period=morning"):
            self.publish(payload)

    def test_rejects_unverified_or_recovered_only_metrion(self):
        for status in ("draft", "complete_recovered"):
            with self.subTest(status=status), self.assertRaisesRegex(ValueError, "requires delivered_verified"):
                self.publish(self.package(status=status))

    def test_rejects_metrion_without_four_images(self):
        payload = self.package()
        payload["entries"][0]["image_files"] = self.images[:3]
        payload["entries"][0]["image_sha256"] = payload["entries"][0]["image_sha256"][:3]
        with self.assertRaisesRegex(ValueError, "exactly four"):
            self.publish(payload)

    def test_rejects_metrion_without_explicit_image_approval(self):
        payload = self.package()
        payload["entries"][0]["images_approved"] = False
        with self.assertRaisesRegex(ValueError, "images_approved=true"):
            self.publish(payload)

    def test_rejects_internal_operational_text(self):
        payload = self.package()
        payload["entries"][0]["body_markdown"] = "内部路径 /root/.hermes/secret"
        with self.assertRaisesRegex(ValueError, "non-public operational text"):
            self.publish(payload)

    def test_rejects_absolute_filesystem_paths_without_boundary_assumptions(self):
        internal_paths = (
            r"prefix=C:\private\secret.txt",
            "unix=/root/secret",
            "/home/user/private.txt",
            "/Users/alice/.ssh/id_rsa",
            "/tmp/secret",
            r"\server\share\secret.jpg",
            r"\server/share/secret.jpg",
            r"\\server\share\secret.jpg",
            "//server/share/secret.jpg",
            r"\\\\server\\share\\secret.jpg",
            "/workspace/secret",
            "/data/secret",
            "/Applications/Secret.app",
            "/Library/Secrets/file",
            "/System/Library/key",
            "/media/user/secret",
            "/boot/secret",
            "/c/Users/saint/secret",
        )
        for internal_path in internal_paths:
            payload = self.package()
            payload["entries"][0]["body_markdown"] = f"内部文件 {internal_path}"
            with self.subTest(path=internal_path), self.assertRaisesRegex(ValueError, "non-public filesystem path"):
                self.publish(payload)

    def test_allows_public_urls_while_scanning_local_paths(self):
        public_urls = (
            "https://example.com/news",
            "https://example.com/data/story",
            "http://example.com/Users/guide",
            "ftp://example.com/library/file.txt",
        )
        for public_url in public_urls:
            with self.subTest(url=public_url):
                text = f"公开来源 {public_url}"
                self.assertEqual(publisher.clean_text(text, "body"), text)
        for prose in ("Use root/home labels in prose", "The data/library collection is public"):
            with self.subTest(prose=prose):
                self.assertEqual(publisher.clean_text(prose, "body"), prose)
        with self.assertRaisesRegex(ValueError, "non-public filesystem path"):
            publisher.clean_text("'http://example.com/Users/guide'D:/data/secret", "body")

    def test_rejects_image_outside_approved_root(self):
        outside = self.root / "outside.png"
        outside.write_bytes(png_bytes(20, 30, 40))
        payload = self.package()
        payload["entries"][0]["image_files"][0] = str(outside)
        with self.assertRaisesRegex(ValueError, "outside approved root"):
            self.publish(payload)

    def test_rejects_invalid_image_content(self):
        invalid = self.approved / "invalid.png"
        invalid.write_bytes(b"not really an image")
        payload = self.package()
        payload["entries"][0]["image_files"][0] = str(invalid)
        with self.assertRaisesRegex(ValueError, "invalid image content"):
            self.publish(payload)

    def test_rejects_png_shell_without_idat(self):
        def chunk(kind, body):
            payload = kind + body
            return struct.pack(">I", len(body)) + payload + struct.pack(">I", zlib.crc32(payload) & 0xFFFFFFFF)
        shell = self.approved / "shell.png"
        ihdr = struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0)
        shell.write_bytes(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IEND", b""))
        payload = self.package()
        payload["entries"][0]["image_files"][0] = str(shell)
        with self.assertRaisesRegex(ValueError, "invalid image content"):
            self.publish(payload)

    def test_rejects_png_with_fake_idat_payload(self):
        def chunk(kind, body):
            payload = kind + body
            return struct.pack(">I", len(body)) + payload + struct.pack(">I", zlib.crc32(payload) & 0xFFFFFFFF)
        fake = self.approved / "fake-idat.png"
        ihdr = struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0)
        fake.write_bytes(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", b"not-zlib") + chunk(b"IEND", b""))
        payload = self.package()
        payload["entries"][0]["image_files"][0] = str(fake)
        with self.assertRaisesRegex(ValueError, "invalid image content"):
            self.publish(payload)

    def test_rejects_png_with_invalid_scanline_filter(self):
        def chunk(kind, body):
            payload = kind + body
            return struct.pack(">I", len(body)) + payload + struct.pack(">I", zlib.crc32(payload) & 0xFFFFFFFF)
        invalid = self.approved / "invalid-filter.png"
        ihdr = struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0)
        invalid.write_bytes(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(b"\x05\x01\x02\x03")) + chunk(b"IEND", b""))
        payload = self.package()
        payload["entries"][0]["image_files"][0] = str(invalid)
        with self.assertRaisesRegex(ValueError, "invalid image content"):
            self.publish(payload)

    def test_rejects_png_decompression_bomb_beyond_declared_dimensions(self):
        def chunk(kind, body):
            payload = kind + body
            return struct.pack(">I", len(body)) + payload + struct.pack(">I", zlib.crc32(payload) & 0xFFFFFFFF)
        bomb = self.approved / "bomb.png"
        ihdr = struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0)
        expanded = b"\x00\x01\x02\x03" + b"x" * 5_000_000
        bomb.write_bytes(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(expanded)) + chunk(b"IEND", b""))
        payload = self.package()
        payload["entries"][0]["image_files"][0] = str(bomb)
        with self.assertRaisesRegex(ValueError, "invalid image content"):
            self.publish(payload)

    def test_rejects_nonconsecutive_idat_trailing_zlib_and_unknown_critical_chunk(self):
        def chunk(kind, body):
            payload = kind + body
            return struct.pack(">I", len(body)) + payload + struct.pack(">I", zlib.crc32(payload) & 0xFFFFFFFF)
        signature = b"\x89PNG\r\n\x1a\n"
        ihdr = chunk(b"IHDR", struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0))
        compressed = zlib.compress(b"\x00\x01\x02\x03")
        split = len(compressed) // 2
        variants = {
            "nonconsecutive": ihdr + chunk(b"IDAT", compressed[:split]) + chunk(b"tEXt", b"x") + chunk(b"IDAT", compressed[split:]),
            "trailing-zlib": ihdr + chunk(b"IDAT", compressed + b"garbage"),
            "unknown-critical": ihdr + chunk(b"ABCD", b"x") + chunk(b"IDAT", compressed),
        }
        for name, body in variants.items():
            with self.subTest(name=name):
                invalid = self.approved / f"{name}.png"
                invalid.write_bytes(signature + body + chunk(b"IEND", b""))
                payload = self.package()
                payload["entries"][0]["image_files"][0] = str(invalid)
                with self.assertRaisesRegex(ValueError, "invalid image content"):
                    self.publish(payload)

    def test_rejects_jpeg_markers_without_decodable_scan_data(self):
        fake = self.approved / "fake.jpg"
        fake.write_bytes(
            b"\xff\xd8"
            b"\xff\xc0\x00\x11\x08\x00\x01\x00\x01\x03\x01\x11\x00\x02\x11\x00\x03\x11\x00"
            b"\xff\xda\x00\x0c\x03\x01\x00\x02\x11\x03\x11\x00\x3f\x00"
            b"\xff\xd9"
        )
        payload = self.package()
        payload["entries"][0]["image_files"][0] = str(fake)
        with self.assertRaisesRegex(ValueError, "invalid image content"):
            self.publish(payload)

    def test_rejects_image_digest_not_bound_to_immutable_package(self):
        payload = self.package()
        payload["entries"][0]["image_sha256"][0] = "0" * 64
        with self.assertRaisesRegex(ValueError, "image digest does not match immutable package"):
            self.publish(payload)

    def test_rejects_duplicate_image_path_or_content(self):
        payload = self.package()
        payload["entries"][0]["image_files"][1] = self.images[0]
        payload["entries"][0]["image_sha256"][1] = payload["entries"][0]["image_sha256"][0]
        with self.assertRaisesRegex(ValueError, "images must be distinct"):
            self.publish(payload)

        duplicate = self.approved / "same-content.png"
        duplicate.write_bytes(Path(self.images[0]).read_bytes())
        payload = self.package()
        payload["entries"][0]["image_files"][1] = str(duplicate)
        payload["entries"][0]["image_sha256"][1] = hashlib.sha256(duplicate.read_bytes()).hexdigest()
        with self.assertRaisesRegex(ValueError, "images must be distinct"):
            self.publish(payload)

    def test_copy_uses_validated_image_bytes_if_source_changes(self):
        import hashlib
        entries = publisher.validate_package(self.package(), self.approved)
        expected = entries[0]["_validated_images"][0]["sha256"]
        Path(self.images[0]).write_bytes(png_bytes(200, 201, 202))
        urls = publisher.copy_images(self.root, entries[0])
        target = self.root / urls[0].removeprefix("../")
        self.assertEqual(hashlib.sha256(target.read_bytes()).hexdigest(), expected)

    def test_publish_uses_one_immutable_package_byte_snapshot(self):
        package = self.write_package(self.package())
        original_bytes = package.read_bytes()
        original_validate = publisher.validate_package

        def validate_then_mutate(payload, approved_root, art_approved_root=None):
            entries = original_validate(payload, approved_root, art_approved_root)
            mutated = json.loads(original_bytes.decode("utf-8"))
            mutated["entries"][0]["title"] = "被竞态替换的标题"
            package.write_text(json.dumps(mutated, ensure_ascii=False), encoding="utf-8")
            return entries

        with mock.patch.object(publisher, "validate_package", side_effect=validate_then_mutate):
            state = publisher.publish(package, self.root, self.approved)
        self.assertEqual(state["package_sha256"], hashlib.sha256(original_bytes).hexdigest())
        article = (self.root / state["entries"][0]).read_text(encoding="utf-8")
        self.assertIn("测试标题", article)
        self.assertNotIn("被竞态替换的标题", article)

    def test_same_day_kinds_publish_separately_without_overwrite_or_duplicate(self):
        metrion = self.package("metrion", "delivered_verified")
        art = self.package("art-briefing", "formal_archived")
        art["entries"][0]["body_markdown"] = (
            "一、必看头条（1条）\n\n1. 新闻标题\n\n- 来源：机构\n\n"
            "五、今日组合观察\n\n1. 保持为列表"
        )
        first = self.publish(metrion)
        metrion_page = (self.root / first["entries"][0]).read_bytes()
        self.publish(art)
        index_path = self.root / "daily-updates" / "index.json"
        index = json.loads(index_path.read_text(encoding="utf-8"))
        keys = [(entry["date"], entry["kind"]) for entry in index["entries"]]
        self.assertEqual(keys.count(("2026-08-06", "metrion")), 1)
        self.assertEqual(keys.count(("2026-08-06", "art-briefing")), 1)
        self.assertEqual((self.root / first["entries"][0]).read_bytes(), metrion_page)
        frozen_index = index_path.read_bytes()
        self.publish(art)
        self.assertEqual(index_path.read_bytes(), frozen_index)

    def test_rejects_slug_collision_between_kinds(self):
        payload = self.package()
        art = self.package("art-briefing", "formal_archived")["entries"][0]
        art["slug"] = payload["entries"][0]["slug"]
        payload["entries"].append(art)
        with self.assertRaisesRegex(ValueError, "duplicate slug"):
            self.publish(payload)

    def test_rejects_slug_without_package_date_prefix(self):
        payload = self.package()
        payload["entries"][0]["slug"] = "2026-07-01-wrong-date"
        with self.assertRaisesRegex(ValueError, "begin with the package date"):
            self.publish(payload)

    def test_rejects_slug_collision_with_existing_other_kind(self):
        current = {
            "schema_version": 1,
            "entries": [{
                "date": "2026-08-06", "kind": "art-briefing", "title": "既有早报",
                "summary": "摘要", "url": "daily-updates/2026-08-06-metrion.html",
                "source_status": "formal_archived",
            }],
        }
        (self.root / "daily-updates" / "index.json").write_text(json.dumps(current), encoding="utf-8")
        payload = self.package()
        with self.assertRaisesRegex(ValueError, "collides with existing entry"):
            self.publish(payload)

    def test_rejects_preexisting_duplicate_index_url(self):
        current = {
            "schema_version": 1,
            "entries": [
                {"date": "2026-08-01", "kind": "metrion", "url": "daily-updates/shared.html"},
                {"date": "2026-08-02", "kind": "art-briefing", "url": "daily-updates/shared.html"},
            ],
        }
        (self.root / "daily-updates" / "index.json").write_text(json.dumps(current), encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "duplicate existing index URL"):
            self.publish(self.package())

    def test_rejects_slug_change_for_existing_index_key(self):
        current = {
            "schema_version": 1,
            "entries": [{
                "date": "2026-08-06", "kind": "metrion", "title": "既有日更",
                "summary": "摘要", "url": "daily-updates/2026-08-06-old.html",
                "source_status": "delivered_verified",
            }],
        }
        (self.root / "daily-updates" / "index.json").write_text(json.dumps(current), encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "cannot change slug"):
            self.publish(self.package())

    def test_removes_legacy_evening_entry_from_index(self):
        current = {
            "schema_version": 1,
            "entries": [{
                "date": "2026-08-01", "kind": "ai-evening", "title": "旧晚报",
                "summary": "不应保留", "url": "daily-updates/2026-08-01-evening.html",
                "source_status": "formal_archived",
            }],
        }
        (self.root / "daily-updates" / "index.json").write_text(json.dumps(current), encoding="utf-8")
        self.publish(self.package("art-briefing", "formal_archived"))
        index = json.loads((self.root / "daily-updates" / "index.json").read_text(encoding="utf-8"))
        self.assertNotIn("ai-evening", {item["kind"] for item in index["entries"]})

    def test_site_lock_rejects_concurrent_process_cleanly(self):
        code = (
            "import importlib.util,pathlib,time,sys;"
            f"p=pathlib.Path({str(MODULE_PATH)!r});"
            "s=importlib.util.spec_from_file_location('publisher_child',p);"
            "m=importlib.util.module_from_spec(s);s.loader.exec_module(m);"
            "root=pathlib.Path(sys.argv[1]);"
            "ctx=m.site_lock(root);ctx.__enter__();print('LOCKED',flush=True);"
            "time.sleep(5);ctx.__exit__(None,None,None)"
        )
        child = subprocess.Popen(
            [sys.executable, "-c", code, str(self.root)],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
        try:
            self.assertEqual(child.stdout.readline().strip(), "LOCKED")
            with self.assertRaisesRegex(RuntimeError, "already running"):
                with publisher.site_lock(self.root):
                    self.fail("second process unexpectedly acquired lock")
        finally:
            child.terminate()
            child.wait(timeout=5)
            child.stdout.close()
            child.stderr.close()


if __name__ == "__main__":
    unittest.main()
