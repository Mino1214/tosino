"""
score-crawler 저장소 레이어.

─────────────────────────────────────────────────────────────────────────────
* 1차 백엔드: SQLite3 (파일 기반, 테스트 편의)
* 이후 mysql/mariadb 이관 시:
    - sqlite:// 대신 mysql://... 로 DB_URL 을 바꾸고
    - INTEGER PRIMARY KEY AUTOINCREMENT -> BIGINT AUTO_INCREMENT PRIMARY KEY
    - CURRENT_TIMESTAMP 기본값은 양쪽 공통
  만 처리하면 된다. 쿼리 자체는 표준 SQL 범위만 사용.
─────────────────────────────────────────────────────────────────────────────
"""

from __future__ import annotations

import json
import os
import sqlite3
from pathlib import Path
from typing import Iterable, Optional

from mappings import build_aiscore_sport_mapping_rows, build_sport_mapping_rows


SCHEMA_FILE = Path(__file__).with_name("schema.sql")


def _parse_sqlite_path(db_url: str) -> str:
    """sqlite:///./x.db 형태의 URL 에서 파일 경로만 꺼낸다."""
    prefix = "sqlite:///"
    if not db_url.startswith(prefix):
        raise ValueError(
            f"현재 MVP 는 sqlite URL 만 지원합니다: {db_url!r} "
            "(예: sqlite:///./score-crawler.db)"
        )
    return db_url[len(prefix):]


def connect(db_url: Optional[str] = None) -> sqlite3.Connection:
    url = db_url or os.environ.get("DB_URL") or "sqlite:///./score-crawler.db"
    path = _parse_sqlite_path(url)
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def init_schema(conn: sqlite3.Connection) -> None:
    sql = SCHEMA_FILE.read_text(encoding="utf-8")
    conn.executescript(sql)
    _migrate_add_missing_columns(conn)
    _migrate_crawler_matches_raw_locale(conn)
    conn.commit()


def _migrate_add_missing_columns(conn: sqlite3.Connection) -> None:
    """기존 DB 에 새로 추가된 컬럼이 있으면 ALTER TABLE 로 붙인다.

    sqlite 는 CREATE TABLE IF NOT EXISTS 에서 "컬럼만 추가" 를 못 하므로
    schema.sql 에 컬럼을 추가한 경우엔 여기서 따로 ALTER 를 실행한다.
    """
    desired = {
        "crawler_matches_raw": {
            "raw_kickoff_utc": "TEXT",
            "raw_league_slug": "TEXT",
            "raw_country_label": "TEXT",
            "raw_country_flag": "TEXT",
            "raw_league_logo": "TEXT",
            "raw_home_logo": "TEXT",
            "raw_away_logo": "TEXT",
        },
    }
    for table, cols in desired.items():
        existing = {
            row[1]
            for row in conn.execute(f"PRAGMA table_info({table})").fetchall()
        }
        for col, ddl in cols.items():
            if col not in existing:
                conn.execute(f"ALTER TABLE {table} ADD COLUMN {col} {ddl}")


