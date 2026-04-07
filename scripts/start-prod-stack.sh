#!/usr/bin/env bash
# API(Nest) + 웹 3종: Next 정적 내보내기(out/) + serve 로 동시 기동 (nginx 는 지금과 같이 :3000 등으로 붙이면 됨).
# 먼저: pnpm build:apps
#
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

bash scripts/kill-dev-ports.sh || true
sleep 1
bash scripts/local-dev-urls.sh

exec concurrently -k \
  -c green,blue,yellow,magenta \
  -n api,admin,solution,agent \
  "pnpm --filter @tosino/api run start:prod" \
  "pnpm exec serve \"$ROOT/apps/admin-web/out\" -l 3000 --no-clipboard" \
  "pnpm exec serve \"$ROOT/apps/solution-web/out\" -l 3002 --no-clipboard" \
  "pnpm exec serve \"$ROOT/apps/agent-web/out\" -l 3003 --no-clipboard"
