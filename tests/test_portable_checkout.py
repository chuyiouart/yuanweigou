from __future__ import annotations

import importlib.util
import shutil
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class PortableCheckoutTests(unittest.TestCase):
    def test_publisher_imports_from_repository_tools_without_private_hermes_lib(self):
        with tempfile.TemporaryDirectory() as temporary:
            checkout = Path(temporary) / "checkout"
            tools = checkout / "tools"
            tools.mkdir(parents=True)
            shutil.copy2(ROOT / "tools" / "publish_daily_updates.py", tools)
            vendored = ROOT / "tools" / "web_image_delivery.py"
            if vendored.exists():
                shutil.copy2(vendored, tools)
            spec = importlib.util.spec_from_file_location(
                "portable_daily_publisher", tools / "publish_daily_updates.py"
            )
            if spec is None or spec.loader is None:
                self.fail("portable publisher spec unavailable")
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            imported = Path(module.derive_responsive_assets.__code__.co_filename).resolve()
            self.assertEqual(imported, (tools / "web_image_delivery.py").resolve())

    def test_publisher_source_has_no_private_hermes_library_dependency(self):
        source = (ROOT / "tools" / "publish_daily_updates.py").read_text(encoding="utf-8")
        self.assertNotIn('HERMES_ROOT / "lib"', source)
        self.assertNotIn("parents[3]", source)


if __name__ == "__main__":
    unittest.main()
