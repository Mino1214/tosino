#!/usr/bin/env bash
# PM2 전용 정적 서빙 래퍼.
# 기존 scripts/serve-fixed-port.sh 와 다르게 "포트가 이미 잡혀 있으면 회수" 한 뒤 serve 를 띄운다.
# 이유: PM2 자체가 프로세스 단일성을 보장하므로, 같은 포트를 잡고 있는 외부 프로세스는
#   - 이전 PM2 lifecycle 의 좀비, 또는
#   - 수동으로 띄워둔 잔여 dev 서버
# 둘 중 하나로 봐도 안전. 이 좀비를 그냥 두면 PM2 가 새 child 를 아무리 재시작해도
# EADDRINUSE 로 바인드 실패하고, 결국 좀비가 옛 빌드를 계속 서빙하는 사고가 난다.
# (실제로 2026-04-19 solution-user 가 옛 chunk 를 며칠째 서빙하던 사고가 이걸로 발생.)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${1:?usage: pm2-serve-static.sh <port> <out-dir-relative-to-repo>}"
REL_DIR="${2:?usage: pm2-serve-static.sh <port> <out-dir-relative-to-repo>}"
DIR="$ROOT/$REL_DIR"

if [ ! -d "$DIR" ]; then
  echo "[pm2-serve-static] FATAL: out dir not found: $DIR" >&2
  exit 1
fi

reclaim_port() {
  local port="$1"
  if ! command -v lsof >/dev/null 2>&1; then
    return 0
  fi
  local pids
  pids="$(lsof -ti "tcp:$port" 2>/dev/null || true)"
  if [ -z "$pids" ]; then
    return 0
  fi
  echo "[pm2-serve-static] port $port already in use by pid(s): $pids — killing" >&2
  for pid in $pids; do
    kill -TERM "$pid" 2>/dev/null || true
  done
  for _ in 1 2 3 4 5; do
    sleep 0.2
    pids="$(lsof -ti "tcp:$port" 2>/dev/null || true)"
    [ -z "$pids" ] && return 0
  done
  for pid in $pids; do
    kill -KILL "$pid" 2>/dev/null || true
  done
  sleep 0.3
}

reclaim_port "$PORT"

SERVE_CLI="$ROOT/node_modules/serve/build/main.js"
if [ ! -f "$SERVE_CLI" ]; then
  echo "[pm2-serve-static] FATAL: serve cli not found at $SERVE_CLI (run pnpm install)" >&2
  exit 1
fi

cd "$ROOT"
# `-s`/`--single`(SPA) 금지: Next `output: export` 는 `route.html` / 중첩 경로를 쓰는데,
# not-found 를 전부 루트 index.html 로 보내면 `/console/...` 가 홈 리다이렉트·깨진 화면으로 보인다.
# serve-handler 기본 `cleanUrls` 로 `.../page.html` 은 확장자 없는 URL 과 매칭된다.
exec node "$SERVE_CLI" "$DIR" -l "tcp://127.0.0.1:$PORT" --no-clipboard
