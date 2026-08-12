from __future__ import annotations

import hashlib
import importlib.util
import json
import os
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]


def load(name: str, relative: str):
    path = ROOT / relative
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot load {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


contract = load("encoder_contract_tests", "tools/webp_encoder_contract.py")
publisher = load("encoder_publisher_tests", "tools/publish_daily_updates.py")
validator = load("encoder_validator_tests", "tools/validate_daily_publication_state.py")


class WebpEncoderContractTests(unittest.TestCase):
    def test_declared_contract_and_installable_pillow_lock(self):
        self.assertEqual(contract.ENCODER, "pillow-webp")
        self.assertEqual(contract.PILLOW_VERSION, "10.2.0")
        self.assertEqual(contract.LIBWEBP_VERSION, "1.3.2")
        self.assertEqual(contract.ENCODING_PARAMETERS, {"method": 6, "exact": True})
        lock = (ROOT / "requirements-production.txt").read_text(encoding="utf-8").splitlines()
        self.assertIn("Pillow==10.2.0", lock)

    def test_version_drift_and_webp_unavailable_are_rejected(self):
        for pillow, available, libwebp, message in (
            ("12.2.0", True, "1.3.2", "Pillow"),
            ("10.2.0", True, "1.6.0", "libwebp"),
            ("10.2.0", False, None, "WebP"),
        ):
            with self.subTest(pillow=pillow, available=available, libwebp=libwebp):
                with self.assertRaisesRegex(RuntimeError, message):
                    contract.assert_encoder_contract(
                        pillow_version=pillow,
                        webp_available=available,
                        libwebp_version=libwebp,
                    )

    def test_production_sync_preflight_precedes_every_site_or_state_write(self):
        script = (ROOT / "tools" / "sync_daily_updates.sh").read_text(encoding="utf-8")
        preflight = script.index('python3 -B "$ROOT/tools/check_webp_encoder.py"')
        for marker in ('STATE="$ROOT/.daily-sync-state"', 'mkdir -p "$STATE"', "run_daily_sync_locked.py"):
            self.assertLess(preflight, script.index(marker), marker)

    def test_failed_preflight_writes_no_checkout_bytes(self):
        with tempfile.TemporaryDirectory() as temporary:
            checkout = Path(temporary) / "checkout"
            tools = checkout / "tools"
            tools.mkdir(parents=True)
            for name in ("check_webp_encoder.py", "webp_encoder_contract.py"):
                shutil.copy2(ROOT / "tools" / name, tools)
            before = {
                str(path.relative_to(checkout)): hashlib.sha256(path.read_bytes()).hexdigest()
                for path in checkout.rglob("*") if path.is_file()
            }
            env = os.environ.copy()
            env["PYTHONPATH"] = str(ROOT / "tests" / "fixtures" / "webp_encoder_drift")
            result = subprocess.run(
                ["python3", "-B", str(tools / "check_webp_encoder.py")],
                cwd=checkout,
                env=env,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                check=False,
            )
            self.assertNotEqual(result.returncode, 0)
            after = {
                str(path.relative_to(checkout)): hashlib.sha256(path.read_bytes()).hexdigest()
                for path in checkout.rglob("*") if path.is_file()
            }
            self.assertEqual(before, after)
            self.assertFalse(any(path.name == "__pycache__" for path in checkout.rglob("*")))

    def test_direct_publish_fails_before_site_write(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            package = root / "package.json"
            package.write_text('{"schema_version":2,"date":"2026-08-13","entries":[]}', encoding="utf-8")
            before = sorted(str(path.relative_to(root)) for path in root.rglob("*"))
            with mock.patch.object(publisher, "assert_encoder_contract", side_effect=RuntimeError("Pillow drift")):
                with self.assertRaisesRegex(RuntimeError, "Pillow drift"):
                    publisher.publish(package, root, root)
            after = sorted(str(path.relative_to(root)) for path in root.rglob("*"))
            self.assertEqual(before, after)

    def test_legacy_manifest_compatibility_and_future_manifest_strictness(self):
        for date in ("2026-08-11", "2026-08-12"):
            legacy = {"schema_version": 1, "layout": "grid-2x2-v1", "date": date}
            self.assertNotIn("encoder", legacy)
            validator.validate_grid_encoder_contract(legacy, date)
        legacy = {
            "schema_version": 1, "layout": "grid-2x2-v1", "date": "2026-08-12",
        }
        validator.validate_grid_encoder_contract(legacy, "2026-08-12")
        future = dict(legacy, date="2026-08-13")
        with self.assertRaisesRegex(ValueError, "encoder contract"):
            validator.validate_grid_encoder_contract(future, "2026-08-13")
        future.update(contract.manifest_fields())
        validator.validate_grid_encoder_contract(future, "2026-08-13")
        for key in ("encoder", "pillow_version", "libwebp_version", "encoding_parameters"):
            broken = dict(future)
            broken.pop(key)
            with self.subTest(key=key), self.assertRaisesRegex(ValueError, "encoder contract"):
                validator.validate_grid_encoder_contract(broken, "2026-08-13")
        for parameters in (
            {"method": 6, "exact": 1},
            {"method": 6.0, "exact": True},
            {"method": 6, "exact": True, "extra": False},
        ):
            broken = dict(future, encoding_parameters=parameters)
            with self.subTest(parameters=parameters), self.assertRaisesRegex(ValueError, "encoder contract"):
                validator.validate_grid_encoder_contract(broken, "2026-08-13")

    def test_fixed_fixture_golden_webp_sha(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            approved = root / "approved"
            approved.mkdir()
            sources = []
            for index, color in enumerate(((240, 220, 200), (220, 210, 210), (200, 200, 220), (180, 190, 230))):
                path = approved / f"source-{index}.png"
                Image.new("RGB", (1254, 1254), color).save(path, "PNG")
                sources.append(path)
            entry = {
                "date": "2026-08-13", "kind": "metrion", "title": "固定编码器夹具",
                "_validated_images": [
                    {"path": str(path), "bytes": path.read_bytes(), "sha256": hashlib.sha256(path.read_bytes()).hexdigest()}
                    for path in sources
                ],
            }
            _, manifest, _ = publisher.build_metrion_grid(root, entry)
            self.assertEqual(manifest["output_sha256"], "6bfbc134fbac3fdab9250c989f546b13da72e4e1a992a905b830b9e85e4d9b93")
            self.assertEqual(
                {key: manifest[key] for key in ("encoder", "pillow_version", "libwebp_version", "encoding_parameters")},
                contract.manifest_fields(),
            )


if __name__ == "__main__":
    unittest.main()
