import importlib.util
import json
import struct
import subprocess
import sys
import tempfile
import unittest
import zlib
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
        self.images = []
        for index in range(4):
            path = self.approved / f"source-{index}.png"
            path.write_bytes(png_bytes(index + 1, index + 2, index + 3))
            self.images.append(str(path))

    def tearDown(self):
        self.temp.cleanup()

    def package(self, kind="metrion", status="delivered_verified"):
        images = self.images if kind == "metrion" else []
        entry = {
            "date": "2026-08-06",
            "kind": kind,
            "title": "测试标题",
            "summary": "公开摘要",
            "deck": "公开导语",
            "body_markdown": "## 第一节\n\n正文。\n\n- 要点一",
            "slug": f"2026-08-06-{kind}",
            "website_eligible": True,
            "source_status": status,
            "image_files": images,
        }
        if kind == "metrion":
            entry["images_approved"] = True
        if kind == "art-briefing":
            entry["briefing_period"] = "morning"
        return {"schema_version": 1, "date": "2026-08-06", "entries": [entry]}

    def write_package(self, payload):
        path = self.root / "package.json"
        path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
        return path

    def publish(self, payload):
        return publisher.publish(self.write_package(payload), self.root, self.approved)

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

    def test_accepts_formal_art_brief_without_images(self):
        payload = self.package("art-briefing", "formal_archived")
        payload["entries"][0]["body_markdown"] = "一、必看头条（1条）\n\n1. 新闻标题\n\n- 来源：机构\n\n五、今日组合观察\n\n1. 保持为列表"
        state = self.publish(payload)
        page = (self.root / state["entries"][0]).read_text(encoding="utf-8")
        self.assertIn("视觉艺术早报", page)
        self.assertIn("<h3>新闻标题</h3>", page)
        self.assertIn("<li>保持为列表</li>", page)

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

    def test_rejects_windows_internal_filesystem_path(self):
        for internal_path in (r"C:\private\secret.txt", "/root/private/secret.txt", "/home/user/private.txt"):
            payload = self.package()
            payload["entries"][0]["body_markdown"] = f"内部文件 {internal_path}"
            with self.subTest(path=internal_path), self.assertRaisesRegex(ValueError, "non-public filesystem path"):
                self.publish(payload)

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

    def test_rejects_duplicate_image_path_or_content(self):
        payload = self.package()
        payload["entries"][0]["image_files"][1] = self.images[0]
        with self.assertRaisesRegex(ValueError, "images must be distinct"):
            self.publish(payload)

        duplicate = self.approved / "same-content.png"
        duplicate.write_bytes(Path(self.images[0]).read_bytes())
        payload = self.package()
        payload["entries"][0]["image_files"][1] = str(duplicate)
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
