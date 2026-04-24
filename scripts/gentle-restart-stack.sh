#!/usr/bin/env bash
# Docker(Redis/Postgres) + PM2 를 한꺼번에 재시작할 때, 부하·원격 끊김을 줄이기 위한 순서.
#  - 먼저 score-crawler(Playwright) 중지
#  - Redis → 잠시 대기 → Postgres
#  - PM2 는 api → crawler-matcher-worker → sync-worker → usdt-deposit-worker → comp-settlement-worker → sms-ingest → 정적앱 → cloudflared → score-crawler
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "[gentle-restart] score-crawler 잠시 중지…"
pm2 stop score-crawler 2>/dev/null || true
sleep 2

echo "[gentle-restart] Docker redis → postgres"
bash "$ROOT/scripts/compose.sh" -f "$ROOT/docker-compose.yml" restart redis
sleep 3
bash "$ROOT/scripts/compose.sh" -f "$ROOT/docker-compose.yml" restart postgres
sleep 4

echo "[gentle-restart] PM2 (순차)"
pm2 restart api
sleep 2
pm2 restart crawler-matcher-worker 2>/dev/null || env TOSINO_DEPLOY_PROFILE=server pm2 start ecosystem.config.js --only crawler-matcher-worker
sleep 2
pm2 restart sync-worker 2>/dev/null || env TOSINO_DEPLOY_PROFILE=server pm2 start ecosystem.config.js --only sync-worker
sleep 2
pm2 restart usdt-deposit-worker 2>/dev/null || env TOSINO_DEPLOY_PROFILE=server pm2 start ecosystem.config.js --only usdt-deposit-worker
sleep 2
pm2 restart comp-settlement-worker 2>/dev/null || env TOSINO_DEPLOY_PROFILE=server pm2 start ecosystem.config.js --only comp-settlement-worker
sleep 2
pm2 restart sms-ingest
sleep 2
for a in super-admin solution-admin solution-user solution-agent solution-main; do
  pm2 restart "$a" 2>/dev/null || true
  sleep 1
done
sleep 1
pm2 restart cloudflared
sleep 2
echo "[gentle-restart] score-crawler 다시 기동"
pm2 restart score-crawler 2>/dev/null || pm2 start score-crawler
pm2 save
echo "[gentle-restart] 끝. (curl) $(curl -sS -m 5 http://127.0.0.1:4001/health 2>/dev/null || echo 'api:fail')"
