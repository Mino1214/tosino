#!/usr/bin/env bash
# sms-ingest(POST /webhook/sms) 빌드 후 PM2 반영. 최초에는 start, 이후에는 reload.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

pnpm install
pnpm db:generate
pnpm --filter @tosino/sms-ingest build

if pm2 describe sms-ingest >/dev/null 2>&1; then
  env TOSINO_DEPLOY_PROFILE=server pm2 reload ecosystem.config.js --only sms-ingest
else
  env TOSINO_DEPLOY_PROFILE=server pm2 start ecosystem.config.js --only sms-ingest
fi
