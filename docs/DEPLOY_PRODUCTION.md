# 프로덕션 배포 (nexus001.vip 예시)

## 1. 서버 준비

- Node 20+, pnpm 9+, PM2, PostgreSQL, Redis(Bull·ODDS 크론용), nginx
- 방화벽: **80·443**만 외부 개방. 3000·3002·4001 등은 루프백 전용.

## 2. 환경 파일

| 파일 | 용도 |
|------|------|
| `apps/api/.env` | `DATABASE_URL`, `JWT_*`, `PUBLIC_API_URL`, `REDIS_URL`, `ODDSHOST_*`, `ODDSHOST_PROXY_SECRET` 등 |
| `apps/solution-web/.env.production` | `NEXT_PUBLIC_USE_SAME_ORIGIN_API=true`, OddsHost 탭용 `NEXT_PUBLIC_ODDSHOST_PROXY_SECRET`(API의 `ODDSHOST_PROXY_SECRET`과 **동일** 문자열) |

API는 PM2에서 **`cwd: apps/api`** 로 기동하므로 `ConfigModule`이 **`apps/api/.env`** 를 읽습니다.

## 3. 한 번에 배포

저장소 루트에서:

```bash
bash scripts/deploy-prod-nexus.sh
```

또는:

```bash
pnpm deploy:server
```

- `RUN_DB_SEED=1` — 시드 포함(스포츠 스냅샷 등; 운영 DB 주의)
- `SKIP_INSTALL=1` / `SKIP_MIGRATE=1` — 생략 옵션

## 4. nginx

```bash
sudo bash scripts/nginx-enable-tosino.sh https
# 또는 deploy/nginx/nexus001.vip.conf 를 sites-enabled 에 링크 후
sudo nginx -t && sudo systemctl reload nginx
```

`demo1` / `demo2` 서버 블록에는 `/api/` 프록시가 포함되어 있어야 솔루션에서 `같은 오리진 + /api` 호출이 동작합니다.

## 5. 배포 후 확인

```bash
curl -sk --resolve nexus001.vip:443:127.0.0.1 https://nexus001.vip/health
curl -sk "https://nexus001.vip/api/public/bootstrap?host=nexus001.vip" | head -c 400
```

OddsHost: `GET /api/public/oddshost/diagnostic?sport=1&oddshostSecret=...` (운영에서는 `ODDSHOST_PROXY_SECRET` 필수)

## 6. 솔루션 502 (Bad Gateway)

nginx 로그(`error.log`)에 `connect() failed (111: Connection refused)` 이면 **업스트림이 안 떠 있음**입니다.

1. **PM2 확인**  
   `pm2 status` — `solution-web` 이 `online` 인지, `restarting` 이면 로그 확인: `pm2 logs solution-web --lines 80`
2. **정적 폴더**  
   `apps/solution-web/out` 디렉터리가 배포 후 존재해야 합니다. 없으면 `pnpm build:apps` 재실행.
3. **포트·바인드**  
   `ecosystem.config.js` 는 `serve`를 **`127.0.0.1:3002`** 에만 붙입니다. nginx `proxy_pass http://127.0.0.1:3002` 와 일치해야 합니다.
4. **이전 설정**  
   `pnpm exec serve` 는 systemd/PM2 환경에서 **pnpm 이 PATH에 없으면** 즉시 죽어 502가 날 수 있어, 현재는 **`node node_modules/serve/build/main.js`** 로 기동합니다.

---

## 7. OddsHost IP

Nest 프로세스가 나가는 **공인 IP**가 벤더 화이트리스트와 일치해야 합니다.

```bash
curl -sSf https://api.ipify.org
```
