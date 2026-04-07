#!/usr/bin/env bash
# 정적 out/ 서빙: 포트가 이미 쓰이면 임의 포트로 바꾸지 않고 종료 (nginx·문서와 포트 맞추기 위해)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${1:?port}"
REL_DIR="${2:?path under repo}"
DIR="$ROOT/$REL_DIR"

if command -v lsof >/dev/null 2>&1; then
  if lsof -ti "tcp:$PORT" >/dev/null 2>&1; then
    echo "포트 $PORT 사용 중입니다. 예: bash $ROOT/scripts/kill-dev-ports.sh" >&2
    exit 1
  fi
fi

cd "$ROOT"
exec pnpm exec serve "$DIR" -l "$PORT" --no-clipboard
