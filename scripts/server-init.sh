#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# Tosino — 신규 서버 최초 1회 초기화 스크립트
#
# 사용법:  bash scripts/server-init.sh
#
# 수행 작업:
#   1. nvm / Node.js 20 설치 확인
#   2. pnpm 설치 확인
#   3. pm2 전역 설치 확인
#   4. cloudflared 설치 확인
#   5. pm2 systemd startup 등록 (sudo 필요)
#   6. pnpm install (의존성)
#   7. cloudflared 터널 설정 (setup-cloudflared.sh 호출)
# ─────────────────────────────────────────────────────────────
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# PATH 보정
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"
export PATH="$HOME/.local/bin:$PATH"

ok()   { echo "  ✔  $*"; }
warn() { echo "  ⚠  $*"; }
info() { echo "  →  $*"; }

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Tosino 서버 초기화"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── 1. Node.js ──────────────────────────────────────
echo "[1/7] Node.js 확인"
if command -v node &>/dev/null; then
  ok "node $(node --version)"
else
  warn "Node.js 없음 → nvm 으로 설치 중..."
  if [[ ! -s "$NVM_DIR/nvm.sh" ]]; then
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
    source "$NVM_DIR/nvm.sh"
  fi
  nvm install 20 && nvm use 20 && nvm alias default 20
  ok "node $(node --version) 설치 완료"
fi

# ── 2. pnpm ─────────────────────────────────────────
echo "[2/7] pnpm 확인"
if command -v pnpm &>/dev/null; then
  ok "pnpm $(pnpm --version)"
else
  warn "pnpm 없음 → 설치 중..."
  npm install -g pnpm@9.15.0
  ok "pnpm $(pnpm --version) 설치 완료"
fi

# ── 3. pm2 ──────────────────────────────────────────
echo "[3/7] pm2 확인"
if command -v pm2 &>/dev/null; then
  ok "pm2 $(pm2 --version 2>/dev/null | head -1)"
else
  warn "pm2 없음 → 설치 중..."
  npm install -g pm2
  ok "pm2 설치 완료"
fi

# ── 4. cloudflared ──────────────────────────────────
echo "[4/7] cloudflared 확인"
if command -v cloudflared &>/dev/null; then
  ok "cloudflared $(cloudflared --version 2>&1 | head -1)"
else
  warn "cloudflared 없음 → ~/.local/bin 에 설치 중..."
  mkdir -p "$HOME/.local/bin"
  curl -L -o "$HOME/.local/bin/cloudflared" \
    https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
  chmod +x "$HOME/.local/bin/cloudflared"
  ok "cloudflared $(cloudflared --version 2>&1 | head -1) 설치 완료"
fi

# ── 5. pm2 startup ──────────────────────────────────
echo "[5/7] pm2 systemd startup"
PM2_PATH=$(which pm2)
NODE_BIN=$(dirname "$(which node)")
echo ""
warn "다음 명령을 터미널에서 직접 실행하세요 (sudo 필요):"
echo ""
echo "    sudo env PATH=\$PATH:$NODE_BIN $PM2_PATH startup systemd -u $USER --hp $HOME"
echo ""
read -r -p "  지금 실행할까요? (sudo 암호 입력 필요) [y/N] " RUN_STARTUP
if [[ "$RUN_STARTUP" =~ ^[Yy]$ ]]; then
  sudo env PATH="$PATH:$NODE_BIN" "$PM2_PATH" startup systemd -u "$USER" --hp "$HOME"
  ok "pm2 startup 완료"
else
  warn "pm2 startup 은 나중에 수동으로 실행하세요."
fi

# ── 6. pnpm install ─────────────────────────────────
echo "[6/7] pnpm install (의존성 설치)"
cd "$REPO_ROOT"
pnpm install
ok "의존성 설치 완료"

# ── 7. cloudflared 터널 설정 ────────────────────────
echo "[7/7] Cloudflare Tunnel 설정"
echo ""
read -r -p "  cloudflared 터널을 지금 설정할까요? (브라우저 인증 필요) [y/N] " RUN_CF
if [[ "$RUN_CF" =~ ^[Yy]$ ]]; then
  bash "$REPO_ROOT/scripts/setup-cloudflared.sh"
else
  info "나중에 실행: pnpm tunnel:setup"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  초기화 완료!"
echo ""
echo "  다음 단계:"
echo "  1. .env 파일 설정 (apps/api/.env, apps/*/production.env 등)"
echo "  2. DB 마이그레이션:  pnpm db:migrate:deploy"
echo "  3. 빌드:             pnpm build:apps"
echo "  4. 서비스 시작:      pnpm pm2:start"
echo "  5. pm2 프로세스 저장: pm2 save"
echo ""
echo "  터널 로그:  pnpm tunnel:logs"
echo "  전체 상태:  pnpm pm2:status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
