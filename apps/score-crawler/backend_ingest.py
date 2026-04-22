"""
크롤러가 수집한 리그를 NestJS 백엔드(CrawlerLeagueMapping) 로 밀어넣는 클라이언트.

동작:
    1) crawler_matches_raw 에서 (source_site, source_sport_slug, raw_league_slug)
       기준으로 distinct league 들을 모은다.
    2) 라벨/국가는 같은 그룹의 최신 값을 대표로 사용하고,
       매치 수(count) 도 함께 담는다.
    3) POST /integrations/crawler/leagues/ingest 로 한 번에 전송.

인증은 x-integration-key 헤더 (env: ODDS_API_INTEGRATION_KEYS 중 하나).
"""

from __future__ import annotations

import json
import os
import sqlite3
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Optional


def _collect_distinct_leagues(
    conn: sqlite3.Connection,
    source_site: str,
) -> list[dict]:
    rows = conn.execute(
        """
        SELECT
            source_sport_slug,
            raw_league_slug,
            MAX(raw_league_label)    AS label,
            MAX(raw_league_logo)     AS league_logo,
            MAX(raw_country_label)   AS country,
            MAX(raw_country_flag)    AS country_flag,
            MAX(internal_sport_slug) AS internal_sport_slug,
            MAX(provider_name)       AS provider_name,
            MAX(provider_sport_slug) AS provider_sport_slug,
            COUNT(*)                 AS match_count
          FROM crawler_matches_raw
         WHERE source_site     = ?
           AND raw_league_slug IS NOT NULL
           AND raw_league_slug <> ''
         GROUP BY source_sport_slug, raw_league_slug
         ORDER BY match_count DESC
        """,
        (source_site,),
    ).fetchall()
    items: list[dict] = []
    for r in rows:
        items.append(
            {
                "sourceLeagueSlug": r["raw_league_slug"],
                "sourceSportSlug": r["source_sport_slug"],
                "sourceLeagueLabel": r["label"],
                "sourceLeagueLogo": r["league_logo"],
                "sourceCountryLabel": r["country"],
                "sourceCountryFlag": r["country_flag"],
                "internalSportSlug": r["internal_sport_slug"],
                "providerName": r["provider_name"],
                "providerSportSlug": r["provider_sport_slug"],
                "matchCount": int(r["match_count"] or 0),
            }
        )
    return items


def _collect_distinct_teams(
    conn: sqlite3.Connection,
    source_site: str,
) -> list[dict]:
    """crawler_teams_raw + crawler_matches_raw 를 조인해 팀별 컨텍스트를 집계.

    한 팀(=동일 sourceTeamName)이 여러 리그에 등장할 수 있지만, 일단 MVP 에서는
    가장 자주 나온 리그 하나를 대표 리그로 삼는다.
    """
    rows = conn.execute(
        """
        WITH team_league AS (
            -- home 팀
            SELECT
                m.source_site        AS source_site,
                m.source_sport_slug  AS source_sport_slug,
                m.raw_home_name      AS team_name,
                m.raw_home_slug      AS team_slug,
                m.raw_league_slug    AS league_slug,
                m.raw_league_label   AS league_label,
                m.raw_country_label  AS country_label,
                m.internal_sport_slug AS internal_sport_slug,
                m.provider_name      AS provider_name,
                m.provider_sport_slug AS provider_sport_slug
              FROM crawler_matches_raw m
             WHERE m.source_site = ?
               AND m.raw_home_name IS NOT NULL
               AND m.raw_home_name <> ''
            UNION ALL
            -- away 팀
            SELECT
                m.source_site, m.source_sport_slug,
                m.raw_away_name, m.raw_away_slug,
                m.raw_league_slug, m.raw_league_label, m.raw_country_label,
                m.internal_sport_slug, m.provider_name, m.provider_sport_slug
              FROM crawler_matches_raw m
             WHERE m.source_site = ?
               AND m.raw_away_name IS NOT NULL
               AND m.raw_away_name <> ''
        ),
        team_agg AS (
            SELECT
                source_sport_slug,
                team_name,
                MAX(team_slug)           AS team_slug,
                MAX(league_slug)         AS league_slug,
                MAX(league_label)        AS league_label,
                MAX(country_label)       AS country_label,
                MAX(internal_sport_slug) AS internal_sport_slug,
                MAX(provider_name)       AS provider_name,
                MAX(provider_sport_slug) AS provider_sport_slug,
                COUNT(*)                 AS match_count
              FROM team_league
             GROUP BY source_sport_slug, team_name
        )
        SELECT a.*,
               t.raw_team_href AS team_href,
               t.raw_team_logo AS team_logo
          FROM team_agg a
     LEFT JOIN crawler_teams_raw t
            ON t.source_site       = ?
           AND t.source_sport_slug = a.source_sport_slug
           AND t.raw_team_name     = a.team_name
         ORDER BY a.match_count DESC
        """,
        (source_site, source_site, source_site),
    ).fetchall()
    items: list[dict] = []
    for r in rows:
        items.append(
            {
                "sourceTeamName": r["team_name"],
                "sourceSportSlug": r["source_sport_slug"],
                "sourceTeamSlug": r["team_slug"],
                "sourceTeamHref": r["team_href"],
                "sourceTeamLogo": r["team_logo"],
                "sourceLeagueSlug": r["league_slug"],
                "sourceLeagueLabel": r["league_label"],
                "sourceCountryLabel": r["country_label"],
                "internalSportSlug": r["internal_sport_slug"],
                "providerName": r["provider_name"],
                "providerSportSlug": r["provider_sport_slug"],
                "matchCount": int(r["match_count"] or 0),
            }
        )
    return items


