#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# Docker 설치 → docker-compose (Postgres + Redis) 시작 → DB 마이그레이션 → API 재시작
#
# 사용법: sudo bash scripts/install-docker-and-start-db.sh
#   또는:  bash scripts/install-docker-and-start-db.sh  (내부에서 sudo 호출)
# ─────────────────────────────────────────────────────────────
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"
export PATH="$HOME/.local/bin:$PATH"

ok()   { echo "  ✔  $*"; }
info() { echo "  →  $*"; }

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Docker 설치 + DB 시작 + API 재기동"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── 1. Docker 설치 ───────────────────────────────────
echo ""
echo "[1/5] Docker 설치 확인"
if command -v docker &>/dev/null; then
  ok "docker $(docker --version)"
else
  info "Docker 설치 중..."
  apt-get update -qq
  apt-get install -y docker.io
  systemctl enable docker
  systemctl start docker
  ok "Docker 설치 완료"
fi

# docker compose (plugin) 또는 docker-compose (standalone) 확인
DOCKER_COMPOSE_CMD=""
if docker compose version &>/dev/null 2>&1; then
  DOCKER_COMPOSE_CMD="docker compose"
  ok "docker compose plugin 사용"
elif command -v docker-compose &>/dev/null; then
  DOCKER_COMPOSE_CMD="docker-compose"
  ok "docker-compose standalone 사용"
else
  info "docker-compose standalone 설치 중..."
  curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64" \
    -o /usr/local/bin/docker-compose
  chmod +x /usr/local/bin/docker-compose
  DOCKER_COMPOSE_CMD="docker-compose"
  ok "docker-compose 설치 완료"
fi

# ── 2. 현재 유저를 docker 그룹에 추가 ────────────────
echo ""
echo "[2/5] docker 그룹 권한"
ACTUAL_USER="${SUDO_USER:-$USER}"
if groups "$ACTUAL_USER" | grep -q docker; then
  ok "$ACTUAL_USER 이미 docker 그룹에 있음"
else
  usermod -aG docker "$ACTUAL_USER"
  ok "$ACTUAL_USER → docker 그룹 추가 (재로그인 없이 sg docker 로 실행)"
fi

# ── 3. docker-compose (Postgres + Redis) 시작 ─────────
echo ""
echo "[3/5] Postgres + Redis 시작 (docker-compose)"
cd "$REPO_ROOT"

# sg docker 로 그룹 권한 즉시 적용
if sg docker -c "$DOCKER_COMPOSE_CMD ps" 2>/dev/null | grep -q "Up"; then
  ok "컨테이너 이미 실행 중"
  sg docker -c "$DOCKER_COMPOSE_CMD ps"
else
  info "컨테이너 시작 중..."
  sg docker -c "$DOCKER_COMPOSE_CMD up -d"
  info "컨테이너 준비 대기 중 (최대 30초)..."
  for i in $(seq 1 30); do
    if sg docker -c "$DOCKER_COMPOSE_CMD exec -T postgres pg_isready -U postgres" &>/dev/null; then
      ok "Postgres 준비 완료"
      break
    fi
    sleep 1
    echo -n "."
  done
  echo ""
fi

# ── 4. DB 마이그레이션 + 시드 ────────────────────────
echo ""
echo "[4/5] Prisma 마이그레이션 + 시드"
# sudo 로 실행 중이면 실제 유저로 pnpm 실행
RUN_PNPM() {
  if [[ "${SUDO_USER:-}" != "" ]]; then
    su - "$SUDO_USER" -c "cd '$REPO_ROOT' && export NVM_DIR=\"\$HOME/.nvm\" && [ -s \"\$NVM_DIR/nvm.sh\" ] && . \"\$NVM_DIR/nvm.sh\" && $1"
  else
    bash -c "cd '$REPO_ROOT' && $1"
  fi
}

RUN_PNPM "pnpm db:migrate:deploy" && ok "마이그레이션 완료" || info "마이그레이션 건너뜀 (이미 최신 상태)"
RUN_PNPM "pnpm db:seed" && ok "시드 완료 (데모 계정 생성)" || info "시드 건너뜀 (이미 존재하거나 실패)"

# ── 5. PM2 api 재시작 ─────────────────────────────────
echo ""
echo "[5/5] PM2 api + sms-ingest 재시작"
RUN_PNPM "pm2 restart api sms-ingest && pm2 status"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  완료! API 헬스체크:"
echo "    curl http://localhost:4001/health"
echo "    curl https://apisgate.org/health"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