def _migrate_crawler_matches_raw_locale(conn: sqlite3.Connection) -> None:
    """UNIQUE 에 source_locale 을 넣기 위해 테이블 재작성 (기존 row 는 모두 ko)."""
    cur = conn.execute(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name='crawler_matches_raw'"
    ).fetchone()
    if not cur:
        return
    cols = {
        row[1]
        for row in conn.execute("PRAGMA table_info(crawler_matches_raw)").fetchall()
    }
    if "source_locale" in cols:
        return
    conn.execute("PRAGMA foreign_keys=OFF")
    conn.execute("ALTER TABLE crawler_matches_raw RENAME TO crawler_matches_raw_old")
    old_info = conn.execute("PRAGMA table_info(crawler_matches_raw_old)").fetchall()
    col_defs: list[str] = []
    for _cid, name, ctype, notnull, dflt, pk in old_info:
        t = (ctype or "TEXT").strip() or "TEXT"
        if int(pk or 0) == 1:
            col_defs.append(f'    "{name}" INTEGER PRIMARY KEY AUTOINCREMENT')
        else:
            nn = " NOT NULL" if notnull else ""
            dcl = ""
            if dflt is not None and str(dflt).strip() != "":
                dcl = f" DEFAULT {dflt}"
            col_defs.append(f'    "{name}" {t}{nn}{dcl}')
    col_defs.append('    source_locale TEXT NOT NULL DEFAULT \'ko\'')
    cols_sql = ",\n".join(col_defs)
    conn.executescript(
        f"""
CREATE TABLE crawler_matches_raw (
{cols_sql},
    UNIQUE (source_site, source_sport_slug, source_match_id, source_locale)
);
"""
    )
    old_names = [r[1] for r in old_info]
    qold = ", ".join(f'"{n}"' for n in old_names)
    conn.execute(
        f'INSERT INTO crawler_matches_raw ({qold}, "source_locale") '
        f"SELECT {qold}, 'ko' FROM crawler_matches_raw_old"
    )
    conn.execute("DROP TABLE crawler_matches_raw_old")
    conn.executescript(
        """
CREATE INDEX IF NOT EXISTS idx_matches_raw_source_sport
  ON crawler_matches_raw (source_site, source_sport_slug);
CREATE INDEX IF NOT EXISTS idx_matches_raw_internal_sport
  ON crawler_matches_raw (internal_sport_slug);
CREATE INDEX IF NOT EXISTS idx_matches_raw_fetched_at
  ON crawler_matches_raw (fetched_at);
"""
    )
    conn.execute("PRAGMA foreign_keys=ON")


def seed_sport_mappings(
    conn: sqlite3.Connection,
    source_site: str = "livesport",
    provider_name: str = "odds-api.io",
) -> int:
    # aiscore 는 URL 슬러그가 livesport 와 달라서(`football` vs `soccer`) 별도 카탈로그.
    if source_site == "aiscore":
        rows = build_aiscore_sport_mapping_rows(
            source_site=source_site, provider_name=provider_name
        )
    else:
        rows = build_sport_mapping_rows(
            source_site=source_site, provider_name=provider_name
        )
    upserted = 0
    for r in rows:
        cur = conn.execute(
            """
            INSERT INTO sport_mappings (
                source_site, source_sport_slug, source_sport_name,
                internal_sport_slug, provider_name,
                provider_sport_slug, provider_sport_name,
                is_supported, note
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(source_site, source_sport_slug, provider_name)
            DO UPDATE SET
                source_sport_name    = excluded.source_sport_name,
                internal_sport_slug  = excluded.internal_sport_slug,
                provider_sport_slug  = excluded.provider_sport_slug,
                provider_sport_name  = excluded.provider_sport_name,
                is_supported         = excluded.is_supported,
                note                 = excluded.note,
                updated_at           = CURRENT_TIMESTAMP
            """,
            (
                r["source_site"],
                r["source_sport_slug"],
                r["source_sport_name"],
                r["internal_sport_slug"],
                r["provider_name"],
                r["provider_sport_slug"],
                r["provider_sport_name"],
                r["is_supported"],
                r["note"],
            ),
        )
        upserted += cur.rowcount or 0
    conn.commit()
    return upserted


def resolve_mapping(
    conn: sqlite3.Connection,
    source_site: str,
    source_sport_slug: str,
    provider_name: str,
) -> Optional[dict]:
    """sport_mappings 에서 (site, sport, provider) 조합의 매핑 스냅샷을 조회."""
    row = conn.execute(
        """
        SELECT source_sport_slug, source_sport_name,
               internal_sport_slug, provider_name,
               provider_sport_slug, provider_sport_name,
               is_supported, note
          FROM sport_mappings
         WHERE source_site = ?
           AND source_sport_slug = ?
           AND provider_name = ?
         LIMIT 1
        """,
        (source_site, source_sport_slug, provider_name),
    ).fetchone()
    return dict(row) if row else None