def _post_ingest(
    url: str,
    key: str,
    source_site: str,
    items: list[dict],
    timeout_seconds: int,
) -> dict:
    """한 번의 POST. 대량은 `_post_ingest_chunked` 사용."""
    body = json.dumps(
        {"sourceSite": source_site, "items": items},
        ensure_ascii=False,
    ).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "x-integration-key": key,
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout_seconds) as resp:
            raw = resp.read()
            text = raw.decode("utf-8", errors="replace") if raw else ""
            try:
                parsed = json.loads(text) if text else {}
            except Exception:
                parsed = {"raw": text[:500]}
            return {
                "ok": True,
                "http": resp.status,
                "items": len(items),
                "response": parsed,
            }
    except urllib.error.HTTPError as e:
        body_text = ""
        try:
            body_text = e.read().decode("utf-8", errors="replace")[:500]
        except Exception:
            pass
        return {
            "ok": False,
            "http": e.code,
            "items": len(items),
            "error": f"HTTPError {e.code}: {e.reason}",
            "body": body_text,
        }
    except urllib.error.URLError as e:
        return {
            "ok": False,
            "http": 0,
            "items": len(items),
            "error": f"URLError: {e.reason}",
        }
    except Exception as e:  # noqa: BLE001
        return {
            "ok": False,
            "http": 0,
            "items": len(items),
            "error": f"{type(e).__name__}: {e}",
        }


def _post_ingest_chunked(
    url: str,
    key: str,
    source_site: str,
    items: list[dict],
    timeout_seconds: int,
    *,
    chunk_size: int = 40,
) -> dict:
    """Express/nginx 본문 한도·프록시 제한을 피하기 위해 items 를 나눠 POST."""
    if not items:
        return {"skipped": True, "reason": "empty items", "items": 0}
    if len(items) <= chunk_size:
        return _post_ingest(url, key, source_site, items, timeout_seconds)

    last: dict = {}
    errors: list[str] = []
    for i in range(0, len(items), chunk_size):
        chunk = items[i : i + chunk_size]
        r = _post_ingest(url, key, source_site, chunk, timeout_seconds)
        last = r
        if not r.get("ok"):
            errors.append(str(r.get("error") or "unknown"))
    ok = len(errors) == 0
    return {
        "ok": ok,
        "http": last.get("http", 0),
        "items": len(items),
        "response": last.get("response"),
        "chunks": (len(items) + chunk_size - 1) // chunk_size,
        "errors": errors if errors else None,
        "error": "; ".join(errors) if errors else last.get("error"),
    }


def fetch_asset_hints(
    backend_base_url: Optional[str],
    integration_key: Optional[str],
    source_site: str,
    *,
    timeout_seconds: int = 12,
) -> Optional[dict[str, Any]]:
    """확정 매핑 기준 로컬 `/assets/` 로고·국기 힌트. 실패 시 None (크롤은 계속)."""
    base = (backend_base_url or "").rstrip("/")
    key = (integration_key or "").strip()
    site = (source_site or "").strip()
    if not base or not key or not site:
        return None
    q = urllib.parse.urlencode({"sourceSite": site})
    url = f"{base}/integrations/crawler/asset-hints?{q}"
    req = urllib.request.Request(
        url,
        method="GET",
        headers={"x-integration-key": key},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout_seconds) as resp:
            raw = resp.read()
            text = raw.decode("utf-8", errors="replace") if raw else ""
            if not text:
                return None
            return json.loads(text)
    except urllib.error.HTTPError as e:
        try:
            _ = e.read()
        except Exception:
            pass
        return None
    except Exception:
        return None


def push_leagues_to_backend(
    conn: sqlite3.Connection,
    *,
    source_site: str,
    backend_base_url: Optional[str],
    integration_key: Optional[str],
    timeout_seconds: int = 15,
) -> dict:
    """수집된 리그를 백엔드로 POST. 설정이 없으면 `{skipped: true, reason: ...}` 반환."""
    base = (backend_base_url or "").rstrip("/")
    key = (integration_key or "").strip()
    if not base:
        return {"skipped": True, "reason": "BACKEND_BASE_URL not set"}
    if not key:
        return {"skipped": True, "reason": "BACKEND_INTEGRATION_KEY not set"}

    items = _collect_distinct_leagues(conn, source_site=source_site)
    if not items:
        return {"skipped": True, "reason": "no leagues to push", "items": 0}

    url = f"{base}/integrations/crawler/leagues/ingest"
    return _post_ingest(url, key, source_site, items, timeout_seconds)


