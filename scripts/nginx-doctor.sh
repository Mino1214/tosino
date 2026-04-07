#!/usr/bin/env bash
# nexus001.vip 쪽 nginx·업스트림이 제대로 붙었는지 서버에서 확인합니다.
#   sudo bash scripts/nginx-doctor.sh
#
set -uo pipefail

echo "=== 1) sites-enabled (tosino 링크가 어디를 가리키는지) ==="
ls -la /etc/nginx/sites-enabled/ 2>/dev/null | sed -n '1,40p' || echo "(sites-enabled 없음)"
LEGACY_ON=0
for f in /etc/nginx/sites-enabled/*; do
  [ -e "$f" ] || continue
  [ -L "$f" ] || continue
  t="$(readlink -f "$f" 2>/dev/null || true)"
  case "$t" in
    */sites-available/nexus001.vip.conf)
      case "$f" in
        *tosino*) ;;
        *) LEGACY_ON=1 ;;
      esac
      ;;
  esac
done
if [ "$LEGACY_ON" -eq 1 ] && ls /etc/nginx/sites-enabled/tosino-nexus001.vip.conf >/dev/null 2>&1; then
  echo ""
  echo "!!! 경고: sites-enabled 에 옛 nexus001.vip.conf 링크가 남아 Tosino 와 동일 도메인이 두 번 잡힘."
  echo "    sites-enabled 안에 두면 파일명을 바꿔도 nginx 가 읽습니다. 밖으로 옮기세요:"
  echo "    sudo mkdir -p /etc/nginx/sites-disabled-by-tosino"
  echo "    sudo mv /etc/nginx/sites-enabled/nexus001.vip.conf* /etc/nginx/sites-disabled-by-tosino/"
fi

echo ""
echo "=== 2) nexus001 / tosino 를 언급하는 server_name ==="
if command -v nginx >/dev/null 2>&1; then
  nginx -T 2>/dev/null | grep -E 'server_name |listen .*443|listen .*80' | grep -i nexus | head -30 || true
else
  echo "nginx 명령 없음"
fi

echo ""
echo "=== 3) 백엔드 직접 (서버 로컬) ==="
for url in \
  "http://127.0.0.1:4001/health" \
  "http://127.0.0.1:3000/"
do
  code=$(curl -sS -o /dev/null -w '%{http_code}' --connect-timeout 2 "$url" 2>/dev/null || echo "ERR")
  echo "  $url → HTTP $code"
done

echo ""
echo "=== 4) nginx 경유 (Host: nexus001.vip, 서버 로컬) ==="
for url in \
  "http://127.0.0.1/health" \
  "https://127.0.0.1/health" \
  "http://127.0.0.1/" \
  "https://127.0.0.1/"
do
  code=$(curl -sS -o /dev/null -w '%{http_code}' --connect-timeout 2 -H "Host: nexus001.vip" -k "$url" 2>/dev/null || echo "ERR")
  echo "  curl -k -H Host:nexus001.vip $url → HTTP $code"
done

echo ""
echo "=== 해석 ==="
echo "  • (3) 에서 4001/3000 이 ERR·000 이면 API/Next 가 안 떠 있음 → 404 원인 아님, 기동 먼저."
echo "  • (3) 은 200/307 인데 (4) 만 404 이면 nginx server_name/프록시 충돌(옛 설정) 가능."
echo "  • 외부만 404 면 DNS·CDN·다른 IP 로 요청이 가는지 dig nexus001.vip 확인."
