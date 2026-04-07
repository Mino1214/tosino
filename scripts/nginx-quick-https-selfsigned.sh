#!/usr/bin/env bash
# Let's Encrypt 없이 자체 서명 인증서로 HTTPS 즉시 활성화 (팀 외부 접속용 임시)
# 브라우저에 "주의 필요" 경고가 뜨며, 고급 → 안전하지 않은 사이트로 이동 으로 접속 가능.
#
# 저장소 루트에서:
#   sudo bash scripts/nginx-quick-https-selfsigned.sh
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE_CONF="$REPO_ROOT/deploy/nginx/nexus001.vip.conf"
SSL_DIR="/etc/nginx/tosino-ssl/nexus001.vip"
OUT_CONF="/etc/nginx/sites-available/tosino-nexus001-selfsigned.conf"
LINK="/etc/nginx/sites-enabled/tosino-nexus001.vip.conf"

if [ "$(id -u)" -ne 0 ]; then
  echo "sudo 로 실행하세요." >&2
  exit 1
fi

if [ ! -f "$BASE_CONF" ]; then
  echo "없음: $BASE_CONF" >&2
  exit 1
fi

# sites-enabled 옛 nexus001 (Tosino 와 중복). 이름만 바꾸면 여전히 include 되므로 디렉터리 밖으로 이동.
DISABLED_DIR="/etc/nginx/sites-disabled-by-tosino"
mkdir -p "$DISABLED_DIR"
for f in /etc/nginx/sites-enabled/nexus001.vip.conf \
         /etc/nginx/sites-enabled/nexus001.vip.conf.disabled-by-tosino; do
  if [ -e "$f" ]; then
    mv "$f" "$DISABLED_DIR/"
    echo "→ 레거시 이동: $f → $DISABLED_DIR/"
  fi
done

mkdir -p "$SSL_DIR"

if [ ! -f "$SSL_DIR/fullchain.pem" ]; then
  echo "→ 자체 서명 인증서 생성 (90일, SAN: nexus001·www·mod·demo1·demo2)…"
  openssl req -x509 -nodes -days 90 -newkey rsa:2048 \
    -keyout "$SSL_DIR/privkey.pem" \
    -out "$SSL_DIR/fullchain.pem" \
    -subj "/CN=nexus001.vip" \
    -addext "subjectAltName=DNS:nexus001.vip,DNS:www.nexus001.vip,DNS:mod.nexus001.vip,DNS:demo1.nexus001.vip,DNS:demo2.nexus001.vip"
  chmod 640 "$SSL_DIR/privkey.pem"
  chmod 644 "$SSL_DIR/fullchain.pem"
  echo "  $SSL_DIR/fullchain.pem"
else
  echo "→ 기존 인증서 사용: $SSL_DIR/fullchain.pem"
  echo "  (mod.nexus001.vip 접속 시 호스트 불일치면: rm $SSL_DIR/*.pem 후 이 스크립트 재실행)"
fi

echo "→ nginx 설정 생성…"
sed "s#/etc/letsencrypt/live/nexus001.vip/#${SSL_DIR}/#g" "$BASE_CONF" >"$OUT_CONF"

if [ ! -f /etc/letsencrypt/options-ssl-nginx.conf ]; then
  sed -i '\|include /etc/letsencrypt/options-ssl-nginx.conf|d' "$OUT_CONF"
  echo "  (options-ssl-nginx.conf 없음 → 해당 include 제거)"
fi
if [ ! -f /etc/letsencrypt/ssl-dhparams.pem ]; then
  sed -i '\|ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem|d' "$OUT_CONF"
  echo "  (ssl-dhparams 없음 → ssl_dhparam 줄 제거)"
fi

ln -sf "$OUT_CONF" "$LINK"
echo "→ $LINK -> $OUT_CONF"

if nginx -t; then
  systemctl reload nginx
  echo ""
  echo "완료. HTTPS (자체 서명):"
  echo "  curl -sk -I -H \"Host: nexus001.vip\" https://127.0.0.1/health"
  echo ""
  echo "방화벽이 있으면: sudo ufw allow 80,443/tcp && sudo ufw reload"
  echo "나중에 Let's Encrypt 쓰면: sudo certbot --nginx -d nexus001.vip … 후"
  echo "  sudo bash scripts/nginx-enable-tosino.sh https"
else
  echo "nginx -t 실패" >&2
  exit 1
fi
