#!/usr/bin/env bash
# API(Nest) + 웹 4종: Next 정적 내보내기(out/) + serve 로 동시 기동.
# 먼저: pnpm build:apps
#
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

bash scripts/kill-dev-ports.sh || true
sleep 1
bash scripts/local-dev-urls.sh

exec concurrently -k \
  -c green,cyan,blue,yellow,magenta \
  -n api,super,admin,user,agent \
  "pnpm --filter @tosino/api run start:prod" \
  "pnpm exec serve \"$ROOT/apps/super-admin/out\" -l 3000 --no-clipboard" \
  "pnpm exec serve \"$ROOT/apps/solution-admin/out\" -l 3001 --no-clipboard" \
  "pnpm exec serve \"$ROOT/apps/solution-user/out\" -l 3002 --no-clipboard" \
  "pnpm exec serve \"$ROOT/apps/solution-agent/out\" -l 3003 --no-clipboard"
