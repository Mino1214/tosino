# 서버 배포 — 한 사이클 매뉴얼

> 배포 대상: prod 서버 (pm2 + docker-compose 로 Postgres/Redis 구성).  
> 목적: 이번 개편을 배포하고, 불필요한 데이터는 비우고, 크롤 한 사이클 → 매칭 한 사이클 → 확인까지.

---

## 0. 사전 준비

```bash
# 서버 터미널에서
cd /opt/tosino            # 실 운영 경로에 맞춰 조정
git fetch --all
git checkout <배포브랜치>
git pull --ff-only
```

## 1. 인프라(Postgres + Redis) 기동

이미 떠 있으면 스킵. 죽어있는 경우만:

```bash
pnpm db:up                # docker-compose up -d (postgres, redis)
```

## 2. 앱 빌드 + 마이그레이션 + 배포 (한 줄)

```bash
pnpm install
pnpm deploy:all           # install+build+prisma migrate+pm2 reload (모든 Next 앱 + api + matcher-worker)
```

- 이 명령은 `pnpm db:migrate:deploy` 를 포함합니다. 새 migration 이 없다면 빠르게 끝납니다.
- API 만 바꿨을 때는 `pnpm deploy:api` 로 충분합니다.

## 3. 데이터 정리 (서버 DB 한정)

> "기존 데이터 중 리그 이름 매핑(`CrawlerLeagueMapping`) 만 남기고 나머지 크롤/배당 데이터는 전부 비운다."
> 로컬 DB 는 건드리지 않습니다.

아래 파일을 서버로 전송 후 실행:

```bash
# repo 내 경로
cat apps/api/prisma/sql/reset-crawler-and-odds.sql
```

실행 예시 (docker compose):
```bash
docker exec -i tosino-postgres-1 psql -U postgres -d tosino \
  < apps/api/prisma/sql/reset-crawler-and-odds.sql
```

## 4. 크롤러 한 사이클 실행

```bash
# 필요 시 Python 환경 세팅 (최초 1회)
pnpm crawler:setup

# 한 사이클만 돌리기 (SCROLL_PASSES 등은 apps/score-crawler/.env 값 사용)
pnpm crawler:run

# 백그라운드 PM2 로 돌리려면
pnpm crawler:pm2:start
pnpm crawler:pm2:logs
```

`apps/score-crawler/.env` 기본값:
- `SPORTS=football,baseball,basketball,volleyball,ice-hockey,american-football,tennis,esports`
- `SCROLL_PASSES=30`, `SCROLL_COLLECT_ROUNDS=600`, `WAIT_AFTER_LOAD_MS=3500`

## 5. 매칭 워커 확인 / 수동 실행

크롤러가 ingest 를 끝내면 `crawler-matcher` Bull 큐에 자동으로 스케줄 잡이 들어갑니다.

```bash
pm2 logs crawler-matcher-worker --lines 200
```

수동으로 한 번 더 돌리고 싶으면 super-admin → "크롤 콘솔" 페이지 우측 상단의 '새로고침' + 기존 `/hq/crawler/matches/run-matcher` POST 로도 가능합니다.

## 6. 최종 확인

```bash
# API status
curl -sS https://<도메인>/api/public/odds-api-ws/status | jq .
# 매칭된 경기 수
docker exec -i tosino-postgres-1 psql -U postgres -d tosino -c \
  "SELECT COUNT(*) FROM \"CrawlerMatchMapping\" WHERE \"providerExternalEventId\" IS NOT NULL;"
```

super-admin → "크롤 콘솔" 탭에서:
- WS 연결: `connected`
- 최근 스냅샷 시각이 최신
- 매칭 리스트에 최근 사이클의 경기들이 나와야 정상.

---

## 참고 — 롤백

```bash
git reset --hard <이전-sha>
pnpm deploy:all
```

migration 롤백은 `pnpm --filter @tosino/api exec prisma migrate resolve` 로 처리. 이번 배포는 신규 migration 이 없으므로 단순 pm2 reload 로 복귀 가능합니다.
