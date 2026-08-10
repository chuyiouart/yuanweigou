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


if __name__ == "__main__":
    unittest.main()
