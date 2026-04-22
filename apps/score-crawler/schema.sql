-- ──────────────────────────────────────────────────────────────────────────
-- score-crawler / livesport raw + sport mapping 스키마 (SQLite 우선)
--
-- 설계 원칙:
--   * source(livesport) 원본 값은 무조건 그대로 보존한다.
--   * 내부 표준 sport slug 는 별도로 관리한다 (internal_sport_slug).
--   * 현재 provider(odds-api.io) 매핑은 단순한 mapping row 일 뿐,
--     provider 는 나중에 다른 API 로 교체될 수 있다 (provider_name 으로 구분).
--   * SQL 방언은 SQLite / MySQL / MariaDB 간 공통으로 동작하도록 작성한다
--     (AUTOINCREMENT 만 SQLite 방언. MySQL 이관 시 AUTO_INCREMENT 로 치환).
-- ──────────────────────────────────────────────────────────────────────────

-- ── sport_mappings ────────────────────────────────────────────────────────
--   livesport sport page slug ↔ 내부 표준 ↔ provider(odds-api.io) 매핑 테이블.
--
--   예) livesport / soccer / 축구 / football / odds-api.io / football / Football / true
CREATE TABLE IF NOT EXISTS sport_mappings (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  source_site           TEXT NOT NULL,
  source_sport_slug     TEXT NOT NULL,
  source_sport_name     TEXT,
  internal_sport_slug   TEXT NOT NULL,
  provider_name         TEXT,
  provider_sport_slug   TEXT,
  provider_sport_name   TEXT,
  is_supported          INTEGER NOT NULL DEFAULT 0,
  note                  TEXT,
  created_at            TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (source_site, source_sport_slug, provider_name)
);

CREATE INDEX IF NOT EXISTS idx_sport_mappings_internal
  ON sport_mappings (internal_sport_slug);
CREATE INDEX IF NOT EXISTS idx_sport_mappings_provider
  ON sport_mappings (provider_name, provider_sport_slug);

-- ── crawler_matches_raw ───────────────────────────────────────────────────
--   livesport 원본 경기 row. 가공/매핑은 별도 단계에서 진행하되, 원본은 반드시 남긴다.
CREATE TABLE IF NOT EXISTS crawler_matches_raw (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,

  -- source 원본
  source_site           TEXT NOT NULL,
  source_sport_slug     TEXT NOT NULL,
  source_url            TEXT NOT NULL,
  source_match_id       TEXT,             -- ex) g_1_ABC123XY (livesport 내부 id)
  source_match_href     TEXT,             -- 상세 페이지 href
  raw_sport_label       TEXT,             -- 페이지에서 추출된 종목 라벨 (존재 시)

  -- 내부/provider 매핑 스냅샷
  internal_sport_slug   TEXT,
  provider_name         TEXT,
  provider_sport_slug   TEXT,

  -- 원본 경기 필드
  raw_home_name         TEXT,
  raw_home_slug         TEXT,
  raw_away_name         TEXT,
  raw_away_slug         TEXT,
  raw_league_label      TEXT,
  raw_league_slug       TEXT,              -- livesport 리그 href 에서 뽑은 슬러그 (ex: south-korea/k-league-1)
  raw_country_label     TEXT,              -- "대한민국", "잉글랜드" 등 국가 헤더 텍스트
  raw_kickoff_text      TEXT,
  raw_kickoff_utc       TEXT,              -- ISO UTC (kickoff_text + KST 가정 파싱 결과)
  raw_score_text        TEXT,
  raw_status_text       TEXT,

  -- 기타 디버그용 원본 페이로드 (json 문자열)
  raw_payload_json      TEXT,

  fetched_at            TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE (source_site, source_sport_slug, source_match_id)
);

CREATE INDEX IF NOT EXISTS idx_matches_raw_source_sport
  ON crawler_matches_raw (source_site, source_sport_slug);
CREATE INDEX IF NOT EXISTS idx_matches_raw_internal_sport
  ON crawler_matches_raw (internal_sport_slug);