def upsert_match_raw(
    conn: sqlite3.Connection,
    *,
    source_site: str,
    source_sport_slug: str,
    source_locale: str = "ko",
    source_url: str,
    source_match_id: Optional[str],
    source_match_href: Optional[str],
    raw_sport_label: Optional[str],
    internal_sport_slug: Optional[str],
    provider_name: Optional[str],
    provider_sport_slug: Optional[str],
    raw_home_name: Optional[str],
    raw_home_slug: Optional[str],
    raw_away_name: Optional[str],
    raw_away_slug: Optional[str],
    raw_league_label: Optional[str],
    raw_league_slug: Optional[str] = None,
    raw_league_logo: Optional[str] = None,
    raw_country_label: Optional[str] = None,
    raw_country_flag: Optional[str] = None,
    raw_home_logo: Optional[str] = None,
    raw_away_logo: Optional[str] = None,
    raw_kickoff_text: Optional[str],
    raw_kickoff_utc: Optional[str] = None,
    raw_score_text: Optional[str],
    raw_status_text: Optional[str],
    raw_payload: Optional[dict],
) -> None:
    loc = (source_locale or "ko").strip().lower()
    if loc != "en":
        loc = "ko"
    payload_json = json.dumps(raw_payload, ensure_ascii=False) if raw_payload else None
    conn.execute(
        """
        INSERT INTO crawler_matches_raw (
            source_site, source_sport_slug, source_locale, source_url,
            source_match_id, source_match_href, raw_sport_label,
            internal_sport_slug, provider_name, provider_sport_slug,
            raw_home_name, raw_home_slug, raw_home_logo,
            raw_away_name, raw_away_slug, raw_away_logo,
            raw_league_label, raw_league_slug, raw_league_logo,
            raw_country_label, raw_country_flag,
            raw_kickoff_text, raw_kickoff_utc,
            raw_score_text, raw_status_text,
            raw_payload_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(source_site, source_sport_slug, source_match_id, source_locale)
        DO UPDATE SET
            source_url           = excluded.source_url,
            source_match_href    = excluded.source_match_href,
            raw_sport_label      = excluded.raw_sport_label,
            internal_sport_slug  = excluded.internal_sport_slug,
            provider_name        = excluded.provider_name,
            provider_sport_slug  = excluded.provider_sport_slug,
            raw_home_name        = excluded.raw_home_name,
            raw_home_slug        = excluded.raw_home_slug,
            raw_home_logo        = COALESCE(excluded.raw_home_logo, crawler_matches_raw.raw_home_logo),
            raw_away_name        = excluded.raw_away_name,
            raw_away_slug        = excluded.raw_away_slug,
            raw_away_logo        = COALESCE(excluded.raw_away_logo, crawler_matches_raw.raw_away_logo),
            raw_league_label     = excluded.raw_league_label,
            -- 매 수집값으로 덮어씀 (COALESCE 시 크롤러가 NULL을내면 잘못된 예전 슬러그 `;` 등이 영구 잔존)
            raw_league_slug      = excluded.raw_league_slug,
            raw_league_logo      = COALESCE(excluded.raw_league_logo, crawler_matches_raw.raw_league_logo),
            raw_country_label    = COALESCE(excluded.raw_country_label, crawler_matches_raw.raw_country_label),
            raw_country_flag     = COALESCE(excluded.raw_country_flag, crawler_matches_raw.raw_country_flag),
            raw_kickoff_text     = excluded.raw_kickoff_text,
            raw_kickoff_utc      = COALESCE(excluded.raw_kickoff_utc, crawler_matches_raw.raw_kickoff_utc),
            raw_score_text       = excluded.raw_score_text,
            raw_status_text      = excluded.raw_status_text,
            raw_payload_json     = excluded.raw_payload_json,
            fetched_at           = CURRENT_TIMESTAMP
        """,
        (
            source_site, source_sport_slug, loc, source_url,
            source_match_id, source_match_href, raw_sport_label,
            internal_sport_slug, provider_name, provider_sport_slug,
            raw_home_name, raw_home_slug, raw_home_logo,
            raw_away_name, raw_away_slug, raw_away_logo,
            raw_league_label, raw_league_slug, raw_league_logo,
            raw_country_label, raw_country_flag,
            raw_kickoff_text, raw_kickoff_utc,
            raw_score_text, raw_status_text,
            payload_json,
        ),
    )


