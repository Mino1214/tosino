#!/usr/bin/env bash
# nexus001.vip nginx 설정을 서버에 반영합니다 (실제 배포).
#   deploy/nginx/nexus001.vip.conf → /etc/nginx/sites-enabled/ 링크 → nginx -t → reload
#
# 저장소 루트에서 (배포 서버에서 root):
#   sudo bash scripts/deploy-nginx.sh              # HTTPS (기본, live/nexus001.vip 인증서 필요)
#   sudo bash scripts/deploy-nginx.sh http         # HTTP 전용 (인증서 없을 때)
#   sudo bash scripts/deploy-nginx.sh https www.nexus001.vip   # certbot 폴더명이 다를 때
#
# (로컬에서 nginx -t -c deploy/nginx/nexus001.vip.conf 는 쓰지 마세요. http{} 밖이라 오류 납니다.)
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec bash "$REPO_ROOT/scripts/nginx-enable-tosino.sh" "$@"
