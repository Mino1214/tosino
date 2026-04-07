#!/usr/bin/env bash
# docker compose (플러그인) 또는 docker-compose (v1). SUDO_DOCKER=1 이면 sudo docker … 사용.
set -euo pipefail

dk() {
  if [ "${SUDO_DOCKER:-0}" = 1 ]; then
    sudo docker "$@"
  else
    docker "$@"
  fi
}

if dk compose version >/dev/null 2>&1; then
  dk compose "$@"
  exit $?
fi

if command -v docker-compose >/dev/null 2>&1; then
  if [ "${SUDO_DOCKER:-0}" = 1 ]; then
    sudo docker-compose "$@"
  else
    docker-compose "$@"
  fi
  exit $?
fi

echo "Docker Compose 가 없습니다. Ubuntu 예시:" >&2
echo "  sudo apt install docker-compose-v2" >&2
echo "  # 또는: sudo apt install docker-compose" >&2
exit 1
