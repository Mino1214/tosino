#!/usr/bin/env bash
# 기존 nginx(sites-enabled)를 건드리지 않고 백업한 뒤,
# Ubuntu 기본 default 사이트를 비활성화하고 Tosino 설정을 적용합니다.
#
# 서버에서 저장소 루트에서 실행:
#   sudo bash scripts/nginx-migrate-to-tosino.sh http
#   sudo bash scripts/nginx-migrate-to-tosino.sh https
#   sudo bash scripts/nginx-migrate-to-tosino.sh https www.nexus001.vip
#     (certbot 이 live/www... 만 만들었을 때)
#
# 인증서 없거나 개발 PC면 http. HTTPS 는 인증서가 있는 서버에서만.
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MODE="${1:-http}"
LE_NAME="${2:-}"

if [ "$(id -u)" -ne 0 ]; then
  echo "sudo 로 실행하세요: sudo bash $0 http|https" >&2
  exit 1
fi

if [ "$MODE" != "http" ] && [ "$MODE" != "https" ]; then
  echo "인자: http 또는 https (기본 http)" >&2
  exit 1
fi

BACKUP_DIR="/etc/nginx/sites-enabled.tosino-backup.$(date +%Y%m%d%H%M%S)"
mkdir -p "$BACKUP_DIR"
shopt -s nullglob
for f in /etc/nginx/sites-enabled/*; do
  [ -e "$f" ] && cp -a "$f" "$BACKUP_DIR/"
done
shopt -u nullglob
echo "→ sites-enabled 백업: $BACKUP_DIR"

# Ubuntu 기본 사이트(80 포트 default_server 충돌 방지)
for f in /etc/nginx/sites-enabled/default; do
  if [ -e "$f" ]; then
    mv "$f" "${f}.disabled-by-tosino"
    echo "→ 비활성화: $f → ${f}.disabled-by-tosino"
  fi
done

# 옛 nexus001 전용 설정이 남아 있으면 Tosino 와 충돌. sites-enabled 안에 두면 파일명과 무관하게 로드됨.
DISABLED_DIR="/etc/nginx/sites-disabled-by-tosino"
mkdir -p "$DISABLED_DIR"
for f in /etc/nginx/sites-enabled/nexus001.vip.conf \
         /etc/nginx/sites-enabled/nexus001.vip.conf.disabled-by-tosino; do
  if [ -e "$f" ]; then
    mv "$f" "$DISABLED_DIR/"
    echo "→ 레거시 이동: $f → $DISABLED_DIR/"
  fi
done

# 이전에 켜 둔 동일 링크 제거 후 재생성 (nginx-enable 가 ln -sf 처리)
if [ -n "$LE_NAME" ]; then
  bash "$REPO_ROOT/scripts/nginx-enable-tosino.sh" "$MODE" "$LE_NAME"
else
  bash "$REPO_ROOT/scripts/nginx-enable-tosino.sh" "$MODE"
fi

echo ""
echo "다른 도메인/옛 설정이 남아 403·옛 HTML이 나오면:"
echo "  ls -la /etc/nginx/sites-enabled/"
echo "  sudo mv /etc/nginx/sites-enabled/문제파일.conf /etc/nginx/sites-enabled/문제파일.conf.disabled"
echo "  sudo nginx -t && sudo systemctl reload nginx"
echo ""
echo "되돌리기(백업에서 복원):"
echo "  sudo cp -a $BACKUP_DIR/* /etc/nginx/sites-enabled/"
echo "  sudo nginx -t && sudo systemctl reload nginx"
