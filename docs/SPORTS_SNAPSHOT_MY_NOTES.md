# 스포츠 스냅샷(sports-live / sports-prematch) — 정리 노트

이 문서는 **DB에 무엇이 어떤 형태로 저장되는지**, **어떤 HTTP로 읽고 쓰는지**, **솔루션 웹이 무엇을 호출하는지**를 한곳에 모은 참고용입니다.  
데모 시드의 일정 앵커는 **`2026-04-13 02:05` (Asia/Seoul)** 입니다 (`apps/api/prisma/seed.ts`의 `SEED_SPORTS_SCHEDULE_ANCHOR`).

---

## 1. DB 모델

- 테이블: **`SportsOddsSnapshot`** (`schema.prisma`)
- 한 플랫폼당 **`(platformId, sourceFeedId)` 유일**.
- 주요 컬럼:
  - `sourceFeedId`: 예) `sports-live`, `sports-prematch`, 또는 `integrationsJson.sportsFeeds[].id`
  - `sportLabel`, `market`: 메타(피드별 배당 스텁 등에 사용)
  - **`payloadJson`**: 실제 스냅샷 본문(JSON)
  - **`fetchedAt`**: 이 스냅샷을 “가져온 시각”으로 쓰는 타임스탬프

---

## 2. 저장 형식(스냅샷 본문)

### 2.1 `sports-live` (인플레이 목록)

- **권장·코드 일치 형태**: `payloadJson` = **`{ "games": [ SportsLiveGame, ... ] }`**
- `SyncService.upsertSportsLive` / `OddsIngestService`(OddsHost 인플레이) 모두 이렇게 저장합니다.
- 업로드 API 바디는 **`game`** 또는 **`games`** 배열을 받아 내부에서 항상 **`{ games }`** 로 정규화합니다.

경기 객체(`SportsLiveGame`)는 솔루션 타입 `SportsLiveGameDto`와 동일 계열 필드를 씁니다. 예:

- `game_id`, `status` (`'1'` 등 인플레이), `start_ts` (로컬 표기 문자열 `"YYYY-MM-DD HH:mm:ss"`),
- `competition_*`, `team` (길이 2 배열: `team1_*`, `team2_*`),
- `location`, `round`, `series`, `score`, `update_time`(ISO 권장),
- 인플레이 시 `timer`: `{ time_mark, time_mark_kor }`
- (선택) 솔루션 카드용 **`live_ui_url`**: 라이브·배당 북 UI 등 외부 링크(시드는 `https://example.com/...` 플레이스홀더).
- (선택) **`odds_1x2`**: `{ "home": "2.10", "draw": "3.25", "away": "2.95" }` — 있으면 승무패 행에 표시, 없으면 UI가 동일 형식의 안내용 기본값을 씀.

### 2.2 `sports-prematch` (프리매치 테스트 스냅샷)

- `SyncService.upsertSportsPrematch`는 요청 **바디 전체**를 그대로 `payloadJson`에 넣습니다.
- 솔루션 UI는 `extractSportsLiveGamesFromPayload`로 **`payload.game`** 또는 **`payload.games`** 배열만 꺼냅니다.
- **시드·권장 형태**: **`{ "games": [ 동일 스키마의 경기, ... ] }`** — `sports-live`와 키를 맞추면 운영·문서 모두 단순해집니다.
- (과거 시드는 `game` 단일 키였음 → 둘 다 UI에서 동작)

---

## 3. 공개 API — 읽기(GET)

호스트는 `PublicPlatformResolveService`가 `host` / `port` / `previewSecret` 쿼리로 플랫폼을 결정합니다.

### 3.1 `GET /public/sports-live`

- DB: `sourceFeedId = 'sports-live'` 인 행 1건(최신 `fetchedAt` 기준은 컨트롤러에서 `findFirst` + `orderBy: fetchedAt desc`).
- `payloadJson`에서 **`games`** 없으면 **`game`** 배열을 폴백합니다.

**응답 예시 형태:**

```json
{
  "success": 1,
  "total": 2,
  "fetchedAt": "2026-04-12T17:05:00.000Z",
  "game": [ { "game_id": "…", "status": "1", "start_ts": "…", "team": [ …, … ], … } ]
}
```

- 주의: DB에는 `games`로 넣어도, **응답 필드명은 항상 `game`** 입니다(배열 본문).

### 3.2 `GET /public/sports-prematch`

