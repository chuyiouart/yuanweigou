import hashlib
import importlib.util
import json
import shutil
import struct
import tempfile
import unittest
import zlib
from pathlib import Path

MODULE = Path(__file__).resolve().parents[1] / "tools" / "validate_daily_publication_state.py"
spec = importlib.util.spec_from_file_location("state_validator", MODULE)
validator = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(validator)
publisher = validator.publisher


def png_bytes(red: int, green: int, blue: int) -> bytes:
    def chunk(kind: bytes, payload: bytes) -> bytes:
        body = kind + payload
        return struct.pack(">I", len(payload)) + body + struct.pack(">I", zlib.crc32(body) & 0xFFFFFFFF)

    ihdr = struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0)
    scanline = bytes((0, red, green, blue))
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(scanline)) + chunk(b"IEND", b"")


class PublicationStateValidatorTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.approved = self.root / "approved"
        self.approved.mkdir()
        self.package_path = self.root / "package.json"
        self.state_path = self.root / "state.json"
        self.previous_index_path = self.root / "previous-index.json"
        self.previous_index_sha256 = ""

    def tearDown(self):
        self.temp.cleanup()

    def write_case(self, kind="metrion", image_count=4):
        for generated in (
            self.root / "daily-updates",
            self.root / "assets" / "daily-updates",
            self.root / ".daily-sync-state",
        ):
            if generated.exists():
                shutil.rmtree(generated)
        date = "2026-08-06"
        slug = f"{date}-{kind}"
        images = []
        for index in range(1, image_count + 1):
            image = self.approved / f"source-{kind}-{index}.png"
            image.write_bytes(png_bytes(index, index + 10, index + 20))
            images.append(str(image))
        entry = {
            "date": date,
            "kind": kind,
            "slug": slug,
            "website_eligible": True,
            "source_status": "delivered_verified" if kind == "metrion" else "formal_archived",
            "briefing_period": "morning" if kind == "art-briefing" else None,
            "images_approved": True,
            "title": "测试标题",
            "summary": "测试摘要",
            "deck": "测试导语",
            "body_markdown": "## 正文\n完整内容。",
            "image_files": images,
            "image_sha256": [hashlib.sha256(Path(image).read_bytes()).hexdigest() for image in images],
        }
        package = {"schema_version": 2, "date": date, "entries": [entry]}
        package_bytes = (json.dumps(package, ensure_ascii=False) + "\n").encode()
        self.package_path.write_bytes(package_bytes)
        previous_index_bytes = b'{"schema_version":1,"entries":[]}\n'
        self.previous_index_path.write_bytes(previous_index_bytes)
        self.previous_index_sha256 = hashlib.sha256(previous_index_bytes).hexdigest()
        state = publisher.publish(self.package_path, self.root, self.approved)
        generated_state = self.root / ".daily-sync-state" / f"{date}.json"
        self.state_path.write_bytes(generated_state.read_bytes())
        return state

    def validate(self):
        return validator.validate(
            self.root,
            self.package_path,
            self.state_path,
            self.approved,
            self.previous_index_path,
            self.previous_index_sha256,
        )

    def write_state(self, state):
        self.state_path.write_text(json.dumps(state), encoding="utf-8")

    def update_file_digest(self, state, path):
        for record in state["files"]:
            if record["path"] == path:
                record["sha256"] = hashlib.sha256((self.root / path).read_bytes()).hexdigest()
                return
        self.fail(f"missing state record for {path}")

    def test_accepts_exact_package_bound_manifest(self):
        state = self.write_case()
        manifest = self.validate()
        self.assertEqual([item["path"] for item in manifest], [item["path"] for item in state["files"]])
        self.assertTrue(all(len(item["sha256"]) == 64 for item in manifest))

    def test_rejects_traversal_duplicate_or_nonasset_substitution(self):
        state = self.write_case()
        for replacement in (
            ["../../private.txt"] * 4,
            ["daily-updates/index.json"] * 4,
            ["assets/daily-updates/2026-08-06/metrion-01.png"] * 4,
        ):
            tampered = json.loads(json.dumps(state))
            tampered["assets"] = replacement
            self.write_state(tampered)
            with self.subTest(replacement=replacement[0]), self.assertRaisesRegex(ValueError, "asset manifest mismatch"):
                self.validate()

    def test_rejects_package_hash_or_article_manifest_mismatch(self):
        state = self.write_case()
        state["package_sha256"] = "0" * 64
        self.write_state(state)
        with self.assertRaisesRegex(ValueError, "package hash mismatch"):
            self.validate()

        state = self.write_case()
        state["entries"] = ["daily-updates/other.html"]
        self.write_state(state)
        with self.assertRaisesRegex(ValueError, "article manifest mismatch"):
            self.validate()

    def test_art_brief_images_are_in_bound_manifest(self):
        state = self.write_case("art-briefing", 1)
        manifest = self.validate()
        asset = "assets/daily-updates/2026-08-06/art-briefing-01.png"
        self.assertIn(asset, [item["path"] for item in manifest])
        self.assertIn(asset, state["assets"])

    def test_rejects_missing_or_tampered_article_even_if_state_digest_changes(self):
        state = self.write_case()
        article = state["entries"][0]
        (self.root / article).unlink()
        with self.assertRaises(FileNotFoundError):
            self.validate()

        state = self.write_case()
        article = state["entries"][0]
        (self.root / article).write_text("<html>tampered</html>", encoding="utf-8")
        self.update_file_digest(state, article)
        self.write_state(state)
        with self.assertRaisesRegex(ValueError, "article does not match immutable package"):
            self.validate()

    def test_rejects_nonimage_or_different_image_even_if_state_digest_changes(self):
        state = self.write_case()
        asset = state["assets"][0]
        (self.root / asset).write_bytes(b"published-image-but-not-an-image")
        self.update_file_digest(state, asset)
        self.write_state(state)
        with self.assertRaisesRegex(ValueError, "asset does not match immutable package"):
            self.validate()

        state = self.write_case()
        asset = state["assets"][0]
        (self.root / asset).write_bytes(png_bytes(200, 201, 202))
        self.update_file_digest(state, asset)
        self.write_state(state)
        with self.assertRaisesRegex(ValueError, "asset does not match immutable package"):
            self.validate()

        state = self.write_case()
        asset = state["assets"][0]
        package = json.loads(self.package_path.read_text(encoding="utf-8"))
        source = Path(package["entries"][0]["image_files"][0])
        replacement = png_bytes(210, 211, 212)
        source.write_bytes(replacement)
        (self.root / asset).write_bytes(replacement)
        self.update_file_digest(state, asset)
        self.write_state(state)
        with self.assertRaisesRegex(ValueError, "image digest does not match immutable package"):
            self.validate()

    def test_rejects_state_and_full_index_contract_tampering(self):
        state = self.write_case()
        state["status"] = "published_verified"
        self.write_state(state)
        with self.assertRaisesRegex(ValueError, "state status mismatch"):
            self.validate()

        state = self.write_case()
        state["unexpected"] = True
        self.write_state(state)
        with self.assertRaisesRegex(ValueError, "state structure mismatch"):
            self.validate()

        for mutation, message in (
            ("schema", "index schema mismatch"),
            ("unknown", "index structure mismatch"),
            ("duplicate", "duplicate key or URL"),
            ("evening", "excluded kind"),
        ):
            state = self.write_case()
            index_path = self.root / "daily-updates" / "index.json"
            index = json.loads(index_path.read_text(encoding="utf-8"))
            if mutation == "schema":
                index["schema_version"] = 999
            elif mutation == "unknown":
                index["unexpected"] = True
            elif mutation == "duplicate":
                index["entries"].append(dict(index["entries"][0]))
            else:
                index["entries"].append({
                    "date": "2026-08-05", "kind": "ai-evening", "title": "晚报",
                    "summary": "不允许", "url": "https://evil.example/evening.html",
                    "source_status": "formal_archived",
                })
            index_path.write_text(json.dumps(index), encoding="utf-8")
            self.update_file_digest(state, "daily-updates/index.json")
            self.write_state(state)
            with self.subTest(mutation=mutation), self.assertRaisesRegex(ValueError, message):
                self.validate()

    def test_rejects_tampered_index_even_if_state_digest_changes(self):
        state = self.write_case()
        index_path = self.root / "daily-updates" / "index.json"
        index = json.loads(index_path.read_text(encoding="utf-8"))
        index["entries"][0]["url"] = "daily-updates/other.html"
        index_path.write_text(json.dumps(index), encoding="utf-8")
        self.update_file_digest(state, "daily-updates/index.json")
        self.write_state(state)
        with self.assertRaisesRegex(ValueError, "public index"):
            self.validate()

    def test_rejects_historical_injection_and_previous_index_tampering(self):
        state = self.write_case()
        index_path = self.root / "daily-updates" / "index.json"
        index = json.loads(index_path.read_text(encoding="utf-8"))
        index["entries"].append({
            "date": "2026-08-05",
            "kind": "art-briefing",
            "title": "伪造历史早报",
            "summary": "结构合法但不在受信任旧索引中",
            "url": "daily-updates/2026-08-05-forged-morning.html",
            "source_status": "formal_archived",
        })
        index_path.write_text(json.dumps(index), encoding="utf-8")
        self.update_file_digest(state, "daily-updates/index.json")
        self.write_state(state)
        with self.assertRaisesRegex(ValueError, "trusted previous index and immutable package"):
            self.validate()

        self.write_case()
        self.previous_index_path.write_text('{"schema_version":1,"entries":[{}]}', encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "trusted previous index hash mismatch"):
            self.validate()


if __name__ == "__main__":
    unittest.main()
