#!/usr/bin/env bash
# Postgres(5433)·Redis(6379) 준비 후 API를 잠깐 띄우고 웹훅·헬스를 확인합니다.
#
# 사용법 (프로젝트 루트):
#   pnpm db:up && pnpm smoke:webhooks   ← 권장 (Docker 데몬 켠 뒤)
#   pnpm smoke:webhooks                 (Docker 자동 기동 시도, 실패 시 포트만 대기)
#   WAIT_TCP_SECS=90 pnpm smoke:webhooks
#   SKIP_DOCKER=1 …  compose 호출 안 함
#   API_BASE=http://127.0.0.1:4001 …  API만 이미 떠 있을 때
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

API_BASE="${API_BASE:-}"
API_HOST="${API_HOST:-127.0.0.1}"
API_PORT="${API_PORT:-4001}"
BASE="${API_BASE:-http://${API_HOST}:${API_PORT}}"

wait_tcp() {
  local host=$1 port=$2 label=$3
  local max="${WAIT_TCP_SECS:-45}"
  local i=0
  while [ "$i" -lt "$max" ]; do
    if (echo >/dev/tcp/${host}/${port}) >/dev/null 2>&1; then
      echo "  OK ${label} (${host}:${port})"
      return 0
    fi
    i=$((i + 1))
    if [ "$i" -eq 1 ] || [ $((i % 15)) -eq 0 ]; then
      echo "  … ${label} 대기 중 ${i}/${max}s (안 열리면: sudo systemctl start docker && pnpm db:up)" >&2
    fi
    sleep 1
  done
  echo "  타임아웃: ${label} (${host}:${port}) — 로컬에서 먼저: sudo systemctl start docker && pnpm db:up" >&2
  return 1
}

if [ -z "$API_BASE" ]; then
  if [ "${SKIP_DOCKER:-}" != 1 ]; then
    if command -v docker >/dev/null 2>&1; then
      echo "→ DB/Redis 기동 (compose / sudo docker 폴백은 db-up.sh 가 처리)"
      bash "$ROOT/scripts/db-up.sh"
    else
      echo "→ docker 명령 없음 — 127.0.0.1:5433·6379 가 떠 있어야 합니다."
      echo "   설치·기동 예: sudo apt install docker.io && sudo systemctl start docker && pnpm db:up"
    fi
  fi

  echo "→ 포트 대기"
  wait_tcp 127.0.0.1 5433 "PostgreSQL" || exit 1
  wait_tcp 127.0.0.1 6379 "Redis" || exit 1

  echo "→ Prisma migrate + shared/API 빌드"
  command -v corepack >/dev/null 2>&1 && corepack prepare pnpm@9.15.0 --activate >/dev/null 2>&1 || true
  pnpm db:generate
  pnpm --filter @tosino/shared build
  pnpm db:migrate:deploy

  echo "→ API 백그라운드 기동 (start:prod)"
  pnpm --filter @tosino/api build
  pnpm --filter @tosino/api run start:prod &
  APIPID=$!

  cleanup() {
    if [ -n "${APIPID:-}" ]; then
      kill "$APIPID" 2>/dev/null || true
      wait "$APIPID" 2>/dev/null || true
    fi
  }
  trap cleanup EXIT

  echo "→ health 대기 (${BASE})"
  for i in $(seq 1 90); do
    if curl -sf "${BASE}/health" >/dev/null 2>&1; then
      break
    fi
    if [ "$i" -eq 90 ]; then
      echo "API health 타임아웃" >&2
      exit 1
    fi
    sleep 1
  done
fi

echo ""
echo "=== GET ${BASE}/health ==="
curl -sS "${BASE}/health"
echo ""
echo ""

echo "=== POST ${BASE}/webhooks/vinus (VINUS_AGENT_KEY 없으면 503) ==="
curl -sS -o /tmp/vinus-smoke.body -w "HTTP %{http_code}\n" \
  -X POST "${BASE}/webhooks/vinus" \
  -H 'Content-Type: application/json' \
  -d '{"command":"authenticate","data":{},"check":"1"}'
cat /tmp/vinus-smoke.body
echo ""
echo ""

echo "=== POST ${BASE}/webhooks/payment (서명 없음 → 401 또는 400) ==="
curl -sS -o /tmp/pay-smoke.body -w "HTTP %{http_code}\n" \
  -X POST "${BASE}/webhooks/payment" \
  -H 'Content-Type: application/json' \
  -d '{"eventId":"smoke-e1","userId":"x","platformId":"x","amount":"1","status":"completed","kind":"deposit"}'
cat /tmp/pay-smoke.body
echo ""

echo ""
echo "끝. Vinus 실콜백 검증은: cd apps/api && pnpm run vinus:callback-smoke"