- DB: `sourceFeedId = 'sports-prematch'`.

**응답 형태:**

```json
{
  "fetchedAt": "2026-04-12T17:05:00.000Z",
  "payload": { "games": [ … ] }
}
```

- `payload`가 `null`이면 아직 스냅샷 없음.

### 3.3 (참고) `GET /public/sports-odds`

- 해당 플랫폼의 **모든** `SportsOddsSnapshot` 목록을 `feeds[]`로 반환합니다(배당 데모 스텁 피드 + sports-live 등).

---

## 4. 관리자 API — 쓰기(POST, JWT)

경로 prefix: **`/api/platforms/:platformId/sync`** (실제 글로벌 prefix는 Nest 설정 따름).

| 메서드 | 경로 | 바디 | DB 반영 |
|--------|------|------|---------|
| POST | `…/sync/sports-live` | `{ "games": [...] }` 또는 `{ "game": [...] }` | `payloadJson = { games }`, `fetchedAt` 갱신 |
| POST | `…/sync/sports-prematch` | 임의 JSON (보통 `{ "games": [...] }`) | `payloadJson = body`, `fetchedAt` 갱신 |

- 권한: `SUPER_ADMIN` 또는 해당 플랫폼 `PLATFORM_ADMIN`.
- 응답: `sports-live`는 `{ ok, total, fetchedAt }`, `sports-prematch`는 `{ ok, fetchedAt }`.

---

## 5. 자동 수집(OddsHost → sports-live)

- 서비스: `OddsIngestService.ingestPlatformOdds`
- ODDS 동기화(크론/스텁 트리거 등) 시, 환경변수로 OddsHost 인플레이 URL이 잡혀 있으면 업스트림에서 받은 JSON의 **`game`** 배열을 **`{ games }`** 로 변환해 `sports-live`에 upsert합니다.
- 프리매치는 이 경로에서 자동 채우지 않고, **POST `sports-prematch`** 또는 **시드**로 채우는 구조입니다.

---

## 5.1 OddsHost — 오즈마켓 · 프리매치 스페셜

벤더 가이드 URL 형식(예시 호스트 `api.oddshost.com`, 경로 `1xb`).  
`.env` 템플릿에는 아래 `[key]`·`[id]`·`[yyyymmdd]` 자리에 각각 **`{key}` `{sport}` `{game_id}` `{date}`** 플레이스홀더를 씁니다. (`apps/api` 의 `expandOddsHostUrlTemplate`)

| 구분 | 용도 | 벤더 URL (문서 기준) |
|------|------|----------------------|
| Inplay | 라이브 목록(전체 경기) | `http://api.oddshost.com/inplay/1xb/?token=[key]&sport=[id]` |
| Inplay | 라이브 게임(한 경기) | `http://api.oddshost.com/inplay/1xb/?token=[key]&sport=[id]&game_id=[id]` |
| Prematch | 베이직(전체 경기, `date` 필수) | `http://api.oddshost.com/prematch/1xb/?token=[key]&sport=[id]&date=[yyyymmdd]` |
| Prematch | 스페셜(전체 경기) | 위와 동일 + `&special=1` — 솔루션 `프리매치(스페셜)` 탭이 프록시에 `special=1` 자동 부착 |
| Prematch | 프로(한 경기) | `http://api.oddshost.com/prematch/1xb/?token=[key]&sport=[id]&game_id=[id]` |

- **`GET /public/oddshost/markets?sport=1&host=…&oddshostSecret=…`**  
  - 서버에 **`ODDSHOST_TEMPLATE_MARKETS`** 또는 **`ODDSHOST_BASE_URL` + `ODDSHOST_PATH_MARKETS`** 가 있어야 합니다.  
  - Wix 등 **홍보용 HTML 페이지 URL이 아니라**, API 가이드에 나온 **JSON 엔드포인트**를 넣어야 합니다.  
  - 그 외 쿼리는 프리매치와 같이 업스트림으로 전달됩니다(예: `date` 등).
- **스페셜 플랜**: 기존 **`GET /public/oddshost/prematch`** 호출에 쿼리 **`special=1`** 을 붙이면 됩니다. 솔루션 `/lobby/sports?tab=pmspecial` 탭에서 자동으로 붙여 호출합니다.

---

## 6. 솔루션 웹(`solution-web`) 호출

