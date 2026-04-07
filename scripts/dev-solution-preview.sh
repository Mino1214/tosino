#!/usr/bin/env bash
set -euo pipefail
# pnpm run … -- 3200 일 때 첫 인자로 '--' 가 들어오는 경우
while [ "${1:-}" = "--" ]; do shift; done
PORT="${1:-3200}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export NEXT_PUBLIC_PREVIEW_PORT="$PORT"
cd "$ROOT/apps/solution-web"
exec pnpm exec next dev --turbopack -p "$PORT"
