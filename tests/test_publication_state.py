import hashlib
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

MODULE = Path(__file__).resolve().parents[1] / "tools" / "validate_daily_publication_state.py"
spec = importlib.util.spec_from_file_location("state_validator", MODULE)
validator = importlib.util.module_from_spec(spec)
spec.loader.exec_module(validator)


class PublicationStateValidatorTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.package_path = self.root / "package.json"
        self.state_path = self.root / "state.json"

    def tearDown(self):
        self.temp.cleanup()

    def write_case(self, kind="metrion", image_count=4):
        date = "2026-08-06"
        slug = f"{date}-{kind}"
        images = [f"/approved/source-{index}.png" for index in range(1, image_count + 1)]
        package = {"date": date, "entries": [{"kind": kind, "slug": slug, "image_files": images}]}
        package_bytes = (json.dumps(package, ensure_ascii=False) + "\n").encode()
        self.package_path.write_bytes(package_bytes)
        assets = [f"assets/daily-updates/{date}/{kind}-{index:02d}.png" for index in range(1, image_count + 1)]
        for asset in assets:
            target = self.root / asset
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(b"published-image")
        state = {
            "date": date,
            "entries": [f"daily-updates/{slug}.html"],
            "assets": assets,
            "package_sha256": hashlib.sha256(package_bytes).hexdigest(),
        }
        self.state_path.write_text(json.dumps(state), encoding="utf-8")
        return assets, state

    def test_accepts_exact_deterministic_manifest(self):
        assets, _ = self.write_case()
        self.assertEqual(validator.validate(self.root, self.package_path, self.state_path), assets)

    def test_rejects_traversal_duplicate_or_nonasset_substitution(self):
        _, state = self.write_case()
        for replacement in (
            ["../../private.txt"] * 4,
            ["daily-updates/index.json"] * 4,
            ["assets/daily-updates/2026-08-06/metrion-01.png"] * 4,
        ):
            tampered = dict(state)
            tampered["assets"] = replacement
            self.state_path.write_text(json.dumps(tampered), encoding="utf-8")
            with self.subTest(replacement=replacement[0]), self.assertRaisesRegex(ValueError, "asset manifest mismatch"):
                validator.validate(self.root, self.package_path, self.state_path)

    def test_rejects_package_hash_or_article_manifest_mismatch(self):
        _, state = self.write_case()
        state["package_sha256"] = "0" * 64
        self.state_path.write_text(json.dumps(state), encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "package hash mismatch"):
            validator.validate(self.root, self.package_path, self.state_path)

        _, state = self.write_case()
        state["entries"] = ["daily-updates/other.html"]
        self.state_path.write_text(json.dumps(state), encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "article manifest mismatch"):
            validator.validate(self.root, self.package_path, self.state_path)

    def test_art_brief_images_are_not_skipped(self):
        assets, _ = self.write_case("art-briefing", 1)
        self.assertEqual(validator.validate(self.root, self.package_path, self.state_path), assets)


if __name__ == "__main__":
    unittest.main()
