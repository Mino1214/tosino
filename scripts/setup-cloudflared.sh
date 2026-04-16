#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# Tosino — Cloudflare Tunnel 초기 설정 스크립트
#
# 사용법:  bash scripts/setup-cloudflared.sh
#
# 수행 작업:
#   1. cloudflared tunnel login  (브라우저 인증)
#   2. cloudflared tunnel create tosino
#   3. ~/.cloudflared/config.yml 심볼릭 링크 생성
#   4. 각 서브도메인 CNAME DNS 등록
#   5. (선택) cloudflared service install
# ─────────────────────────────────────────────────────────────
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CF_CONFIG_SRC="$REPO_ROOT/deploy/cloudflared/config.yml"
CF_CONFIG_DEST="$HOME/.cloudflared/config.yml"
TUNNEL_NAME="tosino"

# PATH 보정 (nvm / .local/bin)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"
export PATH="$HOME/.local/bin:$PATH"

CLOUDFLARED=$(command -v cloudflared || true)
if [[ -z "$CLOUDFLARED" ]]; then
  echo "[ERROR] cloudflared 를 찾을 수 없습니다. 먼저 설치하세요."
  echo "  curl -L -o ~/.local/bin/cloudflared https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64"
  echo "  chmod +x ~/.local/bin/cloudflared"
  exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Tosino  Cloudflare Tunnel 설정"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── STEP 1: 로그인 ──────────────────────────────────
echo "[1/4] Cloudflare 인증 (브라우저가 열립니다)"
cloudflared tunnel login

# ── STEP 2: 터널 생성 ────────────────────────────────
echo ""
echo "[2/4] 터널 생성: $TUNNEL_NAME"

# 이미 존재하면 재사용
if cloudflared tunnel list 2>/dev/null | grep -q "$TUNNEL_NAME"; then
  echo "  → 이미 존재하는 터널 '$TUNNEL_NAME' 을 사용합니다."
  TUNNEL_ID=$(cloudflared tunnel list 2>/dev/null | grep "$TUNNEL_NAME" | awk '{print $1}')
else
  cloudflared tunnel create "$TUNNEL_NAME"
  TUNNEL_ID=$(cloudflared tunnel list 2>/dev/null | grep "$TUNNEL_NAME" | awk '{print $1}')
fi

echo "  → Tunnel ID: $TUNNEL_ID"

# ── STEP 3: config.yml 에 ID 반영 ────────────────────
echo ""
echo "[3/4] config.yml Tunnel ID 반영"

sed -i "s/REPLACE_WITH_TUNNEL_ID/$TUNNEL_ID/g" "$CF_CONFIG_SRC"
echo "  → $CF_CONFIG_SRC 업데이트 완료"

# ~/.cloudflared/config.yml 심볼릭 링크
mkdir -p "$HOME/.cloudflared"
if [[ -L "$CF_CONFIG_DEST" ]]; then
  echo "  → 기존 심볼릭 링크 유지: $CF_CONFIG_DEST"
elif [[ -f "$CF_CONFIG_DEST" ]]; then
  cp "$CF_CONFIG_DEST" "${CF_CONFIG_DEST}.bak.$(date +%Y%m%d%H%M%S)"
  ln -sf "$CF_CONFIG_SRC" "$CF_CONFIG_DEST"
  echo "  → 기존 파일 백업 후 심볼릭 링크 생성"
else
  ln -sf "$CF_CONFIG_SRC" "$CF_CONFIG_DEST"
  echo "  → 심볼릭 링크 생성: $CF_CONFIG_DEST → $CF_CONFIG_SRC"
fi

# ── STEP 4: DNS CNAME 등록 ───────────────────────────
echo ""
echo "[4/4] DNS CNAME 등록"

DOMAINS=(
  "apisgate.org"
  "mod.tozinosolution.com"
  "mod.tozinosoltion.com"
  "tozinosolution.com"
  "user.i-on.bet"
  "i-on.bet"
  "www.i-on.bet"
  "mod.i-on.bet"
  "agent.i-on.bet"
)

for DOMAIN in "${DOMAINS[@]}"; do
  echo "  → $DOMAIN"
  cloudflared tunnel route dns "$TUNNEL_NAME" "$DOMAIN" || \
    echo "     ⚠️  $DOMAIN DNS 등록 실패 (이미 존재하거나 권한 문제)"
done

# ── 완료 ─────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  설정 완료!"
echo ""
  echo "  터널 시작:    pnpm tunnel:start"
  echo "  PM2 전체기동: pnpm pm2:start"
  echo "  터널 상태:    cloudflared tunnel info $TUNNEL_NAME"
  echo ""
  echo "  도메인 확인:"
  echo "    https://apisgate.org/health        (API)"
  echo "    https://mod.tozinosolution.com     (슈퍼어드민)"
  echo "    https://mod.tozinosoltion.com      (슈퍼어드민)"
  echo "    https://tozinosolution.com         (슈퍼어드민)"
  echo "    https://user.i-on.bet             (솔루션 유저)"
  echo "    https://i-on.bet                  (솔루션 유저 별칭)"
  echo "    https://mod.i-on.bet              (솔루션 어드민)"
  echo "    https://agent.i-on.bet            (솔루션 에이전트)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── (선택) systemd 서비스 설치 ───────────────────────
read -r -p "systemd 서비스로 설치할까요? (부팅 시 자동 시작) [y/N] " INSTALL_SERVICE
if [[ "$INSTALL_SERVICE" =~ ^[Yy]$ ]]; then
  # sudo 환경에서 ~/.local/bin 이 PATH 에 없으므로 전체 경로로 실행
  CLOUDFLARED_BIN=$(command -v cloudflared 2>/dev/null || echo "$HOME/.local/bin/cloudflared")
  sudo "$CLOUDFLARED_BIN" service install
  echo "  → cloudflared 서비스 설치 완료"
  sudo systemctl enable cloudflared
  sudo systemctl start cloudflared
  echo "  → systemctl enable/start cloudflared 완료"
fi
