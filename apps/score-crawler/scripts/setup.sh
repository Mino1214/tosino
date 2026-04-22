#!/usr/bin/env bash
# score-crawler 최초 셋업: venv 생성 + 의존성 설치 + playwright chromium 다운로드.
# idempotent (여러 번 돌려도 안전).
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$HERE"

say() { printf "\033[1;36m[score-crawler setup]\033[0m %s\n" "$*"; }
warn() { printf "\033[1;33m[score-crawler setup]\033[0m %s\n" "$*"; }
err() { printf "\033[1;31m[score-crawler setup]\033[0m %s\n" "$*" >&2; }

# 1) python3 확인
if ! command -v python3 >/dev/null 2>&1; then
  err "python3 가 없습니다. 먼저 설치하세요: sudo apt install -y python3"
  exit 1
fi

# 2) python3-venv 모듈 확인 (ensurepip 없으면 venv 생성 시 pip 가 못 깔린다)
if ! python3 -c "import ensurepip" >/dev/null 2>&1; then
  warn "python3-venv 모듈이 없습니다. 다음을 먼저 실행하세요:"
  warn "    sudo apt install -y python3-venv python3-pip"
  exit 1
fi

# 3) venv 생성 (이미 있고 깨지지 않았으면 재사용)
if [[ ! -x ".venv/bin/python" ]]; then
  say "venv 생성: $HERE/.venv"
  rm -rf .venv
  python3 -m venv .venv
fi

# 4) pip 업그레이드 + 의존성 설치
say "pip / requirements 설치"
# shellcheck disable=SC1091
source .venv/bin/activate
pip install --upgrade pip >/dev/null
pip install -r requirements.txt

# 5) playwright chromium 다운로드 (이미 설치돼 있으면 즉시 skip)
say "playwright chromium 준비 (최초 1회 다운로드)"
python -m playwright install chromium

# 6) .env 샘플 (없을 때만 복사)
if [[ ! -f .env ]]; then
  say ".env 생성 (.env.example 복사)"
  cp .env.example .env
fi

say "완료 ✓  실행: pnpm crawler:run  |  주기: pnpm crawler:loop  |  로그: pnpm crawler:log"
