import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "tools" / "list_daily_expected_paths.py"


class ExpectedPathOrderTests(unittest.TestCase):
    def test_dual_source_manifest_lists_all_articles_before_assets(self):
        spec = importlib.util.spec_from_file_location("expected_paths", MODULE_PATH)
        if spec is None or spec.loader is None:
            self.fail("expected-path helper module cannot be loaded")
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        package = {
            "date": "2026-08-09",
            "entries": [
                {"kind": "metrion", "slug": "2026-08-09-metrion", "image_files": ["a.png", "b.png"]},
                {"kind": "art-briefing", "slug": "2026-08-09-art", "image_files": []},
            ],
        }
        self.assertEqual(
            module.expected_paths(package),
            [
                "daily-updates/index.json",
                "daily-updates/2026-08-09-metrion.html",
                "daily-updates/2026-08-09-art.html",
                "assets/daily-updates/2026-08-09/metrion-01.png",
                "assets/daily-updates/2026-08-09/metrion-02.png",
            ],
        )

    def test_modern_text_only_art_briefing_has_no_required_asset(self):
        spec = importlib.util.spec_from_file_location("expected_paths_text_only", MODULE_PATH)
        assert spec is not None and spec.loader is not None
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        package = {
            "date": "2026-08-28",
            "entries": [{
                "kind": "art-briefing",
                "slug": "2026-08-28-visual-art-morning-briefing",
                "image_files": [],
            }],
        }
        self.assertEqual(module.expected_paths(package), [
            "daily-updates/index.json",
            "daily-updates/2026-08-28-visual-art-morning-briefing.html",
        ])

    def test_2026_08_11_grid_path_uses_source_digest(self):
        digests = [f"{index:064x}" for index in range(1, 5)]
        package = {
            "date": "2026-08-11",
            "entries": [{
                "kind": "metrion", "slug": "2026-08-11-metrion",
                "image_files": ["a.png", "b.png", "c.png", "d.png"],
                "image_sha256": digests,
            }],
        }
        expected_stem = __import__("hashlib").sha256("".join(digests).encode()).hexdigest()[:12]
        spec = importlib.util.spec_from_file_location("expected_paths_0811", MODULE_PATH)
        assert spec is not None and spec.loader is not None
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        self.assertEqual(
            module.expected_paths(package)[-1],
            f"assets/daily-updates/2026-08-11/metrion-grid-{expected_stem}.webp",
        )


if __name__ == "__main__":
    unittest.main()
