#!/usr/bin/env bash
# pnpm dev — 한 터미널에 서버를 몰아 넣지 않고, 탭/창을 나눠 쓰도록 안내
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

printf '%s\n' \
  "" \
  "  ※ SSG/정적 프리렌더: 빌드 때 HTML을 만들어 두는 것이지, '서버 없이 파일만으로 열리는 것'이 아닙니다." \
  "     next dev / next start / nginx 중 하나로 HTTP 서빙이 있어야 브라우저에서 페이지가 뜹니다." \
  "" \
  "  Tosino — 개발(핫리로드): 터미널마다 하나씩만 실행하면 로그가 섞이지 않습니다." \
  "  ─────────────────────────────────────────────────────────────" \
  "  터미널 1   API (Nest)      pnpm dev:api         → http://localhost:4001" \
  "  터미널 2   슈퍼어드민      pnpm dev:super-admin → http://localhost:3000" \
  "  터미널 3   솔루션어드민    pnpm dev:admin       → http://localhost:3001" \
  "  터미널 4   솔루션유저      pnpm dev:solution    → http://localhost:3002" \
  "  터미널 5   솔루션에이전트  pnpm dev:agent       → http://localhost:3003  (필요 시)" \
  "  (선택)     솔루션 메인랜딩 pnpm dev:solution-main → http://localhost:3010  (tozinosolution.com)" \
  "  (선택)     shared 타입     pnpm dev:shared      → packages/shared 수정 시" \
  "  (선택)     SMS 수집       pnpm dev:sms-ingest" \
  "" \
  "  한 창에 전부(개발·로그 섞임):    pnpm dev:parallel" \
  "  API+터널·sms 올인원:            pnpm dev:all" \
  "" \
  "  빌드 후 정적 서빙(out/ + serve): 먼저  pnpm build:apps" \
  "  ─────────────────────────────────────────────────────────────" \
  "  터미널 1   API               pnpm start:api" \
  "  터미널 2   슈퍼어드민        pnpm start:super-admin   (apps/super-admin/out)" \
  "  터미널 3   솔루션어드민      pnpm start:admin         (apps/solution-admin/out)" \
  "  터미널 4   솔루션유저        pnpm start:solution" \
  "  터미널 5   솔루션에이전트    pnpm start:agent" \
  "  (선택)     솔루션 메인랜딩    pnpm start:solution-main  (apps/solution-main/out)" \
  "" \
  "  위 네 개를 한 번에:            pnpm start:apps   (또는 pnpm apps:prod = 빌드+기동)" \
  ""

bash "$ROOT/scripts/local-dev-urls.sh"

printf '%s\n' \
  "  → 개발이면 dev:* / 빌드 후 보려면 build:apps 뒤 start:* 를 새 터미널에서 실행하세요." \
  ""