- **`fetchSportsLive(host)`** → `GET ${API}/public/sports-live?${host쿼리}`  
  - 반환 타입: `{ success, total, fetchedAt, game }`
- **`fetchSportsPrematchSnapshot(host)`** → `GET ${API}/public/sports-prematch?…`  
  - 반환: `{ fetchedAt, payload }` → 카드 목록은 `extractSportsLiveGamesFromPayload(payload)`
- 스포츠 허브(`SportsHubClient`)는 **데모 카드 모드가 아닐 때** 마운트 직후 라이브·프리매치를 **둘 다** 요청해, 실시간 탭에 머물다가 프리매치로 바꿔도 목록이 비지 않게 함.
- 탭 **`프리매치(스페셜)`** / **`오즈마켓`**: 각각 `prematch?special=1`, `oddshost/markets` 프록시를 호출합니다. 응답이 `game`/`games` 배열이면 카드로 매핑하고, 아니면 본문만 **원문 JSON**(`feedAppend`)으로 확인합니다.
- 개발/운영자 UI에서 OddsHost 직접: `fetchOddsHostPrematch`, `fetchOddsHostInplayList` 등은 **DB가 아니라** 프록시 경유 실시간 호출.

---

## 7. 시드로 DB 채우기

- 함수: `ensureDemoSportsBroadcastSnapshots(platformId)` (`prisma/seed.ts`)
- **데모 플랫폼**에 대해 `sports-live` / `sports-prematch`가 비어 있을 때만 채움(각각 독립 판단).
- **강제 덮어쓰기**: 환경변수 **`SEED_FORCE_SPORTS_SNAPSHOTS=1`** (또는 `true`/`yes`/`on`).
- 실행: 저장소 루트에서 **`pnpm db:seed`** (또는 `@tosino/api`에서 `prisma db seed`).

시드 내용:

- **일정 앵커**: `2026-04-13T02:05:00+09:00` → 라이브 `start_ts`는 그 이전 같은 날, 프리매치는 **4/13 이후** 시간대 다수.
- **프리매치**: `demoPrematchSlots()` 기준 **20경기** 근처(리그·국가 혼합).

---

## 8. 빠른 검증용 curl (호스트는 환경에 맞게)

```bash
# 스냅샷 읽기 (플랫폼은 host로 해석)
curl -sS "https://YOUR_API/public/sports-live?host=demo.example.com"
curl -sS "https://YOUR_API/public/sports-prematch?host=demo.example.com"
```

업로드는 JWT가 필요하므로 로그인 후 `Authorization: Bearer …` 를 붙여 `POST …/platforms/{platformId}/sync/sports-live` 등을 호출합니다.

---

## 부록: OddsHost `sport` ID와 `name_kr`이 `??`로 보일 때

- **이 리포지토리는 벤더의 “모든 스포츠 ID”를 자동으로 긁어서 DB에 넣지 않습니다.**  
  서버 ingest는 환경변수 **`ODDSHOST_INGEST_SPORT`** 에 넣은 **한 개** ID만 인플레이 목록 요청에 사용합니다(기본값 `1`).
- 질문에 적어 주신 표의 `name_kor`가 **`??`·`e???. ?`처럼 깨져 보이면**, 대개 **원본 문서/엑셀을 UTF-8이 아닌 인코딩으로 연 경우**이거나, 복사 과정에서 한글이 깨진 것입니다. 벤더 PDF·가이드 원문을 UTF-8으로 다시 저장해 보세요.

참고용 한글 표기(코드: `@tosino/shared`의 `ODDSHOST_SPORT_ID_NAME_KR` — **업체 문서와 다르면 문서 기준으로 맵만 수정**):

| Sport id | name_kr (참고) |
|----------|----------------|
| 1 | 축구 |
| 2 | 농구 |
| 3 | 야구 |
| 4 | 아이스하키 |
| 5 | 테니스 |
| 6 | 배구 |
| 7 | 탁구 |
| 11 | E스포츠 · 리그 오브 레전드 |
| 12 | E스포츠 · 스타크래프트 |
| 13 | E스포츠 · 카운터스트라이크 |
| 301 | 가상축구 |
| 302 | 가상농구 |
| 400 | 스페셜/통합(벤더 정의) |

전체 ID를 코드에 박아 두려면 벤더가 주는 **종목 마스터 API 또는 CSV**를 UTF-8로 받아 `ODDSHOST_SPORT_ID_NAME_KR`에 합치면 됩니다.
