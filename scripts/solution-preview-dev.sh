#!/usr/bin/env bash
# 미리보기용 솔루션: (없으면) 복사·설치 후 곧바로 next dev 까지 한 터미널에서 실행합니다.
#
# 사용법:
#   pnpm solution:dev -- <슬러그> <미리보기포트> [API_URL] [--wait-api]
#
# 예:
#   pnpm solution:dev -- brand-b 3201
#   pnpm solution:dev -- brand-b 3201 http://127.0.0.1:4001 --wait-api
#
# --wait-api : API /health 가 뜰 때까지 최대 ~40초 대기 (API를 다른 터미널에서 띄운 뒤 쓰기 좋음)
#
set -euo pipefail

while [ "${1:-}" = "--" ]; do shift; done

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SLUG="${1:?인자: 슬러그(예: brand-b)}"
PORT_RAW="${2:?인자: 미리보기 포트(예: 3201, DB의 previewPort 와 동일하게)}"
shift 2

API_URL="http://localhost:4001"
WAIT_API=0
while [ $# -gt 0 ]; do
  case "$1" in
  --wait-api)
    WAIT_API=1
    shift
    ;;
  http://* | https://*)
    API_URL="$1"
    shift
    ;;
  *)
    echo "알 수 없는 인자: $1" >&2
    exit 1
    ;;
  esac
done

API_PUBLIC_FOR_ENV="${API_URL%/}"
case "$API_PUBLIC_FOR_ENV" in
  */api) ;;
  *) API_PUBLIC_FOR_ENV="${API_PUBLIC_FOR_ENV}/api" ;;
esac

PORT="$(printf '%s' "$PORT_RAW" | tr -cd '0-9')"
if [ -z "$PORT" ] || [ "$PORT" -lt 1024 ] || [ "$PORT" -gt 65535 ]; then
  echo "포트는 1024–65535 숫자여야 합니다: $PORT_RAW" >&2
  exit 1
fi

DEST="$ROOT/deployments/solution-instances/$SLUG"

wait_for_api() {
  local base="${API_URL%/}"
  case "$base" in
    */api) base="${base%/api}" ;;
  esac
  local url="${base}/health"
  echo "→ API 응답 대기: $url"
  local i=0
  while [ "$i" -lt 40 ]; do
    if curl -sfS "$url" >/dev/null 2>&1; then
      echo "  API 준비됨"
      return 0
    fi
    i=$((i + 1))
    sleep 1
  done
  echo "  경고: 40초 내에 health 를 받지 못했습니다. API 주소·기동 여부를 확인하세요." >&2
  return 1
}

if [ "$WAIT_API" = 1 ]; then
  wait_for_api || true
fi

if [ ! -f "$DEST/instance.json" ] || [ ! -d "$DEST/solution-user" ]; then
  echo "→ 인스턴스 없음 — 프로비저닝 후 바로 서버를 띄웁니다."
  bash "$ROOT/scripts/provision-solution-instance.sh" "$SLUG" "$PORT" "$API_URL"
else
  CUR="$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).previewPort)' "$DEST/instance.json" 2>/dev/null || echo "")"
  if [ -n "$CUR" ] && [ "$CUR" != "$PORT" ]; then
    echo "→ 미리보기 포트를 인스턴스 설정에 맞춥니다: $CUR → $PORT"
    node - "$DEST/instance.json" "$PORT" "$API_URL" <<'NODE'
const fs = require('fs');
const path = process.argv[1];
const port = Number(process.argv[2]);
let apiUrl = process.argv[3];
if (apiUrl.endsWith('/api')) apiUrl = apiUrl.slice(0, -4);
const j = JSON.parse(fs.readFileSync(path, 'utf8'));
j.previewPort = port;
j.apiUrl = apiUrl;
j.updatedAt = new Date().toISOString();
fs.writeFileSync(path, JSON.stringify(j, null, 2) + '\n');
NODE
    ENV_FILE="$DEST/solution-user/.env.local"
    if [ -f "$ENV_FILE" ]; then
      if grep -q '^NEXT_PUBLIC_PREVIEW_PORT=' "$ENV_FILE"; then
        sed -i.bak "s/^NEXT_PUBLIC_PREVIEW_PORT=.*/NEXT_PUBLIC_PREVIEW_PORT=${PORT}/" "$ENV_FILE" && rm -f "${ENV_FILE}.bak"
      else
        echo "NEXT_PUBLIC_PREVIEW_PORT=${PORT}" >>"$ENV_FILE"
      fi
      if grep -q '^NEXT_PUBLIC_API_URL=' "$ENV_FILE"; then
        sed -i.bak "s|^NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=${API_PUBLIC_FOR_ENV}|" "$ENV_FILE" && rm -f "${ENV_FILE}.bak"
      else
        echo "NEXT_PUBLIC_API_URL=${API_PUBLIC_FOR_ENV}" >>"$ENV_FILE"
      fi
    fi
    echo "  (DB Platform.previewPort 도 콘솔에서 $PORT 로 맞췄는지 확인하세요.)"
  fi
fi

echo "→ Next 미리보기 서버 시작 (종료: Ctrl+C)"
exec bash "$ROOT/scripts/run-solution-instance.sh" "$SLUG"
