#!/usr/bin/env bash
# sms-ingest(4050) 단일 포트 정리 — dev:sms-ingest:public 전에 실행
set -euo pipefail
P="${SMS_INGEST_PORT:-4050}"
if lsof -ti "tcp:$P" >/dev/null 2>&1; then
  echo "포트 $P 사용 중 프로세스 종료"
  lsof -ti "tcp:$P" | xargs kill -9 2>/dev/null || true
  sleep 0.3
fi
