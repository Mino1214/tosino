#!/usr/bin/env bash
# pnpm dev:all 실행 후 로컬 주소 안내
printf '%s\n' \
  "" \
  "  로컬 주소 (pnpm dev:* 또는 빌드 뒤 pnpm start:* / apps/*/out 정적 서빙, 동일 포트)" \
  "  ─────────────────────────────" \
  "  관리자(플랫폼)  http://localhost:3000  (nginx mod 호스트와 동일 포트)" \
  "  솔루션(유저)    http://localhost:3002" \
  "  총판 관리       http://localhost:3003  ← 로그인: 총판(MASTER_AGENT)" \
  "  API             http://localhost:4001  (health: /health, REST: /api/...)" \
  "  sms-ingest      http://localhost:4050  (+ 터널은 터미널 로그 참고)" \
  ""