def _collect_recent_raw_matches(
    conn: sqlite3.Connection,
    source_site: str,
    *,
    max_items: int = 8000,
) -> list[dict]:
    """최근 fetched 된 raw 경기들을 CrawlerRawMatchIngestItem 형태로 반환.

    - source_match_id 가 비어 있는 row 는 매칭 불가능하므로 제외.
    - 홈/원정 팀명이 비어 있으면 제외.
    - 최신 fetched_at 순으로 max_items 개만 (한 번에 너무 크면 Nest/타임아웃 위험).
    """
    rows = conn.execute(
        """
        SELECT source_match_id, source_sport_slug, source_locale, source_url, source_match_href,
               internal_sport_slug, provider_name, provider_sport_slug,
               raw_home_name, raw_home_slug, raw_away_name, raw_away_slug,
               raw_league_label, raw_league_slug, raw_country_label,
               raw_kickoff_text, raw_kickoff_utc, raw_score_text, raw_status_text
          FROM crawler_matches_raw
         WHERE source_site = ?
           AND source_match_id IS NOT NULL
           AND source_match_id <> ''
           AND raw_home_name IS NOT NULL AND raw_home_name <> ''
           AND raw_away_name IS NOT NULL AND raw_away_name <> ''
         ORDER BY fetched_at DESC
         LIMIT ?
        """,
        (source_site, int(max_items)),
    ).fetchall()
    items: list[dict] = []
    for r in rows:
        items.append(
            {
                "sourceMatchId": r["source_match_id"],
                "sourceSportSlug": r["source_sport_slug"],
                "sourceLocale": r["source_locale"] or "ko",
                "sourceUrl": r["source_url"],
                "sourceMatchHref": r["source_match_href"],
                "internalSportSlug": r["internal_sport_slug"],
                "providerName": r["provider_name"],
                "providerSportSlug": r["provider_sport_slug"],
                "rawHomeName": r["raw_home_name"],
                "rawHomeSlug": r["raw_home_slug"],
                "rawAwayName": r["raw_away_name"],
                "rawAwaySlug": r["raw_away_slug"],
                "rawLeagueLabel": r["raw_league_label"],
                "rawLeagueSlug": r["raw_league_slug"],
                "rawCountryLabel": r["raw_country_label"],
                "rawKickoffText": r["raw_kickoff_text"],
                "rawKickoffUtc": r["raw_kickoff_utc"],
                "rawScoreText": r["raw_score_text"],
                "rawStatusText": r["raw_status_text"],
            }
        )
    return items


def push_raw_matches_to_backend(
    conn: sqlite3.Connection,
    *,
    source_site: str,
    backend_base_url: Optional[str],
    integration_key: Optional[str],
    timeout_seconds: int = 30,
    max_items: int = 8000,
) -> dict:
    base = (backend_base_url or "").rstrip("/")
    key = (integration_key or "").strip()
    if not base:
        return {"skipped": True, "reason": "BACKEND_BASE_URL not set"}
    if not key:
        return {"skipped": True, "reason": "BACKEND_INTEGRATION_KEY not set"}

    push_max = max_items
    env_cap = os.environ.get("BACKEND_PUSH_RAW_MAX", "").strip()
    if env_cap:
        try:
            push_max = max(1, int(env_cap))
        except ValueError:
            pass

    items = _collect_recent_raw_matches(
        conn,
        source_site=source_site,
        max_items=push_max,
    )
    if not items:
        return {"skipped": True, "reason": "no raw matches to push", "items": 0}

    url = f"{base}/integrations/crawler/matches/ingest"
    return _post_ingest_chunked(url, key, source_site, items, timeout_seconds)


def push_teams_to_backend(
    conn: sqlite3.Connection,
    *,
    source_site: str,
    backend_base_url: Optional[str],
    integration_key: Optional[str],
    timeout_seconds: int = 15,
    max_items: int = 2000,
) -> dict:
    """수집된 팀을 백엔드로 POST. 설정이 없으면 `{skipped: true, reason: ...}` 반환.

    팀 수가 리그보다 훨씬 많을 수 있어 max_items 상한(기본 2000) 으로 페이로드 크기를 제한한다.
    MVP 에선 등장 빈도 순 상위 N 개만 올린다 — 나중에 청크 분할로 확장 가능.
    """
    base = (backend_base_url or "").rstrip("/")
    key = (integration_key or "").strip()
    if not base:
        return {"skipped": True, "reason": "BACKEND_BASE_URL not set"}
    if not key:
        return {"skipped": True, "reason": "BACKEND_INTEGRATION_KEY not set"}

    items = _collect_distinct_teams(conn, source_site=source_site)
    if not items:
        return {"skipped": True, "reason": "no teams to push", "items": 0}
    if len(items) > max_items:
        items = items[:max_items]

    url = f"{base}/integrations/crawler/teams/ingest"
    return _post_ingest_chunked(url, key, source_site, items, timeout_seconds)
