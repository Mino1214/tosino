#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

# .env 에서 API_PORT 읽기 (선택)
if [[ -f .env ]]; then
  set +u
  # shellcheck disable=SC1091
  set -a && source .env && set +a 2>/dev/null || true
  set -u
fi

PORT="${API_PORT:-${PORT:-4001}}"
TARGET="http://127.0.0.1:${PORT}"

echo "Vinus 콜백 예시: <터널에서 나온 https URL>/webhooks/vinus"
echo "(콜백은 authKey 검증 없음 — VINUS_AGENT_KEY 만 필요)"
echo "로컬 API: ${TARGET} (이 주소로 터널 연결)"
echo ""
echo "cloudflared 가 없으면: brew install cloudflared"
echo ""

exec cloudflared tunnel --url "${TARGET}"
