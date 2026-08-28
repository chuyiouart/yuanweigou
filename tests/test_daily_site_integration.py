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
    def test_daily_section_is_immediately_after_hero_and_first_in_unified_nav(self):
        desktop = (ROOT / "index.html").read_text(encoding="utf-8")
        hero_end = desktop.index("</section>", desktop.index('id="display"'))
        daily_start = desktop.index('<section id="daily-updates"')
        translation_start = desktop.index('<section id="translation"')
        self.assertLess(hero_end, daily_start)
        self.assertLess(daily_start, translation_start)

        unified_nav = (ROOT / "unified-nav.js").read_text(encoding="utf-8")
        daily_link = unified_nav.index('label: "每日新构"')
        experience_group = unified_nav.index('label: "体验"')
        self.assertLess(daily_link, experience_group)
        self.assertIn('href: "index.html#daily-updates"', unified_nav)

    def test_mobile_daily_section_follows_hero_and_uses_compact_hero_contract(self):
        mobile = (ROOT / "mobile-home.html").read_text(encoding="utf-8")
        hero_start = mobile.index('<section class="mobile-hero"')
        hero_end = mobile.index("</section>", hero_start)
        daily_start = mobile.index('<section id="daily-updates"')
        translation_start = mobile.index('<section id="translation"')
        self.assertLess(hero_end, daily_start)
        self.assertLess(daily_start, translation_start)

        mobile_css = (ROOT / "mobile-home.css").read_text(encoding="utf-8")
        hero_rule = mobile_css[mobile_css.index(".mobile-hero {"):mobile_css.index("}", mobile_css.index(".mobile-hero {"))]
        self.assertIn("min-height: min(68svh, 560px);", hero_rule)
        self.assertNotIn("88svh", hero_rule)

    def test_homepages_expose_daily_section_and_scripts(self):
        desktop = (ROOT / "index.html").read_text(encoding="utf-8")
        mobile = (ROOT / "mobile-home.html").read_text(encoding="utf-8")
        for content in (desktop, mobile):
            self.assertIn('id="daily-updates"', content)
            self.assertIn("daily-updates.css", content)
            self.assertIn("daily-updates.js", content)
            self.assertIn("每日新构", content)
        self.assertIn('data-mobile-dock="daily-updates"', mobile)

    def test_home_freshness_stamp_reports_each_lane_independently(self):
        script = (ROOT / "daily-updates.js").read_text(encoding="utf-8")
        self.assertIn("元维构更新至：", script)
        self.assertIn("视觉艺术早报更新至：", script)
        self.assertNotIn("`内容更新至：${dateLabel(payload.content_through)}`", script)
        self.assertIn('latestByKind.get("metrion")', script)
        self.assertIn('latestByKind.get("art-briefing")', script)

    def test_service_worker_cache_version_covers_daily_release(self):
        service_worker = (ROOT / "sw.js").read_text(encoding="utf-8")
        self.assertIn('metrion-pwa-', service_worker)
        self.assertIn('"./mobile-home.css?v=20260809-mobile-v1"', service_worker)
        self.assertIn('"./daily-updates.css?v=20260809-mobile-v1"', service_worker)

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

    def test_client_keeps_current_links_same_origin_and_maps_legacy_github_archive(self):
        script = (ROOT / "daily-updates.js").read_text(encoding="utf-8")
        self.assertIn('LEGACY_GITHUB_ORIGIN = "https://chuyiouart.github.io"', script)
        self.assertIn('resolved.origin === ROOT_URL.origin', script)
        self.assertIn('resolved.pathname.startsWith(DAILY_ROOT_URL.pathname)', script)
        self.assertIn('safeProtocol && sameOrigin && insideDailyArchive', script)
        self.assertIn('resolved.protocol === "https:"', script)
        self.assertIn('resolved.origin === LEGACY_GITHUB_ORIGIN', script)
        self.assertIn('return new URL(resolved.pathname + resolved.search + resolved.hash, ROOT_URL.origin).href', script)

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
        self.assertIn('^assets/daily-updates/${DATE}/art-briefing-story-[0-9]{2}-[0-9a-f]{12}\\.webp$', script)
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
