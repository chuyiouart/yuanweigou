from __future__ import annotations

import hashlib
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "tools" / "publish_daily_updates.py"
spec = importlib.util.spec_from_file_location("grid_publisher", MODULE_PATH)
publisher = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(publisher)


class MetrionGridPublisherTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        (self.root / "daily-updates").mkdir()
        (self.root / "daily-updates/index.json").write_text(json.dumps({"schema_version": 1, "entries": []}), encoding="utf-8")
        self.approved = self.root / "approved"
        self.approved.mkdir()
        self.sources = []
        for index in range(4):
            path = self.approved / f"source-{index}.png"
            image = Image.new("RGB", (1254, 1254), (240 - index * 20, 220 - index * 10, 200 + index * 10))
            image.save(path, "PNG")
            self.sources.append(path)

    def tearDown(self):
        self.temp.cleanup()

    def package(self, date="2026-08-12"):
        entry = {
            "date": date, "kind": "metrion", "title": "测试标题",
            "summary": "正式摘要。", "deck": "正式导语", "body_markdown": "## 正文\n\n正式正文。",
            "slug": f"{date}-metrion-daily-construction", "website_eligible": True,
            "source_status": "delivered_verified", "images_approved": True,
            "image_files": [str(path) for path in self.sources],
            "image_sha256": [hashlib.sha256(path.read_bytes()).hexdigest() for path in self.sources],
        }
        return {"schema_version": 2, "date": date, "entries": [entry]}

    def test_four_sources_become_one_deterministic_budgeted_grid_without_source_mutation(self):
        before = [path.read_bytes() for path in self.sources]
        package = self.root / "package.json"
        package.write_text(json.dumps(self.package(), ensure_ascii=False), encoding="utf-8")
        first = publisher.publish(package, self.root, self.approved)
        page = (self.root / first["entries"][0]).read_text(encoding="utf-8")
        manifest = first["web_image_delivery"][0]
        self.assertEqual(manifest["layout"], "grid-2x2-v1")
        self.assertEqual(manifest["source_sha256"], self.package()["entries"][0]["image_sha256"])
        self.assertEqual((manifest["width"], manifest["height"]), (1200, 1200))
        self.assertLessEqual(manifest["bytes"], 450 * 1024)
        self.assertIn(manifest["quality"], (82, 78, 72))
        self.assertEqual(page.count("<img "), 1)
        self.assertEqual(page.count("<picture>"), 0)
        self.assertIn('loading="eager"', page)
        self.assertIn('fetchpriority="high"', page)
        self.assertIn('decoding="async"', page)
        self.assertIn('width="1200"', page)
        self.assertIn('height="1200"', page)
        self.assertNotIn("metrion-01.png", page)
        output = self.root / manifest["path"]
        output_bytes = output.read_bytes()
        second = publisher.publish(package, self.root, self.approved)
        self.assertEqual(output_bytes, output.read_bytes())
        self.assertEqual(manifest["output_sha256"], second["web_image_delivery"][0]["output_sha256"])
        self.assertEqual(before, [path.read_bytes() for path in self.sources])

    def test_2026_08_11_migration_uses_one_full_width_grid(self):
        before = [path.read_bytes() for path in self.sources]
        package = self.root / "package-0811.json"
        package.write_text(json.dumps(self.package("2026-08-11"), ensure_ascii=False), encoding="utf-8")
        state = publisher.publish(package, self.root, self.approved)
        page = (self.root / state["entries"][0]).read_text(encoding="utf-8")
        self.assertEqual(page.count("<img "), 1)
        self.assertEqual(page.count(".png"), 0)
        self.assertIn('class="daily-article-gallery daily-article-gallery--single"', page)
        manifest = state["web_image_delivery"][0]
        self.assertEqual(manifest["date"], "2026-08-11")
        self.assertEqual(manifest["layout"], "grid-2x2-v1")
        self.assertLessEqual(manifest["bytes"], 450 * 1024)
        self.assertEqual(before, [path.read_bytes() for path in self.sources])

    def test_single_gallery_css_contract_is_one_column(self):
        css = (ROOT / "daily-updates.css").read_text(encoding="utf-8")
        self.assertRegex(
            css,
            r"\.daily-article-gallery--single\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)",
        )

    def test_source_sha_mismatch_fails_before_grid_publish(self):
        payload = self.package()
        payload["entries"][0]["image_sha256"][2] = "0" * 64
        package = self.root / "bad.json"
        package.write_text(json.dumps(payload), encoding="utf-8")
        with self.assertRaises(ValueError):
            publisher.publish(package, self.root, self.approved)
        self.assertFalse(any((self.root / "assets").rglob("*.webp")) if (self.root / "assets").exists() else False)


if __name__ == "__main__":
    unittest.main()