def upsert_team_raw(
    conn: sqlite3.Connection,
    *,
    source_site: str,
    source_sport_slug: str,
    internal_sport_slug: Optional[str],
    raw_team_name: str,
    source_team_slug: Optional[str],
    raw_team_href: Optional[str],
    raw_team_logo: Optional[str],
) -> None:
    conn.execute(
        """
        INSERT INTO crawler_teams_raw (
            source_site, source_sport_slug, internal_sport_slug,
            raw_team_name, source_team_slug, raw_team_href, raw_team_logo
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(source_site, source_sport_slug, raw_team_name)
        DO UPDATE SET
            internal_sport_slug = excluded.internal_sport_slug,
            source_team_slug    = COALESCE(excluded.source_team_slug, crawler_teams_raw.source_team_slug),
            raw_team_href       = COALESCE(excluded.raw_team_href, crawler_teams_raw.raw_team_href),
            raw_team_logo       = COALESCE(excluded.raw_team_logo, crawler_teams_raw.raw_team_logo),
            last_seen_at        = CURRENT_TIMESTAMP
        """,
        (
            source_site, source_sport_slug, internal_sport_slug,
            raw_team_name, source_team_slug, raw_team_href, raw_team_logo,
        ),
    )


def start_run(
    conn: sqlite3.Connection,
    *,
    source_site: str,
    provider_name: str,
    trigger_mode: str,
    target_sports: list[str],
    limit_pages: Optional[int],
    limit_rows_per_page: Optional[int],
    only_supported: bool,
) -> int:
    cur = conn.execute(
        """
        INSERT INTO crawler_runs (
            source_site, provider_name, trigger_mode, status,
            target_sports_json, limit_pages, limit_rows_per_page, only_supported
        ) VALUES (?, ?, ?, 'running', ?, ?, ?, ?)
        """,
        (
            source_site,
            provider_name,
            trigger_mode,
            json.dumps(target_sports, ensure_ascii=False),
            limit_pages,
            limit_rows_per_page,
            1 if only_supported else 0,
        ),
    )
    conn.commit()
    return int(cur.lastrowid or 0)


def set_run_healthcheck(
    conn: sqlite3.Connection,
    run_id: int,
    *,
    status: str,             # 'ok' | 'fail' | 'skip'
    http_status: Optional[int],
    note: Optional[str],
) -> None:
    conn.execute(
        """
        UPDATE crawler_runs
           SET healthcheck_status = ?,
               healthcheck_http   = ?,
               healthcheck_note   = ?
         WHERE id = ?
        """,
        (status, http_status, note, run_id),
    )
    conn.commit()


def finish_run(
    conn: sqlite3.Connection,
    run_id: int,
    *,
    status: str,             # 'ok' | 'fail' | 'partial'
    pages_total: int,
    pages_ok: int,
    pages_fail: int,
    pages_empty: int,
    matches_saved: int,
    teams_saved: int,
    duration_ms: int,
    error_text: Optional[str] = None,
) -> None:
    conn.execute(
        """
        UPDATE crawler_runs
           SET status        = ?,
               pages_total   = ?,
               pages_ok      = ?,
               pages_fail    = ?,
               pages_empty   = ?,
               matches_saved = ?,
               teams_saved   = ?,
               error_text    = ?,
               finished_at   = CURRENT_TIMESTAMP,
               duration_ms   = ?
         WHERE id = ?
        """,
        (
            status, pages_total, pages_ok, pages_fail, pages_empty,
            matches_saved, teams_saved, error_text, duration_ms, run_id,
        ),
    )
    conn.commit()


