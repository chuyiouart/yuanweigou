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
ART_ALLOWED_IMAGE_ROOT=${DAILY_ART_IMAGE_ROOT:-/root/.hermes/context-pack/visual-art-briefing/source-images}
STATE="$ROOT/.daily-sync-state"
mkdir -p "$STATE"

if [[ ${DAILY_LOCK_ACTIVE:-0} != 1 ]]; then
  exec python3 "$ROOT/tools/run_daily_sync_locked.py" --site-root "$ROOT" -- bash "$0" "$PACKAGE"
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
FROZEN_PACKAGE_SHA=$(sha256sum "$PACKAGE" | cut -d ' ' -f 1)
verify_frozen_package() {
  local current_sha
  current_sha=$(sha256sum "$PACKAGE" | cut -d ' ' -f 1)
  [[ "$current_sha" == "$FROZEN_PACKAGE_SHA" ]] || {
    printf 'frozen input package changed during synchronization\n' >&2
    exit 3
  }
}
verify_frozen_package
DATE=$(python3 -c 'import json,sys; value=json.load(open(sys.argv[1], encoding="utf-8"))["date"]; assert isinstance(value,str) and value; print(value)' "$PACKAGE")

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
PREVIOUS_INDEX="$STATE/pre-publication-index.json"
git show HEAD:daily-updates/index.json > "$STATE/.pre-publication-index.$$.tmp"
mv -- "$STATE/.pre-publication-index.$$.tmp" "$PREVIOUS_INDEX"
FROZEN_PREVIOUS_INDEX_SHA=$(sha256sum "$PREVIOUS_INDEX" | cut -d ' ' -f 1)
[[ "$(sha256sum daily-updates/index.json | cut -d ' ' -f 1)" == "$FROZEN_PREVIOUS_INDEX_SHA" ]] || {
  printf 'working index does not match trusted HEAD before publication\n' >&2
  exit 3
}
python3 tools/publish_daily_updates.py --package "$PACKAGE" --site-root "$ROOT" --allowed-image-root "$ALLOWED_IMAGE_ROOT" --art-allowed-image-root "$ART_ALLOWED_IMAGE_ROOT" --lock-fd "$DAILY_LOCK_FD"
verify_frozen_package
python3 -m unittest discover -s tests -p 'test_*.py'
python3 -m json.tool daily-updates/index.json >/dev/null

