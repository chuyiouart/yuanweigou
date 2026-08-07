import json
import unittest
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]


class LinkCollector(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        for key in ("href", "src"):
            if values.get(key):
                self.links.append(values[key])


def local_target(page: Path, value: str):
    parsed = urlsplit(value)
    if parsed.scheme or parsed.netloc or value.startswith(("#", "mailto:", "tel:", "data:")):
        return None
    path = parsed.path
    if not path:
        return None
    target = (page.parent / path).resolve()
    if path.endswith("/"):
        target = target / "index.html"
    return target


class DailySiteIntegrationTests(unittest.TestCase):
    def test_homepages_expose_daily_section_and_scripts(self):
        desktop = (ROOT / "index.html").read_text(encoding="utf-8")
        mobile = (ROOT / "mobile-home.html").read_text(encoding="utf-8")
        for content in (desktop, mobile):
            self.assertIn('id="daily-updates"', content)
            self.assertIn("daily-updates.css", content)
            self.assertIn("daily-updates.js", content)
            self.assertIn("每日新构", content)
        self.assertIn('data-mobile-dock="daily-updates"', mobile)

    def test_service_worker_cache_version_covers_daily_release(self):
        service_worker = (ROOT / "sw.js").read_text(encoding="utf-8")
        self.assertIn('metrion-pwa-20260807-daily-v1', service_worker)

    def test_json_contract_has_latest_of_both_types_and_excludes_evening(self):
        payload = json.loads((ROOT / "daily-updates" / "index.json").read_text(encoding="utf-8"))
        kinds = {entry["kind"] for entry in payload["entries"]}
        self.assertIn("metrion", kinds)
        self.assertIn("art-briefing", kinds)
        self.assertNotIn("ai-evening", kinds)
        self.assertEqual(payload["scope"]["excluded"], ["ai-evening"])
        for entry in payload["entries"]:
            self.assertTrue((ROOT / entry["url"]).is_file(), entry["url"])

    def test_local_links_in_new_and_modified_pages_resolve(self):
        pages = [ROOT / "index.html", ROOT / "mobile-home.html", ROOT / "daily-updates" / "index.html"]
        pages.extend(sorted((ROOT / "daily-updates").glob("*.html")))
        missing = []
        for page in dict.fromkeys(pages):
            parser = LinkCollector()
            parser.feed(page.read_text(encoding="utf-8"))
            for link in parser.links:
                target = local_target(page, link)
                if target is not None and not target.exists():
                    missing.append(f"{page.relative_to(ROOT)} -> {link}")
        self.assertEqual(missing, [])

    def test_public_pages_do_not_leak_internal_markers(self):
        for page in (ROOT / "daily-updates").glob("*.html"):
            content = page.read_text(encoding="utf-8")
            self.assertNotIn("/root/.hermes", content)
            self.assertNotIn("FAIL_CLOSED", content)
            self.assertNotIn("BOT_TOKEN", content)

    def test_client_restricts_article_links_to_same_origin_archive(self):
        script = (ROOT / "daily-updates.js").read_text(encoding="utf-8")
        self.assertIn('resolved.origin === DAILY_ROOT_URL.origin', script)
        self.assertIn('resolved.pathname.startsWith(DAILY_ROOT_URL.pathname)', script)
        self.assertIn('resolved.protocol === "https:"', script)

    def test_sync_uses_shared_lock_and_exact_content_verification(self):
        script = (ROOT / "tools" / "sync_daily_updates.sh").read_text(encoding="utf-8")
        self.assertIn('run_daily_sync_locked.py', script)
        self.assertIn('--lock-fd "$DAILY_LOCK_FD"', script)
        self.assertNotIn('flock -n', script)
        self.assertNotIn('jq ', script)
        publisher = (ROOT / "tools" / "publish_daily_updates.py").read_text(encoding="utf-8")
        self.assertNotIn('bootstrap.write', publisher)
        self.assertIn('os.O_CREAT | os.O_RDWR', publisher)
        self.assertIn('package path must be absolute', script)
        self.assertIn('INPUT_PACKAGE="$STATE/input-package.json"', script)
        self.assertIn('FROZEN_PACKAGE_SHA=$(sha256sum "$PACKAGE"', script)
        self.assertIn('verify_frozen_package()', script)
        self.assertGreaterEqual(script.count("verify_frozen_package"), 5)
        self.assertLess(script.index("FROZEN_PACKAGE_SHA="), script.index("DATE=$(python"))
        self.assertLess(script.rindex("verify_frozen_package"), script.index("git push origin main"))
        self.assertIn('BRANCH=$(git branch --show-current)', script)
        self.assertIn('expected main', script)
        self.assertIn("validate_daily_publication_state.py", script)
        self.assertIn('--allowed-image-root "$ALLOWED_IMAGE_ROOT"', script)
        self.assertIn('mapfile -t VERIFIED_PUBLIC_FILES < <(', script)
        self.assertIn('for manifest_line in "${VERIFIED_PUBLIC_FILES[@]}"', script)
        self.assertNotIn('verified-public-files.tsv', script)
        self.assertIn('git show HEAD:daily-updates/index.json', script)
        self.assertIn('--previous-index "$PREVIOUS_INDEX"', script)
        self.assertIn('FROZEN_MANIFEST_COUNT=', script)
        self.assertIn('FROZEN_MANIFEST_SHA=', script)
        self.assertIn('^[0-9a-f]{64}$', script)
        self.assertIn('duplicate verified manifest path', script)
        self.assertIn('verify_frozen_manifest', script)
        self.assertIn('git show "$COMMIT:$public_path"', script)
        self.assertIn('git ls-remote --exit-code origin refs/heads/main', script)
        self.assertIn('"$REMOTE_COMMIT" == "$COMMIT"', script)
        self.assertIn('"$BASE/${public_path}?commit=$COMMIT"', script)
        self.assertIn('remote_sha" != "$expected_sha', script)
        self.assertLess(script.index("validate_daily_publication_state.py"), script.index("git add -- daily-updates"))
        self.assertLess(script.index('git show "$COMMIT:$public_path"'), script.index("git push origin main"))
        self.assertNotIn('LOCAL_INDEX_SHA=', script)
        self.assertNotIn('any(.entries[]; .date == $date)', script)


if __name__ == "__main__":
    unittest.main()
