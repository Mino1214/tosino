# score-crawler (Livesport → 내부 표준 → odds-api.io)

Livesport.com (한국어판) 스코어 페이지를 순회해서 **경기 원본 데이터**를 수집하고,
동시에 **sport 매핑 테이블**을 통해 내부 표준 slug / 현재 provider(odds-api.io) slug 로
자동 매핑하는 **MVP 크롤러**.

## 설계 원칙

- **원본 보존 최우선** — livesport 의 원본 slug / 라벨 / href / 팀명 / 경기 id 등은
  전부 `crawler_*_raw` 테이블에 그대로 남긴다. 나중에 다른 스코어 소스로 교체되어도
  과거 원본을 잃지 않는다.
- **sport slug 3계층 분리**
  1. `source_sport_slug` — livesport 기준 (`soccer`, `hockey`, `mma` …)
  2. `internal_sport_slug` — 우리 내부 표준 (`football`, `ice-hockey`, `mixed-martial-arts` …)
  3. `provider_sport_slug` — 현재 운영중인 배당 공급사(odds-api.io) 기준
     (교체 가능. provider_name 컬럼으로 구분)
- **매칭 포커스 ≠ 수집 범위** — 현재 odds-api.io 가 지원하는 종목은 `is_supported=1`
  로 남고 provider_sport_slug 가 채워진다. 지원되지 않는 종목(`motorsport`,
  `horse-racing` 등)은 `is_supported=0` / `provider_sport_slug=NULL` 로 남기되
  raw 는 그대로 저장한다.
- **SQLite 먼저, MySQL/MariaDB 이후** — 쿼리는 공통 SQL 만 사용한다. DB 이관 시
  `schema.sql` 의 `INTEGER PRIMARY KEY AUTOINCREMENT` → `BIGINT AUTO_INCREMENT
  PRIMARY KEY` 정도만 치환하면 된다.

## 테이블

| 테이블 | 역할 |
| --- | --- |
| `sport_mappings` | livesport↔internal↔provider 매핑. 시드 `mappings.py` 에서 주입. |
| `crawler_matches_raw` | livesport 경기 row 원본. unique key = (source_site, source_sport_slug, source_match_id) |
| `crawler_teams_raw` | livesport 팀 원본. 반복 등장 시 `last_seen_at` 갱신. |
| `crawler_runs` | 크롤러 한 사이클 실행 로그 (시작/종료 시각, status, healthcheck 결과, 집계). |
| `crawler_page_fetches` | 한 run 안에서 종목별 페이지 한 번 방문 로그 (found/saved/duration/error). |

스키마 정의는 `schema.sql` 참고.

## 설치 & 실행 (pnpm 단축 명령)

레포 루트에서 pnpm 한 줄로 돌아갑니다. 내부에서 venv 활성 → `run.py` 호출까지 다 처리됨.

```bash
# Ubuntu/Debian 사전 준비 (최초 1회)
sudo apt install -y python3-venv python3-pip

# 최초 setup — venv 생성 + 의존성 + playwright chromium 다운로드 + .env 복사
pnpm crawler:setup

# 실행 (모든 인자는 run.py 에 그대로 전달됨)
pnpm crawler:run                              # 1회 실행
pnpm crawler:run -- --sports soccer,tennis    # 인자 넘기려면 pnpm 관례대로 -- 구분
pnpm crawler:test                             # == --sports soccer --limit-rows 3 (빠른 sanity)

# 주기 실행
pnpm crawler:loop                             # 기본 420s(약 7분) 간격 루프
pnpm crawler:loop -- --interval-seconds 120   # 간격 조정

# 로그만 조회 (크롤링 X)
pnpm crawler:log

# pm2 백그라운드
pnpm crawler:pm2:start                        # ecosystem.config.js 의 score-crawler 앱 기동
pnpm crawler:pm2:logs
pnpm crawler:pm2:stop
pnpm crawler:pm2:restart

# 셋업 + pm2 기동을 한 줄로
pnpm deploy:crawler
```

### 수동 설치도 가능 (pnpm 없이)

```bash
cd apps/score-crawler
bash scripts/setup.sh       # == pnpm crawler:setup
bash scripts/run.sh --loop  # == pnpm crawler:loop
```

### 안에서 일어나는 일

`scripts/setup.sh` 가 하는 일:
1. `python3` 과 `python3-venv` (ensurepip) 모듈 존재 확인 → 없으면 apt 설치 안내 후 종료
2. `.venv` 없으면 `python3 -m venv .venv` 생성
3. venv 활성 후 `pip install -r requirements.txt`
4. `python -m playwright install chromium` (이미 있으면 skip)
5. `.env` 없으면 `.env.example` 복사

