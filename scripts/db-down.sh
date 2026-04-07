#!/usr/bin/env bash
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
else
  SUDO_DOCKER=0
  export SUDO_DOCKER
fi

d() {
  if [ "$SUDO_DOCKER" = 1 ]; then
    sudo docker "$@"
  else
    docker "$@"
  fi
}

if d info >/dev/null 2>&1; then
  bash "$ROOT/scripts/compose.sh" down 2>/dev/null || true
fi

d stop tosino-postgres tosino-redis 2>/dev/null || true
echo "중지 완료 (폴백 컨테이너: tosino-postgres, tosino-redis). compose 프로젝트는 compose.sh down 처리됨."
