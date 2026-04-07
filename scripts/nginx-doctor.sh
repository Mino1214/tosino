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
  "http://127.0.0.1:3000/" \
  "http://127.0.0.1:3002/"
do
  code=$(curl -sS -o /dev/null -w '%{http_code}' --connect-timeout 2 "$url" 2>/dev/null || echo "ERR")
  echo "  $url → HTTP $code"
done

echo ""
echo "=== 3b) 리슨 주소 (외부는 80·443 만 열면 됨, 3002 는 nginx 가 루프백으로 붙으면 충분) ==="
if command -v ss >/dev/null 2>&1; then
  ss -tlnp 2>/dev/null | grep -E ':(80|443|3002)\s' | sort -u | head -12
else
  echo "  (ss 없음)"
fi

echo ""
echo "=== 3c) 방화벽 (80·443 이 막히면 외부에서 전부 타임아웃 — 3002 를 열 필요 없음) ==="
if command -v ufw >/dev/null 2>&1; then
  ufw status verbose 2>/dev/null | sed -n '1,25p' || echo "  ufw status 실패(sudo 없으면 생략)"
else
  echo "  ufw 없음 — 클라우드 콘솔·nftables 등에서 80/tcp 443/tcp 허용 확인"
fi

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
echo "=== 5) 공인 IP ↔ DNS (외부가 이 nginx 로 오려면 A 레코드가 이 서버와 같아야 함) ==="
PUB=$(curl -sS --connect-timeout 3 https://ifconfig.me/ip 2>/dev/null || true)
if [ -n "$PUB" ]; then
  echo "  이 서버가 보고하는 공인 IP: $PUB"
else
  echo "  공인 IP 조회 실패(오프라인)"
fi
for zone in nexus001.vip mod.nexus001.vip; do
  if command -v dig >/dev/null 2>&1; then
    rec=$(dig +short "$zone" A 2>/dev/null | head -1 || true)
    if [ -z "$rec" ]; then
      echo "  dig $zone A → (없음 또는 조회 실패)"
    elif [ -n "$PUB" ] && [ "$rec" = "$PUB" ]; then
      echo "  dig $zone A → $rec  ✓ 공인 IP와 일치"
    else
      echo "  dig $zone A → $rec  ⚠ 공인 IP($PUB)와 다르면 외부는 **다른 서버**로 감"
    fi
  else
    echo "  dig 없음 — 수동: dig +short $zone A"
    break
  fi
done

echo ""
echo "=== 해석 ==="
echo "  • (3) 에서 3002 가 ERR 이면 솔루션 미기동 또는 pnpm dev:solution 만 켜 둔 뒤 서버를 재시작한 경우 등."
echo "  • (3) 은 200 인데 외부만 안 되면 (3c) 방화벽·호스팅 보안그룹에서 80·443 허용. 3002 는 외부에 열지 않아도 됨."
echo "  • (3) 은 200/307 인데 (4) 만 404 이면 nginx server_name/프록시 충돌(옛 설정) 가능."
echo "  • 외부만 404/502 면 (5) DNS 가 다른 IP 인지, Cloudflare 프록시/캐시 인지 확인."
