#!/usr/bin/env bash
# 로컬에서 Docker(Postgres+Redis) 기동 후 prod 빌드 + PM2 로 앱 스택만 띄울 때 사용.
#   pnpm deploy:apps           — db-up(Docker) + install + build + db seed + PM2 (프로필 local)
#   pnpm deploy:apps -- --dev  — db-up + build + PM2 만 (install·seed 생략, 프로필 local-dev)
#   (pnpm 이 인자를 넘기려면 `--` 가 필요할 수 있음 → 동일 동작: pnpm deploy:apps:dev)
#
# Docker 생략: SKIP_DOCKER=1 pnpm deploy:apps
# 서버 배포는 기존 pnpm deploy:all / deploy:web … (TOSINO_DEPLOY_PROFILE=server) 를 쓴다.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# pnpm 이 비로그인 셸로 실행할 때 전역 pm2 가 PATH 에 없는 경우가 많음 (macOS Homebrew 등)
export PATH="${PATH}:/opt/homebrew/bin:/usr/local/bin"
if command -v npm >/dev/null 2>&1; then
  _npm_prefix="$(npm config get prefix 2>/dev/null || true)"
  if [[ -n "${_npm_prefix:-}" && "${_npm_prefix}" != "undefined" ]]; then
    export PATH="${PATH}:${_npm_prefix}/bin"
  fi
fi
if ! command -v pm2 >/dev/null 2>&1; then
  echo "pm2 를 찾을 수 없습니다. npm i -g pm2 (또는 brew install pm2) 후 다시 실행하세요." >&2
  exit 1
fi

DEV=0
for arg in "$@"; do
  case "$arg" in
    --dev) DEV=1 ;;
    -*)
      echo "알 수 없는 옵션: $arg (지원: --dev)" >&2
      exit 1
      ;;
  esac
done

if [[ "$DEV" == "1" ]]; then
  export TOSINO_DEPLOY_PROFILE=local-dev
  echo "[deploy:apps --dev] 프로필=local-dev (install·seed 생략)"
else
  export TOSINO_DEPLOY_PROFILE=local
  echo "[deploy:apps] 프로필=local (API·매처워커·정적 5종만, sms/cloudflared/크롤러 제외)"
fi

if [[ "${SKIP_DOCKER:-0}" != "1" ]]; then
  echo "[deploy:apps] Docker Compose — postgres:5433, redis:6379 (scripts/db-up.sh)"
  bash "$ROOT/scripts/db-up.sh"
  echo "[deploy:apps] 컨테이너 준비 대기 2s…"
  sleep 2
else
  echo "[deploy:apps] SKIP_DOCKER=1 — db-up 생략 (이미 Redis/Postgres 가 있다고 가정)"
fi

# 로컬 스택에 없는 PM2 앱은 제거해 이름·포트 충돌 방지
for n in sms-ingest score-crawler cloudflared; do
  if pm2 describe "$n" >/dev/null 2>&1; then
    echo "[deploy:apps] PM2 에서 제거: $n (로컬 스택에 포함되지 않음)"
    pm2 delete "$n" || true
  fi
done

if [[ "$DEV" != "1" ]]; then
  pnpm install
fi

pnpm build:apps

if [[ "$DEV" != "1" ]]; then
  pnpm db:seed
else
  echo "[deploy:apps --dev] pnpm db:seed 생략"
fi

ECO="$ROOT/ecosystem.config.js"
# TOSINO_DEPLOY_PROFILE 은 위에서 이미 export 됨 — macOS env(1)+pm2 조합 이슈 회피
# local 프로필에서 api 만 있고 crawler-matcher-worker 가 없으면 reload 만 하면 워커가 안 뜸 → 둘 다 있을 때만 reload
NEED_PM2_START=0
for n in api crawler-matcher-worker; do
  if ! pm2 describe "$n" >/dev/null 2>&1; then
    NEED_PM2_START=1
    break
  fi
done
if [[ "$NEED_PM2_START" == "1" ]]; then
  echo "[deploy:apps] PM2 전체 기동 (api 또는 crawler-matcher-worker 없음 → ecosystem 반영)"
  pm2 start "$ECO" --update-env
else
  pm2 reload "$ECO" --update-env
fi

echo "[deploy:apps] 완료. pm2 status 로 확인하세요."
echo ""
echo "API/프론트가 엉뚱한 곳을 보면:"
echo "  • Nest: apps/api/.env — DATABASE_URL·REDIS_URL·PUBLIC_API_URL (로컬 Docker면 :5433 / :6379 / http://127.0.0.1:4001)"
echo "  • 정적 빌드(out): next build 시 NEXT_PUBLIC_* 가 박힘. 각 앱에 .env.production.local(gitignore 됨) 로"
echo "      NEXT_PUBLIC_API_URL=http://127.0.0.1:4001/api 등을 넣고 pnpm build:apps 다시 실행하세요."