PUBLICATION_STATE="$STATE/${DATE}.json"
mapfile -t VERIFIED_PUBLIC_FILES < <(
  python3 tools/validate_daily_publication_state.py \
    --site-root "$ROOT" --package "$PACKAGE" --state "$PUBLICATION_STATE" \
    --allowed-image-root "$ALLOWED_IMAGE_ROOT" --art-allowed-image-root "$ART_ALLOWED_IMAGE_ROOT" --previous-index "$PREVIOUS_INDEX" \
    --previous-index-sha256 "$FROZEN_PREVIOUS_INDEX_SHA"
)
(( ${#VERIFIED_PUBLIC_FILES[@]} > 0 )) || { printf 'verified public manifest is empty\n' >&2; exit 3; }
verify_frozen_package
mapfile -t EXPECTED_PUBLIC_PATHS < <(
  python3 tools/list_daily_expected_paths.py "$PACKAGE"
)

validate_manifest_structure() {
  local line digest public_path tabless tab_count index=0
  local -A seen_paths=()
  (( ${#VERIFIED_PUBLIC_FILES[@]} == ${#EXPECTED_PUBLIC_PATHS[@]} )) || {
    printf 'verified manifest does not contain the complete expected path set\n' >&2
    return 1
  }
  for line in "${VERIFIED_PUBLIC_FILES[@]}"; do
    tabless=${line//$'\t'/}
    tab_count=$(( ${#line} - ${#tabless} ))
    (( tab_count == 1 )) || { printf 'invalid verified manifest delimiter count\n' >&2; return 1; }
    digest=${line%%$'\t'*}
    public_path=${line#*$'\t'}
    [[ "$digest" =~ ^[0-9a-f]{64}$ ]] || { printf 'invalid verified manifest digest\n' >&2; return 1; }
    if [[ "$public_path" == daily-updates/index.json ]]; then
      :
    elif [[ "$public_path" =~ ^daily-updates/${DATE}-[a-z0-9]+(-[a-z0-9]+)*\.html$ ]]; then
      :
    elif [[ "$public_path" =~ ^assets/daily-updates/${DATE}/metrion-grid-[0-9a-f]{12}\.webp$ ]]; then
      :
    elif [[ "$public_path" =~ ^assets/daily-updates/${DATE}/(metrion|art-briefing)-[0-9]{2}\.(jpg|jpeg|png)$ ]]; then
      :
    else
      printf 'invalid verified manifest path: %s\n' "$public_path" >&2
      return 1
    fi
    [[ "$public_path" == "${EXPECTED_PUBLIC_PATHS[$index]}" ]] || {
      printf 'verified manifest path set or ordering mismatch\n' >&2
      return 1
    }
    [[ -z ${seen_paths[$public_path]+x} ]] || { printf 'duplicate verified manifest path\n' >&2; return 1; }
    seen_paths[$public_path]=1
    index=$((index + 1))
  done
}
validate_manifest_structure
FROZEN_MANIFEST_COUNT=${#VERIFIED_PUBLIC_FILES[@]}
FROZEN_MANIFEST_SHA=$(printf '%s\0' "${VERIFIED_PUBLIC_FILES[@]}" | sha256sum | cut -d ' ' -f 1)
verify_frozen_manifest() {
  (( ${#VERIFIED_PUBLIC_FILES[@]} == FROZEN_MANIFEST_COUNT )) || { printf 'verified manifest count changed\n' >&2; exit 3; }
  [[ "$(printf '%s\0' "${VERIFIED_PUBLIC_FILES[@]}" | sha256sum | cut -d ' ' -f 1)" == "$FROZEN_MANIFEST_SHA" ]] || {
    printf 'verified manifest changed after validation\n' >&2
    exit 3
  }
  validate_manifest_structure || exit 3
}
verify_frozen_manifest

git add -- daily-updates assets/daily-updates
ACTION=no_op
if ! git diff --cached --quiet; then
  git commit -m "content(daily): publish ${DATE} daily updates"
  ACTION=published
fi
COMMIT=$(git rev-parse HEAD)

# Verify committed Git objects against the pre-commit immutable manifest.
verify_frozen_manifest
for manifest_line in "${VERIFIED_PUBLIC_FILES[@]}"; do
  IFS=$'\t' read -r expected_sha public_path extra_field <<< "$manifest_line"
  [[ -n "$expected_sha" && -n "$public_path" && -z "$extra_field" ]] || {
    printf 'invalid verified manifest line\n' >&2
    exit 3
  }
  committed_sha=$(git show "$COMMIT:$public_path" | sha256sum | cut -d ' ' -f 1)
  [[ "$committed_sha" == "$expected_sha" ]] || {
    printf 'committed public file differs from verified bytes: %s\n' "$public_path" >&2
    exit 3
  }
done

# Always push: this retries a commit that succeeded locally during a prior run
# whose network push failed.
verify_frozen_package
git push origin main
REMOTE_COMMIT=$(git ls-remote --exit-code origin refs/heads/main | cut -f 1)
[[ "$REMOTE_COMMIT" == "$COMMIT" ]] || {
  printf 'remote main does not equal pushed commit\n' >&2
  exit 4
}

BASE='https://chuyiouart.github.io/yuanweigou'
for attempt in $(seq 1 24); do
  verify_frozen_manifest
  all_match=1
  file_number=0
  for manifest_line in "${VERIFIED_PUBLIC_FILES[@]}"; do
    IFS=$'\t' read -r expected_sha public_path extra_field <<< "$manifest_line"
    if [[ -z "$expected_sha" || -z "$public_path" || -n "$extra_field" ]]; then
      all_match=0
      break
    fi
    file_number=$((file_number + 1))
    remote_file="$STATE/remote-public-${file_number}.bin"
    if ! curl --fail --silent --show-error --location --max-time 30 \
      --output "$remote_file" "$BASE/${public_path}?commit=$COMMIT"; then
      all_match=0
      break
    fi
    remote_sha=$(sha256sum "$remote_file" | cut -d ' ' -f 1)
    if [[ "$remote_sha" != "$expected_sha" ]]; then
      all_match=0
      break
    fi
  done
  if (( all_match )); then
    printf '{"status":"%s_verified","date":"%s","commit":"%s"}\n' "$ACTION" "$DATE" "$COMMIT"
    exit 0
  fi
  sleep 10
done

printf 'Git push succeeded but exact Pages content verification timed out for %s at commit %s\n' "$DATE" "$COMMIT" >&2
exit 4
