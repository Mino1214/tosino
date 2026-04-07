#!/usr/bin/env bash
# concurrently에서 ingest 다음에 실행: 4050이 열릴 때까지 대기 후 cloudflared
set -euo pipefail
PORT="${SMS_INGEST_PORT:-4050}"
for _ in $(seq 1 60); do
  if curl -sf "http://127.0.0.1:${PORT}/health" >/dev/null 2>&1; then
    break
  fi
  sleep 0.5
done
exec bash "$(dirname "$0")/cloudflared-sms-ingest.sh"
