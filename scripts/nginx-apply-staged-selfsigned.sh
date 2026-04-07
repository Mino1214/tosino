#!/usr/bin/env bash
# /tmp 에 미리 생성된 tosino-nexus001-selfsigned.conf 를 sites-available 로 복사하고 reload.
# (CI/에이전트가 sudo 없이 생성만 할 때) 또는:
#   bash -c 'sed ... deploy/nginx/nexus001.vip.conf > /tmp/tosino-nexus001-selfsigned.conf' 후
#   sudo bash scripts/nginx-apply-staged-selfsigned.sh
#
set -euo pipefail
STAGE="${1:-/tmp/tosino-nexus001-selfsigned.conf}"
OUT="/etc/nginx/sites-available/tosino-nexus001-selfsigned.conf"
LINK="/etc/nginx/sites-enabled/tosino-nexus001.vip.conf"

if [ "$(id -u)" -ne 0 ]; then
  echo "sudo bash $0" >&2
  exit 1
fi
if [ ! -f "$STAGE" ]; then
  echo "없음: $STAGE" >&2
  exit 1
fi

DISABLED_DIR="/etc/nginx/sites-disabled-by-tosino"
mkdir -p "$DISABLED_DIR"
for f in /etc/nginx/sites-enabled/nexus001.vip.conf \
         /etc/nginx/sites-enabled/nexus001.vip.conf.disabled-by-tosino; do
  if [ -e "$f" ]; then
    mv "$f" "$DISABLED_DIR/"
    echo "→ 레거시 이동: $f → $DISABLED_DIR/"
  fi
done

install -m 0644 "$STAGE" "$OUT"
ln -sf "$OUT" "$LINK"
echo "→ $LINK -> $OUT"

nginx -t
systemctl reload nginx
echo "완료: nginx reload"