`scripts/run.sh` 가 하는 일:
- `.venv/bin/python` 없으면 setup 자동 호출
- venv 활성화 후 `exec python run.py "$@"` (인자 그대로 전달)

> venv 활성화 상태에서는 `python`/`pip` 가 venv 내부 바이너리를 가리킵니다.
> venv 없이 시스템에서 바로 쓰려면 `python3`/`pip3` 를 사용하세요.

## 실행 예시 요약

| 원하는 동작 | pnpm | 수동 |
| --- | --- | --- |
| 1회 실행 (기본값) | `pnpm crawler:run` | `bash scripts/run.sh` |
| 빠른 sanity (soccer 3 row) | `pnpm crawler:test` | `bash scripts/run.sh --sports soccer --limit-rows 3` |
| 주기 실행 (기본 약 7분 루프) | `pnpm crawler:loop` | `bash scripts/run.sh --loop` (`INTERVAL_SECONDS` / `--interval-seconds`) |
| 로그만 조회 | `pnpm crawler:log` | `bash scripts/run.sh --show-log --log-take 20` |
| pm2 백그라운드 기동 | `pnpm crawler:pm2:start` | `pm2 start ecosystem.config.js --only score-crawler` |
| headful 디버깅 | `pnpm crawler:run -- --headless=false --sports soccer --limit-rows 3` |
| 비지원 종목까지 전부 | `pnpm crawler:run -- --no-only-supported` |

## 동작 방식 (한 사이클)

```
┌──────────────────────────────────────────────────────────────┐
│  crawler_runs row 생성 (status=running)                       │
├──────────────────────────────────────────────────────────────┤
│  1) healthcheck : livesport.com/kr/ goto → http 상태 기록      │
│     (실패 시 run.status=fail 로 종료, 페이지 순회 스킵)        │
├──────────────────────────────────────────────────────────────┤
│  2) 한 개의 탭(Chromium Page) 을 만들어 놓고                    │
│     각 종목 URL 을 goto 로 이동하며 재사용                     │
│     (사이클 내내 탭 하나, 사이클 끝나면 탭/브라우저 닫음)      │
├──────────────────────────────────────────────────────────────┤
│  3) 매 종목마다 crawler_page_fetches 에 로그 한 줄            │
│     status ∈ {ok, empty, fail},                               │
│     rows_found / rows_saved / teams_saved / duration_ms       │
├──────────────────────────────────────────────────────────────┤
│  4) crawler_runs row 업데이트                                 │
│     status ∈ {ok, partial, fail}                              │
│     + 합계 집계 (pages_ok/pages_fail/matches_saved/...)       │
└──────────────────────────────────────────────────────────────┘
```

`--loop` 모드에서는 위 한 사이클이 끝나고 `--interval-seconds` 만큼 sleep 한 뒤
Ctrl+C 할 때까지 반복. 사이클 도중 예외가 터져도 최외곽 try/except 로 잡아서
다음 사이클을 이어간다.

실행 결과 예시 (요약):

```
[score-crawler] sport_mappings upserted: 34
[score-crawler] targets (13/13): football, baseball, basketball, …

[score-crawler] → football (SUPPORTED) internal=football provider=football
[score-crawler]   · url=… rows=80
[score-crawler]   · saved matches=80 teams=160
...

[score-crawler] ── summary ──
  sport_mappings:           34 (supported=25)
  crawler_matches_raw:     800+
  crawler_teams_raw:      1600+
```

## CLI 옵션

| 옵션 | 기본값 | 설명 |
| --- | --- | --- |
| `--db-url` | `sqlite:///./score-crawler.db` | 저장소 URL. 현재는 sqlite 만 지원 |
| `--source-site` | `livesport` | `sport_mappings.source_site` 에 기록될 값 |
| `--provider-name` | `odds-api.io` | 현재 매핑 provider 식별자 |
| `--sports` | — | 콤마 구분 livesport slug 목록을 직접 지정 |
| `--only-supported` / `--no-only-supported` | on | odds-api.io 매칭 가능 종목만 수집할지 여부 |
| `--limit-pages` | `0` | 순회할 페이지(종목) 개수 상한 (**0 이하 = 지원 primary 종목 전부**) |
| `--limit-rows` | `250` | 종목 페이지당 저장할 경기 상한 (aiscore 는 스크롤 합산) |
| `--scroll-passes` | `12` | aiscore: 초기 워밍 스크롤 횟수 |
| `--scroll-collect-rounds` | `160` | aiscore: 가상 리스트 스크롤·스캔 최대 라운드 |
| `--headless` | `true` | `false` 주면 브라우저 창 열고 디버깅 |
| `--nav-timeout-ms` | `30000` | 페이지 네비게이션 타임아웃 |
| `--wait-after-load-ms` | `1500` | 초기 렌더링 이후 추가 대기 시간 |
| `--loop` | off | 켜면 interval-seconds 주기로 계속 실행 (Ctrl+C 종료) |
| `--interval-seconds` | `420` | `--loop` 사이클 간 sleep 초 |
| `--skip-healthcheck` | off | 사이클 시작 헬스체크 스킵 |
| `--show-log` | off | 크롤링 안 돌리고 최근 run/page 로그만 출력 |
| `--log-take` | `10` | `--show-log` 시 보여줄 run 개수 |