CREATE INDEX IF NOT EXISTS idx_matches_raw_fetched_at
  ON crawler_matches_raw (fetched_at);

-- ── crawler_teams_raw ─────────────────────────────────────────────────────
--   livesport 원본 팀 row. 동일 팀 여러 번 수집되면 last_seen_at 만 갱신한다.
CREATE TABLE IF NOT EXISTS crawler_teams_raw (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,

  source_site           TEXT NOT NULL,
  source_sport_slug     TEXT NOT NULL,
  internal_sport_slug   TEXT,

  raw_team_name         TEXT NOT NULL,
  source_team_slug      TEXT,
  raw_team_href         TEXT,
  raw_team_logo         TEXT,

  first_seen_at         TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at          TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE (source_site, source_sport_slug, raw_team_name)
);

CREATE INDEX IF NOT EXISTS idx_teams_raw_source_sport
  ON crawler_teams_raw (source_site, source_sport_slug);
CREATE INDEX IF NOT EXISTS idx_teams_raw_internal_sport
  ON crawler_teams_raw (internal_sport_slug);

-- ── crawler_runs ──────────────────────────────────────────────────────────
--   한 번의 크롤러 실행 사이클(헬스체크 → 페이지 순회 → 요약) 을 대표하는 로그 row.
--   --loop 모드에서는 사이클마다 한 건씩 추가된다.
CREATE TABLE IF NOT EXISTS crawler_runs (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  source_site           TEXT NOT NULL,
  provider_name         TEXT,
  trigger_mode          TEXT NOT NULL,          -- 'once' | 'loop'
  status                TEXT NOT NULL,          -- 'running' | 'ok' | 'fail' | 'partial'
  healthcheck_status    TEXT,                   -- 'ok' | 'fail' | 'skip'
  healthcheck_http      INTEGER,
  healthcheck_note      TEXT,
  target_sports_json    TEXT,                   -- json array of livesport slugs
  limit_pages           INTEGER,
  limit_rows_per_page   INTEGER,
  only_supported        INTEGER,
  pages_total           INTEGER NOT NULL DEFAULT 0,
  pages_ok              INTEGER NOT NULL DEFAULT 0,
  pages_fail            INTEGER NOT NULL DEFAULT 0,
  pages_empty           INTEGER NOT NULL DEFAULT 0,
  matches_saved         INTEGER NOT NULL DEFAULT 0,
  teams_saved           INTEGER NOT NULL DEFAULT 0,
  error_text            TEXT,
  started_at            TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at           TEXT,
  duration_ms           INTEGER
);

CREATE INDEX IF NOT EXISTS idx_runs_started
  ON crawler_runs (started_at DESC);
CREATE INDEX IF NOT EXISTS idx_runs_status
  ON crawler_runs (status);

-- ── crawler_page_fetches ──────────────────────────────────────────────────
--   한 run 안에서 개별 livesport sport 페이지 한 번 방문에 대한 로그.
CREATE TABLE IF NOT EXISTS crawler_page_fetches (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id                INTEGER NOT NULL,
  source_site           TEXT NOT NULL,
  source_sport_slug     TEXT NOT NULL,
  source_url            TEXT NOT NULL,
  internal_sport_slug   TEXT,
  provider_sport_slug   TEXT,
  is_supported          INTEGER NOT NULL DEFAULT 0,
  status                TEXT NOT NULL,          -- 'ok' | 'empty' | 'fail'
  rows_found            INTEGER NOT NULL DEFAULT 0,
  rows_saved            INTEGER NOT NULL DEFAULT 0,
  teams_saved           INTEGER NOT NULL DEFAULT 0,
  error_text            TEXT,
  started_at            TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at           TEXT,
  duration_ms           INTEGER,
  FOREIGN KEY (run_id) REFERENCES crawler_runs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_page_fetches_run
  ON crawler_page_fetches (run_id);
CREATE INDEX IF NOT EXISTS idx_page_fetches_sport
  ON crawler_page_fetches (source_site, source_sport_slug);
CREATE INDEX IF NOT EXISTS idx_page_fetches_started
  ON crawler_page_fetches (started_at DESC);
