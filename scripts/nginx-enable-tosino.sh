#!/usr/bin/env bash
# 저장소의 nginx 설정을 sites-enabled 에 연결하고 reload 합니다.
#
# 사용 (저장소 루트에서, SSL은 이 머신의 /etc/letsencrypt 에 있어야 함):
#   sudo bash scripts/nginx-enable-tosino.sh http
#   sudo bash scripts/nginx-enable-tosino.sh https
#   sudo bash scripts/nginx-enable-tosino.sh https www.nexus001.vip
#     ↑ certbot 이 live/www.nexus001.vip 에만 만들었을 때 (기본값은 live/nexus001.vip)
#
# 인자:
#   $1  http | https  (생략 시 https)
#   $2  (https 전용) letsencrypt live 하위 폴더명 (기본 nexus001.vip)
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ARG1="${1:-}"
ARG2="${2:-}"

if [ "$ARG1" = "http" ] || [ "$ARG1" = "http-only" ]; then
  MODE="http"
  LE_SUB=""
elif [ "$ARG1" = "https" ]; then
  MODE="https"
  LE_SUB="${ARG2:-nexus001.vip}"
elif [ -z "$ARG1" ]; then
  MODE="${TOSINO_NGINX_MODE:-https}"
  LE_SUB="${TOSINO_LE_SUBDIR:-nexus001.vip}"
elif [ "$ARG1" = "help" ] || [ "$ARG1" = "-h" ]; then
  grep '^#' "$0" | head -20
  exit 0
else
  echo "사용법: sudo bash $0 [http|https] [letsencrypt_live_폴더명]" >&2
  echo "  예: sudo bash $0 https www.nexus001.vip" >&2
  exit 1
fi

BASE_HTTPS_CONF="$REPO_ROOT/deploy/nginx/nexus001.vip.conf"
GEN_CONF="/etc/nginx/sites-available/tosino-nexus001-generated.conf"

if [ "$MODE" = "http" ] || [ "$MODE" = "http-only" ]; then
  SRC="$REPO_ROOT/deploy/nginx/nexus001.vip.http-only.conf"
  MODE_LABEL="HTTP 전용 (인증서 불필요)"
else
  CERT="/etc/letsencrypt/live/$LE_SUB/fullchain.pem"
  KEY="/etc/letsencrypt/live/$LE_SUB/privkey.pem"
  if [ ! -f "$CERT" ] || [ ! -f "$KEY" ]; then
    echo "→ HTTPS 실패: 다음 파일이 없습니다." >&2
    echo "    $CERT" >&2
    echo "    $KEY" >&2
    echo "" >&2
    echo "→ /etc/letsencrypt/live/ 실제 폴더 목록:" >&2
    ls -la /etc/letsencrypt/live/ 2>/dev/null || echo "   (live 디렉터리 없음 — certbot 미실행 또는 이 PC가 아닌 서버에서 실행 중)" >&2
    echo "" >&2
    echo "해결:" >&2
    echo "  1) 폴더명이 nexus001.vip 이 아니면: sudo bash $0 https 실제폴더이름" >&2
    echo "  2) 인증서가 아직 없으면: sudo bash $0 http" >&2
    echo "  3) 배포 서버가 아닌 개발 PC에서 https 를 돌리면 live 경로가 없어 실패합니다." >&2
    exit 1
  fi

  if [ "$LE_SUB" != "nexus001.vip" ]; then
    sed "s#/etc/letsencrypt/live/nexus001.vip/#/etc/letsencrypt/live/${LE_SUB}/#g" \
      "$BASE_HTTPS_CONF" >"$GEN_CONF"
    SRC="$GEN_CONF"
    MODE_LABEL="HTTPS (live/$LE_SUB 사용, 생성: $GEN_CONF)"
  else
    SRC="$BASE_HTTPS_CONF"
    MODE_LABEL="HTTPS (letsencrypt live/nexus001.vip)"
  fi
fi

LINK_NAME="${NGINX_SITE_NAME:-tosino-nexus001.vip.conf}"
DEST="/etc/nginx/sites-enabled/$LINK_NAME"

if [ "$(id -u)" -ne 0 ]; then
  echo "root 권한이 필요합니다: sudo bash $0 ..." >&2
  exit 1
fi

if [ ! -f "$SRC" ]; then
  echo "설정 파일이 없습니다: $SRC" >&2
  exit 1
fi

echo "→ 모드: $MODE_LABEL"
echo "→ $DEST -> $SRC"
ln -sf "$SRC" "$DEST"

if nginx -t; then
  systemctl reload nginx
  echo "→ nginx reload 완료"
else
  echo "" >&2
  echo "nginx -t 실패. HTTP 로 시도: sudo bash $0 http" >&2
  echo "링크 제거: sudo rm -f $DEST" >&2
  exit 1
fi

echo ""
echo "확인 예시:"
if [ "$MODE" = "http" ] || [ "$MODE" = "http-only" ]; then
  echo "  curl -sS -I -H \"Host: nexus001.vip\" http://127.0.0.1/health"
else
  echo "  curl -sS -I -H \"Host: nexus001.vip\" https://127.0.0.1/health -k"
fi