## 매핑 시드 (mappings.py)

크롤링 대상 / 내부 표준 / odds-api.io 매칭을 한 파일에서 관리한다.

- `LIVESPORT_SPORTS` — livesport URL slug + 한국어 라벨 + primary/secondary 우선순위.
- `INTERNAL_SPORT_FOR_LIVESPORT` — livesport slug → 내부 표준 slug 사전.
- `ODDS_API_SPORTS` — odds-api.io 가 현재 지원하는 (name, slug) 목록.
- `build_sport_mapping_rows()` — 위 세 가지를 조합해 sport_mappings 시드 row 를 생성.

예시 매핑:

- `livesport / soccer / 축구 / football / odds-api.io / football / Football / true`
- `livesport / hockey / 하키(아이스) / ice-hockey / odds-api.io / ice-hockey / Ice Hockey / true`
- `livesport / mma / MMA / mixed-martial-arts / odds-api.io / mixed-martial-arts / MMA / true`
- `livesport / motorsport / 모터스포츠 / motorsport / odds-api.io / NULL / NULL / false`
  (secondary-priority, provider matching deferred)
- `livesport / rugby-union / 럭비 유니언 / rugby-union / odds-api.io / NULL / NULL / false`
  (rugby union/league split — internal schema TBD)

## DB 이관 (sqlite → mysql/mariadb)

1. `schema.sql` 에서 `INTEGER PRIMARY KEY AUTOINCREMENT` →
   `BIGINT AUTO_INCREMENT PRIMARY KEY` 로 치환.
2. `TEXT` 는 MySQL 에서도 유효하지만 VARCHAR 를 선호한다면 `VARCHAR(191)` 등으로 치환.
3. `db.py` 의 `connect()` / `upsert_*` 를 sqlalchemy 로 치환 (ON CONFLICT → `ON
   DUPLICATE KEY UPDATE`) — 지금은 MVP 라 raw sqlite3 사용.
4. `DB_URL` 환경변수만 바꾸면 CLI 는 그대로 동작.

## 테스트 흐름 (빠른 sanity)

```bash
# 1) 설치
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
playwright install chromium

# 2) 지원 종목 3개만 소량으로 sqlite 에 저장 (스모크)
python run.py --sports soccer,basketball,tennis --limit-pages 3 --limit-rows 10

# 3) DB 확인
sqlite3 score-crawler.db \
  "SELECT source_sport_slug, internal_sport_slug, provider_sport_slug, is_supported
     FROM sport_mappings ORDER BY source_sport_slug LIMIT 20;"

sqlite3 score-crawler.db \
  "SELECT source_sport_slug, raw_home_name, raw_away_name, raw_kickoff_text
     FROM crawler_matches_raw ORDER BY fetched_at DESC LIMIT 10;"
```

## Livesport DOM 주의

- Livesport 는 SPA 여서 `requests` + `bs4` 로는 빈 HTML 만 돌아온다.
  반드시 Playwright/Chromium 사용.
- DOM 은 수시로 바뀌므로 `livesport_parser.py` 의 selector 는
  `.event__match`, `a.event__match`, `[id^="g_"]` 등을 **다중 fallback** 으로 시도한다.
  selector 하나가 바뀌어도 다른 쪽에서 잡히도록 설계.
- 쿠키 동의 배너(OneTrust 등)는 가능한 한 자동으로 닫지만 차단돼도 나머지 수집은 계속 진행.

## 다음 단계 (미구현 / 추후)

- livesport 경기 상세 페이지 진입해서 최종 스코어/기간별 스코어 추출
- odds-api.io 의 `OddsApiDisplayWhitelist` 엔드포인트로 whitelist 자동 전송
  (api/`POST /integrations/odds-api-whitelist/bulk-replace`, `x-integration-key` 헤더)
- mysql/mariadb 이관 (sqlalchemy / alembic)
- 팀 로고/href 파싱 (현재는 이름만 upsert)
- 지역/리그/국가 파싱
