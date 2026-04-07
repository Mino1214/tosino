#!/usr/bin/env bash
# API(Nest) + 플랫폼 미리보기(복사본 솔루션)를 한 번에 띄웁니다.
#
# 사용법:
#   pnpm solution:stack -- <슬러그> <미리보기포트> [API_URL]
#
# 예:
#   pnpm solution:stack -- brand-b 3201
#
set -euo pipefail

while [ "${1:-}" = "--" ]; do shift; done

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SLUG="${1:?슬러그}"
PORT="${2:?미리보기 포트}"
API_URL="${3:-http://localhost:4001}"

cd "$ROOT"
export FORCE_COLOR=1
exec concurrently -k -c blue,green -n api,sol \
  "pnpm --filter @tosino/api dev" \
  "bash scripts/solution-preview-dev.sh $(printf '%q' "$SLUG") $(printf '%q' "$PORT") $(printf '%q' "$API_URL") --wait-api"
