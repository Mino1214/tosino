#!/usr/bin/env bash
# Tosino 프로덕션 배포 (단일 서버: PM2 + nginx + Postgres + Redis 가정)
# 사용: 저장소 루트에서  bash scripts/deploy-prod-nexus.sh
# 선택: RUN_DB_SEED=1  — 데모 스포츠 스냅샷 등 시드(기존 데이터 주의)
#       SKIP_INSTALL=1 — pnpm install 생략
#       SKIP_MIGRATE=1 — prisma migrate deploy 생략
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f "apps/api/.env" ]]; then
  echo "오류: apps/api/.env 가 없습니다. apps/api/.env.example 을 복사해 DATABASE_URL·JWT·PUBLIC_API_URL 등을 채우세요." >&2
  exit 1
fi

if [[ ! -f "apps/solution-web/.env.production" ]]; then
  echo "경고: apps/solution-web/.env.production 없음 — next build 시 기본값 사용. 운영이면 복사해 두세요." >&2
fi

echo "==> pnpm install"
if [[ "${SKIP_INSTALL:-0}" != "1" ]]; then
  pnpm install --frozen-lockfile 2>/dev/null || pnpm install
fi

echo "==> Prisma generate"
pnpm db:generate

if [[ "${SKIP_MIGRATE:-0}" != "1" ]]; then
  echo "==> Prisma migrate deploy"
  pnpm db:migrate:deploy
fi

if [[ "${RUN_DB_SEED:-0}" == "1" ]]; then
  echo "==> DB seed"
  pnpm db:seed
fi

echo "==> Build (api + admin + solution + agent)"
pnpm build:apps

for d in apps/admin-web/out apps/solution-web/out apps/agent-web/out; do
  if [[ ! -d "$ROOT/$d" ]]; then
    echo "오류: 빌드 산출물 없음: $d — 웹 빌드가 실패했는지 확인하세요." >&2
    exit 1
  fi
done

if ! command -v pm2 >/dev/null 2>&1; then
  echo "오류: pm2 가 PATH 에 없습니다. npm i -g pm2 후 다시 실행하세요." >&2
  exit 1
fi

echo "==> PM2 reload"
pm2 reload ecosystem.config.js --update-env || pm2 start ecosystem.config.js
pm2 save || true

echo ""
echo "배포 반영 완료."
echo "  - API:   127.0.0.1:4001 (cwd apps/api → .env 로드)"
echo "  - 정적: 3000 admin / 3002 solution / 3003 agent"
echo "  - nginx: sudo nginx -t && sudo systemctl reload nginx"
echo "  - 헬스: curl -sk --resolve nexus001.vip:443:127.0.0.1 https://nexus001.vip/health"
echo ""
