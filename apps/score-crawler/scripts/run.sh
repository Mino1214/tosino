#!/usr/bin/env bash
# score-crawler 실행 래퍼. venv 자동 활성 후 run.py 에 모든 인자를 전달한다.
# 예)
#   ./scripts/run.sh                               # 1회 실행
#   ./scripts/run.sh --show-log --log-take 20      # 로그 조회
#   ./scripts/run.sh --loop --interval-seconds 300 # 주기 실행
#   ./scripts/run.sh --sports soccer --headless=false --limit-rows 3
#
# venv 가 아직 없으면 자동으로 setup.sh 를 부른다.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$HERE"

if [[ ! -x ".venv/bin/python" ]]; then
  echo "[score-crawler] venv 가 없어 setup 을 먼저 실행합니다…" >&2
  bash "$HERE/scripts/setup.sh"
fi

# shellcheck disable=SC1091
source .venv/bin/activate
exec python run.py "$@"
