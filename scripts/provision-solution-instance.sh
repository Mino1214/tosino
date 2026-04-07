#!/usr/bin/env bash
# 플랫폼 미리보기용: apps/solution-web + packages/shared 를 별도 디렉터리에 복사하고
# 독립 pnpm 워크스페이스로 설치한 뒤, 해당 포트로 next dev 를 띄울 수 있게 준비합니다.
#
# 사용법:
#   bash scripts/provision-solution-instance.sh <slug> <previewPort> [API_BASE_URL]
#
# 예:
#   bash scripts/provision-solution-instance.sh brand-b 3201
#   bash scripts/provision-solution-instance.sh brand-b 3201 http://192.168.0.5:4001
#
# 기본 동작: 설치가 끝나면 곧바로 next dev 를 띄웁니다 (터미널이 붙잡힘).
# 설치만 하려면: SOLUTION_NO_START=1 bash scripts/provision-solution-instance.sh ...
#
# (이전처럼 솔루션만 따로: SOLUTION_NO_START=1 로 프로비저닝 후 pnpm solution:instance)

set -euo pipefail

while [ "${1:-}" = "--" ]; do shift; done

SLUG="${1:?첫 인자: 인스턴스 슬러그(폴더명, 예: brand-b)}"
PORT_RAW="${2:?두 번째 인자: 미리보기 포트(예: 3201)}"
API_URL="${3:-http://localhost:4001}"

PORT="$(printf '%s' "$PORT_RAW" | tr -cd '0-9')"
if [ -z "$PORT" ] || [ "$PORT" -lt 1024 ] || [ "$PORT" -gt 65535 ]; then
  echo "포트는 1024–65535 숫자여야 합니다: $PORT_RAW" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT/deployments/solution-instances/$SLUG"

if [ -e "$DEST" ]; then
  echo "이미 존재합니다: $DEST" >&2
  echo "덮어쓰려면 폴더를 지운 뒤 다시 실행하세요." >&2
  exit 1
fi

mkdir -p "$DEST/packages"

echo "→ 복사: apps/solution-web → $DEST/solution-web"
rsync -a \
  --exclude node_modules \
  --exclude .next \
  --exclude .turbo \
  "$ROOT/apps/solution-web/" "$DEST/solution-web/"

echo "→ 복사: packages/shared → $DEST/packages/shared"
rsync -a \
  --exclude node_modules \
  --exclude .turbo \
  "$ROOT/packages/shared/" "$DEST/packages/shared/"

cat > "$DEST/pnpm-workspace.yaml" << 'YAML'
packages:
  - "solution-web"
  - "packages/shared"
YAML

# 루트에 더미 package.json 이 있으면 pnpm이 워크스페이스 루트로 인식하기 쉬움
cat > "$DEST/package.json" << JSON
{
  "name": "tosino-solution-instance-$SLUG",
  "private": true
}
JSON

PREVIEW_SECRET_LINE=""
if [ -n "${PREVIEW_BOOTSTRAP_SECRET:-}" ]; then
  PREVIEW_SECRET_LINE="NEXT_PUBLIC_PREVIEW_BOOTSTRAP_SECRET=${PREVIEW_BOOTSTRAP_SECRET}"
fi

cat > "$DEST/solution-web/.env.local" << EOF
# 자동 생성 (${SLUG} / 포트 ${PORT}) — API·비밀값은 환경에 맞게 수정
NEXT_PUBLIC_API_URL=${API_URL}
NEXT_PUBLIC_PREVIEW_PORT=${PORT}
${PREVIEW_SECRET_LINE}
EOF

node - "$SLUG" "$PORT" "$API_URL" "$DEST/instance.json" <<'NODE'
const fs = require('fs');
const [, , slug, portStr, apiUrl, outPath] = process.argv;
const j = {
  slug,
  previewPort: Number(portStr),
  apiUrl,
  provisionedAt: new Date().toISOString(),
};
fs.writeFileSync(outPath, JSON.stringify(j, null, 2) + '\n');
NODE

echo "→ pnpm install (인스턴스 루트)"
(cd "$DEST" && pnpm install)

echo "→ @tosino/shared 빌드"
(cd "$DEST/packages/shared" && pnpm run build)

echo ""
echo "준비 완료: $DEST"

if [ "${SOLUTION_NO_START:-0}" = "1" ]; then
  echo "  (SOLUTION_NO_START=1) 서버는 자동 실행하지 않았습니다."
  echo "  솔루션만: pnpm solution:instance -- $SLUG"
  echo "  또는 한 번에(API 대기 포함): pnpm solution:dev -- $SLUG $PORT"
  echo "  API+솔루션 동시: pnpm solution:stack -- $SLUG $PORT"
  echo "  브라우저(서버 띄운 뒤): http://localhost:${PORT}"
  exit 0
fi

echo "→ 미리보기 Next 서버를 바로 띄웁니다 (중지: Ctrl+C)."
echo "  설치만 하려면 다음부터 SOLUTION_NO_START=1 을 앞에 붙이세요."
echo "  API까지 같이: pnpm solution:stack -- $SLUG $PORT"
echo "  브라우저: http://localhost:${PORT}"
exec bash "$ROOT/scripts/run-solution-instance.sh" "$SLUG"
