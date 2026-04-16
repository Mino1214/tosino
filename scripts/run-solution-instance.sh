#!/usr/bin/env bash
# provision-solution-instance.sh 로 만든 복사본에서 Next dev 서버를 띄웁니다.
#
# 사용법:
#   bash scripts/run-solution-instance.sh <slug>
#   pnpm solution:instance -- <slug>

set -euo pipefail

while [ "${1:-}" = "--" ]; do shift; done

SLUG="${1:?인자: 인스턴스 슬러그(예: brand-b)}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT/deployments/solution-instances/$SLUG"
META="$DEST/instance.json"
APP="$DEST/solution-user"

if [ ! -f "$META" ] || [ ! -d "$APP" ]; then
  echo "인스턴스가 없습니다: $DEST" >&2
  echo "먼저: pnpm solution:provision -- $SLUG <포트>" >&2
  exit 1
fi

PORT="$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).previewPort)' "$META")"
export NEXT_PUBLIC_PREVIEW_PORT="$PORT"
if [ -f "$APP/.env.local" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$APP/.env.local"
  set +a
fi

cd "$APP"
exec pnpm exec next dev --turbopack -p "$PORT"
