#!/usr/bin/env bash
# 로컬 sms-ingest(기본 4050)를 인터넷(HTTPS)으로 노출 — 모바일 LTE에서 접속할 때 사용.
# 사전 설치: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/
#
# 빠른 테스트(계정 없이, URL이 실행마다 바뀜):
#   pnpm tunnel:sms-ingest
# 터미널에 나온 https://....trycloudflare.com 를 복사한 뒤
# Flutter 앱 URL에 붙이기:  https://....trycloudflare.com/webhook/sms
#
# 고정 도메인은 Cloudflare Zero Trust에서 Named Tunnel + Public Hostname 설정 필요.

set -euo pipefail
PORT="${SMS_INGEST_PORT:-4050}"
TARGET="http://127.0.0.1:${PORT}"

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "cloudflared 가 없습니다. 설치: brew install cloudflare/cloudflare/cloudflared" >&2
  exit 1
fi

echo "Tunnel → ${TARGET}"
echo "Flutter 앱에는 아래 형태로 넣으세요:  https://<터널호스트>/webhook/sms"
echo ""

exec cloudflared tunnel --url "${TARGET}"
