#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  printf 'usage: %s /absolute/path/to/daily-package.json\n' "$0" >&2
  exit 2
fi

PACKAGE=$1
if [[ "$PACKAGE" != /* ]]; then
  printf 'package path must be absolute: %s\n' "$PACKAGE" >&2
  exit 2
fi
if [[ ! -f "$PACKAGE" ]]; then
  printf 'package not found: %s\n' "$PACKAGE" >&2
  exit 2
fi
ROOT=$(cd "$(dirname "$0")/.." && pwd)
ALLOWED_IMAGE_ROOT=${DAILY_IMAGE_ROOT:-/root/.hermes/context-pack/metrion/outputs/final-accepted}
STATE="$ROOT/.daily-sync-state"
mkdir -p "$STATE"

if [[ ${DAILY_LOCK_ACTIVE:-0} != 1 ]]; then
  exec python "$ROOT/tools/run_daily_sync_locked.py" --site-root "$ROOT" -- bash "$0" "$PACKAGE"
fi
: "${DAILY_LOCK_FD:?missing inherited daily publish lock descriptor}"

cd "$ROOT"
BRANCH=$(git branch --show-current)
if [[ "$BRANCH" != main ]]; then
  printf 'refusing to publish from branch %s; expected main\n' "${BRANCH:-DETACHED}" >&2
  exit 3
fi

INPUT_PACKAGE="$STATE/input-package.json"
cp -- "$PACKAGE" "$STATE/.input-package.$$.tmp"
mv -- "$STATE/.input-package.$$.tmp" "$INPUT_PACKAGE"
PACKAGE="$INPUT_PACKAGE"
DATE=$(python -c 'import json,sys; value=json.load(open(sys.argv[1], encoding="utf-8"))["date"]; assert isinstance(value,str) and value; print(value)' "$PACKAGE")

controlled_dirty=0
unsafe_dirty=()
while IFS= read -r line; do
  [[ -z "$line" ]] && continue
  path=${line:3}
  case "$path" in
    daily-updates/*|assets/daily-updates/*) controlled_dirty=1 ;;
    *) unsafe_dirty+=("$path") ;;
  esac
done < <(git status --porcelain)

if (( ${#unsafe_dirty[@]} )); then
  printf 'refusing to publish with unrelated worktree changes:\n' >&2
  printf '  %s\n' "${unsafe_dirty[@]}" >&2
  exit 3
fi
if (( controlled_dirty )); then
  printf 'recovering interrupted daily website publish\n'
  git restore --source=HEAD --staged --worktree -- daily-updates assets/daily-updates
  git clean -fd -- daily-updates assets/daily-updates
fi

git pull --ff-only origin main
python tools/publish_daily_updates.py --package "$PACKAGE" --site-root "$ROOT" --allowed-image-root "$ALLOWED_IMAGE_ROOT" --lock-fd "$DAILY_LOCK_FD"
python -m unittest discover -s tests -p 'test_*.py'
python -m json.tool daily-updates/index.json >/dev/null

git add -- daily-updates assets/daily-updates
ACTION=no_op
if ! git diff --cached --quiet; then
  git commit -m "content(daily): publish ${DATE} daily updates"
  ACTION=published
fi

# Always push: this retries a commit that succeeded locally during a prior run
# whose network push failed.
git push origin main
COMMIT=$(git rev-parse HEAD)

BASE='https://chuyiouart.github.io/yuanweigou'
LOCAL_INDEX_SHA=$(sha256sum daily-updates/index.json | cut -d ' ' -f 1)
mapfile -t SLUGS < <(python -c 'import json,sys; payload=json.load(open(sys.argv[1], encoding="utf-8")); [print(item["slug"]) for item in payload["entries"]]' "$PACKAGE")
PUBLICATION_STATE="$STATE/${DATE}.json"
VERIFIED_ASSET_LIST="$STATE/verified-assets.txt"
python tools/validate_daily_publication_state.py \
  --site-root "$ROOT" --package "$PACKAGE" --state "$PUBLICATION_STATE" \
  > "$VERIFIED_ASSET_LIST"
mapfile -t ASSETS < "$VERIFIED_ASSET_LIST"
for attempt in $(seq 1 24); do
  if ! curl --fail --silent --show-error --location --max-time 30 \
    --output "$STATE/remote-index.json" "$BASE/daily-updates/index.json?commit=$COMMIT"; then
    sleep 10
    continue
  fi
  REMOTE_INDEX_SHA=$(sha256sum "$STATE/remote-index.json" | cut -d ' ' -f 1)
  [[ "$REMOTE_INDEX_SHA" == "$LOCAL_INDEX_SHA" ]] || { sleep 10; continue; }

  articles_match=1
  for slug in "${SLUGS[@]}"; do
    remote_article="$STATE/remote-${slug}.html"
    if ! curl --fail --silent --show-error --location --max-time 30 \
      --output "$remote_article" "$BASE/daily-updates/${slug}.html?commit=$COMMIT"; then
      articles_match=0
      break
    fi
    local_sha=$(sha256sum "daily-updates/${slug}.html" | cut -d ' ' -f 1)
    remote_sha=$(sha256sum "$remote_article" | cut -d ' ' -f 1)
    if [[ "$local_sha" != "$remote_sha" ]]; then
      articles_match=0
      break
    fi
  done
  if (( articles_match )); then
    assets_match=1
    for asset in "${ASSETS[@]}"; do
      remote_asset="$STATE/remote-$(basename "$asset")"
      if ! curl --fail --silent --show-error --location --max-time 30 \
        --output "$remote_asset" "$BASE/${asset}?commit=$COMMIT"; then
        assets_match=0
        break
      fi
      local_sha=$(sha256sum "$asset" | cut -d ' ' -f 1)
      remote_sha=$(sha256sum "$remote_asset" | cut -d ' ' -f 1)
      if [[ "$local_sha" != "$remote_sha" ]]; then
        assets_match=0
        break
      fi
    done
    if (( assets_match )); then
      printf '{"status":"%s_verified","date":"%s","commit":"%s"}\n' "$ACTION" "$DATE" "$COMMIT"
      exit 0
    fi
  fi
  sleep 10
done

printf 'Git push succeeded but exact Pages content verification timed out for %s at commit %s\n' "$DATE" "$COMMIT" >&2
exit 4
