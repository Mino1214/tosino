#!/usr/bin/env bash
# 1) docker compose / docker-compose (compose.sh)
# 2) 실패 시 docker run 폴백 (Postgres 5433, Redis 6379)
# 소켓 권한 없으면 sudo docker 로 자동 전환 (영구: usermod -aG docker 후 재로그인)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SUDO_DOCKER="${SUDO_DOCKER:-}"
if [ "$SUDO_DOCKER" = 1 ]; then
  export SUDO_DOCKER=1
elif docker info >/dev/null 2>&1; then
  SUDO_DOCKER=0
  export SUDO_DOCKER
elif sudo docker info >/dev/null 2>&1; then
  SUDO_DOCKER=1
  export SUDO_DOCKER
  echo "→ Docker 소켓 권한 없음 — sudo 로 실행합니다." >&2
  echo "   (영구: sudo usermod -aG docker \"\$USER\" 후 새 터미널 또는 재로그인)" >&2
else
  err="$(docker info 2>&1 || true)"
  echo "Docker CLI에 연결할 수 없습니다." >&2
  echo "" >&2
  if echo "$err" | grep -qi 'permission denied'; then
    echo "  → 소켓 권한이며 sudo 도 실패했습니다. docker 그룹·sudo 설정을 확인하세요." >&2
  elif echo "$err" | grep -qiE 'cannot connect|connection refused|is the docker daemon running'; then
    echo "  → 데몬: sudo systemctl start docker" >&2
  else
    echo "  상세: ${err:0:300}" >&2
  fi
  echo "" >&2
  echo "  확인: docker info  또는  sudo docker info" >&2
  exit 1
fi

d() {
  if [ "$SUDO_DOCKER" = 1 ]; then
    sudo docker "$@"
  else
    docker "$@"
  fi
}

if bash "$ROOT/scripts/compose.sh" up -d; then
  echo "Compose 로 기동했습니다."
  exit 0
fi

echo "→ Compose 사용 불가 — docker run 폴백 (컨테이너 이름: tosino-postgres, tosino-redis)" >&2

if d ps --format '{{.Names}}' | grep -qx 'tosino-postgres'; then
  echo "  tosino-postgres 이미 실행 중"
elif d ps -a --format '{{.Names}}' | grep -qx 'tosino-postgres'; then
  d start tosino-postgres
  echo "  tosino-postgres 시작"
else
  d run -d --name tosino-postgres \
    -e POSTGRES_USER=postgres \
    -e POSTGRES_PASSWORD=postgres \
    -e POSTGRES_DB=tosino \
    -p 5433:5432 \
    postgres:16-alpine
  echo "  tosino-postgres 생성·시작"
fi

if d ps --format '{{.Names}}' | grep -qx 'tosino-redis'; then
  echo "  tosino-redis 이미 실행 중"
elif d ps -a --format '{{.Names}}' | grep -qx 'tosino-redis'; then
  d start tosino-redis
  echo "  tosino-redis 시작"
else
  d run -d --name tosino-redis -p 6379:6379 redis:7-alpine
  echo "  tosino-redis 생성·시작"
fi

echo "완료."