def log_page_fetch(
    conn: sqlite3.Connection,
    *,
    run_id: int,
    source_site: str,
    source_sport_slug: str,
    source_url: str,
    internal_sport_slug: Optional[str],
    provider_sport_slug: Optional[str],
    is_supported: bool,
    status: str,             # 'ok' | 'empty' | 'fail'
    rows_found: int,
    rows_saved: int,
    teams_saved: int,
    duration_ms: int,
    error_text: Optional[str] = None,
) -> None:
    conn.execute(
        """
        INSERT INTO crawler_page_fetches (
            run_id, source_site, source_sport_slug, source_url,
            internal_sport_slug, provider_sport_slug, is_supported,
            status, rows_found, rows_saved, teams_saved,
            error_text, finished_at, duration_ms
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
        """,
        (
            run_id, source_site, source_sport_slug, source_url,
            internal_sport_slug, provider_sport_slug, 1 if is_supported else 0,
            status, rows_found, rows_saved, teams_saved,
            error_text, duration_ms,
        ),
    )
    conn.commit()


def recent_runs(conn: sqlite3.Connection, take: int = 10) -> list[dict]:
    rows = conn.execute(
        """
        SELECT id, status, trigger_mode,
               healthcheck_status, healthcheck_http,
               pages_total, pages_ok, pages_fail, pages_empty,
               matches_saved, teams_saved,
               started_at, finished_at, duration_ms,
               error_text
          FROM crawler_runs
         ORDER BY started_at DESC
         LIMIT ?
        """,
        (int(max(1, take)),),
    ).fetchall()
    return [dict(r) for r in rows]


def recent_page_fetches(
    conn: sqlite3.Connection,
    run_id: Optional[int] = None,
    take: int = 50,
) -> list[dict]:
    if run_id is None:
        rows = conn.execute(
            """
            SELECT id, run_id, source_sport_slug, source_url, status,
                   rows_found, rows_saved, teams_saved,
                   duration_ms, started_at, error_text
              FROM crawler_page_fetches
             ORDER BY started_at DESC
             LIMIT ?
            """,
            (int(max(1, take)),),
        ).fetchall()
    else:
        rows = conn.execute(
            """
            SELECT id, run_id, source_sport_slug, source_url, status,
                   rows_found, rows_saved, teams_saved,
                   duration_ms, started_at, error_text
              FROM crawler_page_fetches
             WHERE run_id = ?
             ORDER BY started_at DESC
             LIMIT ?
            """,
            (int(run_id), int(max(1, take))),
        ).fetchall()
    return [dict(r) for r in rows]


def stats(conn: sqlite3.Connection) -> dict:
    def scalar(sql: str) -> int:
        r = conn.execute(sql).fetchone()
        return int(r[0]) if r else 0

    return {
        "sport_mappings": scalar("SELECT COUNT(*) FROM sport_mappings"),
        "sport_mappings_supported": scalar(
            "SELECT COUNT(*) FROM sport_mappings WHERE is_supported = 1"
        ),
        "crawler_matches_raw": scalar("SELECT COUNT(*) FROM crawler_matches_raw"),
        "crawler_teams_raw": scalar("SELECT COUNT(*) FROM crawler_teams_raw"),
        "crawler_runs": scalar("SELECT COUNT(*) FROM crawler_runs"),
        "crawler_page_fetches": scalar("SELECT COUNT(*) FROM crawler_page_fetches"),
    }


def iter_per_sport_match_counts(conn: sqlite3.Connection) -> Iterable[sqlite3.Row]:
    return conn.execute(
        """
        SELECT source_sport_slug,
               internal_sport_slug,
               provider_sport_slug,
               COUNT(*) AS matches
          FROM crawler_matches_raw
         GROUP BY source_sport_slug, internal_sport_slug, provider_sport_slug
         ORDER BY matches DESC
        """
    ).fetchall()
