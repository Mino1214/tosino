#!/usr/bin/env bash
# pnpm dev:all 실행 후 로컬 주소 안내
printf '%s\n' \
  "" \
  "  로컬 개발 주소 (dev:all 기준)" \
  "  ─────────────────────────────" \
  "  관리자(플랫폼)  http://localhost:3001" \
  "  솔루션(유저)    http://localhost:3002" \
  "  총판 관리       http://localhost:3003  ← 로그인: 총판(MASTER_AGENT)" \
  "  API             http://localhost:4001  (health: /health)" \
  "  sms-ingest      http://localhost:4050  (+ 터널은 터미널 로그 참고)" \
  ""
