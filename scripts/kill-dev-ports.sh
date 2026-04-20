#!/usr/bin/env bash
# Tosino 로컬 개발 포트(3000 관리자, 3002 솔루션, 3003 총판, 4001 API, 4050 sms-ingest) — nginx deploy 와 동일
set -e
for p in 3000 3001 3002 3003 3010 4001 4050; do
  if lsof -ti "tcp:$p" >/dev/null 2>&1; then
    echo "Killing process on port $p"
    lsof -ti "tcp:$p" | xargs kill -9 2>/dev/null || true
  fi
done
