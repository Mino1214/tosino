"""
score-crawler CLI entry.

실행 예:
    # 1회만 실행 (지원 종목, 3개 페이지, 페이지당 5 row, headless)
    python run.py

    # 주기 실행 (5분마다)
    python run.py --loop --interval-seconds 300

    # 모든 종목 순회, headful 디버깅
    python run.py --no-only-supported --headless=false

    # 개별 종목만 지정
    python run.py --sports soccer,basketball,tennis --limit-pages 3 --limit-rows 10

    # 최근 run / page fetch 로그 확인 후 종료 (크롤링 하지 않음)
    python run.py --show-log
    python run.py --show-log --log-take 20

실행 시 자동으로:
    1) schema.sql 로 테이블 생성
    2) sport_mappings 시드 upsert
    3) (매 사이클) livesport.com 헬스체크 → 탭 하나로 대상 페이지 순회
    4) crawler_runs / crawler_page_fetches 에 로그 누적
    5) crawler_matches_raw / crawler_teams_raw 에 원본 저장
"""

from __future__ import annotations

import argparse
import os
import sys
import time
import traceback
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv

# asset_downloader 가 import 될 때 PUBLIC_API_URL 을 쓰므로, 로컬 패키지보다 먼저 env 로드.
HERE = Path(__file__).resolve().parent
load_dotenv(HERE / ".env")
_api_env = HERE.parent / "api" / ".env"
if _api_env.is_file():
    load_dotenv(_api_env, override=False)

import db as store
from backend_ingest import (
    push_leagues_to_backend,
    push_raw_matches_to_backend,
    push_teams_to_backend,
)
from aiscore_parser import AiscoreParser
from livesport_parser import LivesportParser
from mappings import (
    all_livesport_slugs,
    primary_livesport_slugs,
)


# source-site 별 지원 종목 목록.
# aiscore 는 livesport 와 slug 체계가 약간 다르므로 여기서 프로파일로 관리.
AISCORE_SPORTS_PRIMARY = [
    "football",        # /ko
    "baseball",
    "basketball",
    "tennis",
    "volleyball",
    "esports",
    "ice-hockey",
    "cricket",
    "american-football",
    "table-tennis",
    "water-polo",
    "snooker",
    "badminton",
]
AISCORE_SPORTS_ALL = list(AISCORE_SPORTS_PRIMARY)


def _make_parser(source_site: str, **kwargs):
    """source_site 별 Playwright 파서 팩토리."""
    if source_site == "aiscore":
        return AiscoreParser(**kwargs)
    return LivesportParser(**kwargs)


def _page_url_for(source_site: str, slug: str) -> str:
    if source_site == "aiscore":
        from aiscore_parser import build_sport_url
        return build_sport_url(slug)
    return f"https://www.livesport.com/kr/{slug}/"


def _env_bool(name: str, default: bool) -> bool:
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() in ("1", "true", "yes", "on", "y", "t")


def _env_int(name: str, default: int) -> int:
    raw = os.environ.get(name)
    if raw is None:
        return default
    try:
        return int(raw)
    except ValueError:
        return default


def parse_args(argv: Optional[list[str]] = None) -> argparse.Namespace:
    load_dotenv(HERE / ".env")

    p = argparse.ArgumentParser(description="Livesport score crawler (MVP)")
    p.add_argument(
        "--db-url",
        default=os.environ.get("DB_URL", "sqlite:///./score-crawler.db"),
        help="sqlite URL (sqlite:///./x.db)",
    )
    p.add_argument(
        "--source-site",
        default=os.environ.get("SOURCE_SITE", "aiscore"),
        choices=["aiscore", "livesport"],
        help="크롤링 대상 사이트 (기본 aiscore)",
    )
    p.add_argument(
        "--provider-name",
        default=os.environ.get("PROVIDER_NAME", "odds-api.io"),
    )
    p.add_argument(
        "--sports",
        default=None,
        help="콤마 구분 livesport slug 목록. 지정 시 ONLY_SUPPORTED_SPORTS 는 무시된다.",
    )
    p.add_argument(
        "--only-supported",
        dest="only_supported",
        action="store_true",
        default=_env_bool("ONLY_SUPPORTED_SPORTS", True),
    )
    p.add_argument(
        "--no-only-supported",
        dest="only_supported",
        action="store_false",
    )
    p.add_argument(
        "--limit-pages",
        type=int,
        default=_env_int("LIMIT_PAGES", 3),
        help="순회할 페이지(종목) 개수 상한. 0/음수면 무제한.",
    )
    p.add_argument(
        "--limit-rows",
        type=int,
        default=_env_int("LIMIT_ROWS_PER_PAGE", 5),
        help="페이지당 저장할 row 상한",
    )
    p.add_argument(
        "--headless",
        default=os.environ.get("HEADLESS", "true"),
        help="'true' | 'false'",
    )
    p.add_argument(
        "--nav-timeout-ms",
        type=int,
        default=_env_int("NAV_TIMEOUT_MS", 30_000),
    )
    p.add_argument(
        "--wait-after-load-ms",
        type=int,
        default=_env_int("WAIT_AFTER_LOAD_MS", 1_500),
    )

    # 주기 실행/헬스체크
    p.add_argument(
        "--loop",
        action="store_true",
        default=_env_bool("LOOP", False),
        help="한 번만이 아니라 interval-seconds 주기로 계속 실행",
    )
    p.add_argument(
        "--interval-seconds",
        type=int,
        default=_env_int("INTERVAL_SECONDS", 300),
        help="--loop 모드에서 한 사이클 끝난 뒤 다음 사이클까지 대기 초",
    )
    p.add_argument(
        "--skip-healthcheck",
        action="store_true",
        default=_env_bool("SKIP_HEALTHCHECK", False),
        help="사이클 시작 헬스체크 스킵",
    )

    # 백엔드로 리그 ingest push (선택)
    p.add_argument(
        "--backend-base-url",
        default=os.environ.get("BACKEND_BASE_URL", ""),
        help="예: http://localhost:4001/api (비어있으면 ingest 생략)",
    )
    p.add_argument(
        "--backend-integration-key",
        default=os.environ.get("BACKEND_INTEGRATION_KEY", ""),
        help="x-integration-key 헤더에 실을 키 (ODDS_API_INTEGRATION_KEYS 중 하나)",
    )
    p.add_argument(
        "--skip-backend-ingest",
        action="store_true",
        default=False,
        help="BACKEND_BASE_URL 이 있어도 이번 실행에서는 ingest 를 생략",
    )

    # 로그 조회 전용
    p.add_argument(
        "--show-log",
        action="store_true",
        help="크롤링을 돌리지 않고 최근 run/page fetch 로그만 출력",
    )
    p.add_argument(
        "--log-take",
        type=int,
        default=10,
        help="--show-log 시 보여줄 run 개수",
    )

    args = p.parse_args(argv)
    args.headless = str(args.headless).strip().lower() not in ("false", "0", "no", "off", "n", "f")
    return args


def select_target_sports(args: argparse.Namespace) -> list[str]:
    if args.source_site == "aiscore":
        known = AISCORE_SPORTS_ALL
        primary = AISCORE_SPORTS_PRIMARY
    else:
        known = all_livesport_slugs()
        primary = primary_livesport_slugs()

    if args.sports:
        raw = [s.strip() for s in args.sports.split(",") if s.strip()]
        known_set = set(known)
        return [s for s in raw if s in known_set] or raw
    if args.only_supported:
        return primary
    return list(known)


# ── 로그 출력 ───────────────────────────────────────────────────────────────
def print_recent_log(conn, take: int) -> None:
    print(f"\n[score-crawler] ── recent runs (top {take}) ──")
    runs = store.recent_runs(conn, take=take)
    if not runs:
        print("  (no runs yet)")
        return
    for r in runs:
        dur = f"{(r.get('duration_ms') or 0)/1000:.1f}s" if r.get("duration_ms") else "-"
        hc = r.get("healthcheck_status") or "-"
        hc_http = r.get("healthcheck_http")
        hc_text = f"{hc}({hc_http})" if hc_http is not None else hc
        print(
            f"  run#{r['id']:>4}  {r['status']:<8s} hc={hc_text:<10s} "
            f"pages={r['pages_ok']}/{r['pages_total']} "
            f"(empty={r['pages_empty']} fail={r['pages_fail']}) "
            f"matches+={r['matches_saved']:<4d} teams+={r['teams_saved']:<4d} "
            f"dur={dur:<7s} started={r['started_at']}"
            + (f" ERR={r['error_text']}" if r.get("error_text") else "")
        )
    # 최근 run 하나의 페이지별 로그
    latest = runs[0]
    pages = store.recent_page_fetches(conn, run_id=latest["id"], take=40)
    if pages:
        print(f"\n  └ run#{latest['id']} 페이지별 ({len(pages)}):")
        for p in pages:
            dur = f"{(p.get('duration_ms') or 0)/1000:.1f}s" if p.get("duration_ms") else "-"
            print(
                f"     - {p['source_sport_slug']:<18s} [{p['status']:<5s}] "
                f"found={p['rows_found']:<3d} saved={p['rows_saved']:<3d} "
                f"teams={p['teams_saved']:<3d} dur={dur}"
                + (f" ERR={p['error_text']}" if p.get("error_text") else "")
            )


# ── 한 사이클 실행 ────────────────────────────────────────────────────────
def run_one_cycle(conn, args: argparse.Namespace, *, trigger_mode: str) -> dict:
    all_targets = select_target_sports(args)
    if args.limit_pages and args.limit_pages > 0:
        targets = all_targets[: args.limit_pages]
    else:
        targets = all_targets

    print(
        f"\n[score-crawler] ▶ cycle start — targets ({len(targets)}/{len(all_targets)}): "
        f"{', '.join(targets) or '—'}"
    )

    run_id = store.start_run(
        conn,
        source_site=args.source_site,
        provider_name=args.provider_name,
        trigger_mode=trigger_mode,
        target_sports=targets,
        limit_pages=args.limit_pages,
        limit_rows_per_page=args.limit_rows,
        only_supported=args.only_supported,
    )
    started_ms = int(time.time() * 1000)
    print(f"[score-crawler]   run#{run_id} started")

    pages_total = len(targets)
    pages_ok = pages_fail = pages_empty = 0
    total_matches = 0
    total_teams = 0
    run_error: Optional[str] = None

    try:
        with _make_parser(
            args.source_site,
            headless=args.headless,
            nav_timeout_ms=args.nav_timeout_ms,
            wait_after_load_ms=args.wait_after_load_ms,
        ) as parser:

            # 1) 헬스체크
            if args.skip_healthcheck:
                store.set_run_healthcheck(conn, run_id, status="skip", http_status=None, note=None)
                print("[score-crawler]   healthcheck SKIPPED")
            else:
                hc = parser.healthcheck()
                store.set_run_healthcheck(
                    conn, run_id,
                    status=hc["status"], http_status=hc.get("http"), note=hc.get("note"),
                )
                print(
                    f"[score-crawler]   healthcheck {hc['status']} "
                    f"http={hc.get('http')} note={hc.get('note') or '-'}"
                )
                if hc["status"] != "ok":
                    # 헬스체크 실패면 크롤링 시도 자체를 생략하고 run 종료
                    store.finish_run(
                        conn, run_id,
                        status="fail",
                        pages_total=pages_total,
                        pages_ok=0, pages_fail=0, pages_empty=0,
                        matches_saved=0, teams_saved=0,
                        duration_ms=int(time.time() * 1000) - started_ms,
                        error_text=f"healthcheck failed: {hc.get('note')}",
                    )
                    return {
                        "run_id": run_id, "status": "fail",
                        "matches": 0, "teams": 0, "pages_ok": 0, "pages_fail": 0,
                    }

            # 2) 페이지 순회 (같은 탭 재사용)
            for slug in targets:
                mapping = store.resolve_mapping(
                    conn,
                    source_site=args.source_site,
                    source_sport_slug=slug,
                    provider_name=args.provider_name,
                )
                internal_sport_slug = (mapping or {}).get("internal_sport_slug")
                provider_sport_slug = (mapping or {}).get("provider_sport_slug")
                is_supported = bool((mapping or {}).get("is_supported"))

                tag = "SUPPORTED" if is_supported else "raw-only"
                page_started_ms = int(time.time() * 1000)
                page_url = _page_url_for(args.source_site, slug)
                page_status = "ok"
                page_err: Optional[str] = None
                rows_found = rows_saved = teams_saved = 0

                print(
                    f"[score-crawler]   · {slug:<18s} ({tag}) "
                    f"internal={internal_sport_slug or '-'} "
                    f"provider={provider_sport_slug or '-'}"
                )

                try:
                    source_url, rows = parser.fetch_sport_page(slug, limit_rows=args.limit_rows)
                    page_url = source_url
                    rows_found = len(rows)

                    if rows_found == 0:
                        page_status = "empty"
                        pages_empty += 1

                    for m in rows:
                        store.upsert_match_raw(
                            conn,
                            source_site=args.source_site,
                            source_sport_slug=slug,
                            source_url=source_url,
                            source_match_id=m.source_match_id,
                            source_match_href=m.source_match_href,
                            raw_sport_label=m.raw_sport_label,
                            internal_sport_slug=internal_sport_slug,
                            provider_name=args.provider_name,
                            provider_sport_slug=provider_sport_slug,
                            raw_home_name=m.raw_home_name,
                            raw_home_slug=m.raw_home_slug,
                            raw_home_logo=m.raw_home_logo,
                            raw_away_name=m.raw_away_name,
                            raw_away_slug=m.raw_away_slug,
                            raw_away_logo=m.raw_away_logo,
                            raw_league_label=m.raw_league_label,
                            raw_league_slug=m.raw_league_slug,
                            raw_league_logo=getattr(m, "raw_league_logo", None),
                            raw_country_label=m.raw_country_label,
                            raw_country_flag=getattr(m, "raw_country_flag", None),
                            raw_kickoff_text=m.raw_kickoff_text,
                            raw_kickoff_utc=m.raw_kickoff_utc,
                            raw_score_text=m.raw_score_text,
                            raw_status_text=m.raw_status_text,
                            raw_payload=m.raw_payload,
                        )
                        rows_saved += 1
                        for (name, logo) in (
                            (m.raw_home_name, m.raw_home_logo),
                            (m.raw_away_name, m.raw_away_logo),
                        ):
                            if not name:
                                continue
                            store.upsert_team_raw(
                                conn,
                                source_site=args.source_site,
                                source_sport_slug=slug,
                                internal_sport_slug=internal_sport_slug,
                                raw_team_name=name,
                                source_team_slug=None,
                                raw_team_href=None,
                                raw_team_logo=logo,
                            )
                            teams_saved += 1
                    conn.commit()

                    if page_status == "ok":
                        pages_ok += 1
                    total_matches += rows_saved
                    total_teams += teams_saved

                except Exception as e:
                    page_status = "fail"
                    page_err = f"{type(e).__name__}: {e}"
                    pages_fail += 1
                    print(f"[score-crawler]     ! fetch 실패: {page_err}")

                finally:
                    store.log_page_fetch(
                        conn,
                        run_id=run_id,
                        source_site=args.source_site,
                        source_sport_slug=slug,
                        source_url=page_url,
                        internal_sport_slug=internal_sport_slug,
                        provider_sport_slug=provider_sport_slug,
                        is_supported=is_supported,
                        status=page_status,
                        rows_found=rows_found,
                        rows_saved=rows_saved,
                        teams_saved=teams_saved,
                        duration_ms=int(time.time() * 1000) - page_started_ms,
                        error_text=page_err,
                    )
                    print(
                        f"[score-crawler]     status={page_status} "
                        f"found={rows_found} saved={rows_saved} teams={teams_saved}"
                    )

    except Exception as e:
        run_error = f"{type(e).__name__}: {e}\n{traceback.format_exc()}"
        print(f"[score-crawler] ! cycle aborted: {e}")

    # 3) run 종료 기록
    if run_error:
        final_status = "fail"
    elif pages_fail and pages_ok == 0:
        final_status = "fail"
    elif pages_fail:
        final_status = "partial"
    else:
        final_status = "ok"

    store.finish_run(
        conn, run_id,
        status=final_status,
        pages_total=pages_total,
        pages_ok=pages_ok,
        pages_fail=pages_fail,
        pages_empty=pages_empty,
        matches_saved=total_matches,
        teams_saved=total_teams,
        duration_ms=int(time.time() * 1000) - started_ms,
        error_text=run_error,
    )

    print(
        f"[score-crawler] ◀ cycle done: run#{run_id} [{final_status}] "
        f"pages {pages_ok}/{pages_total} (empty={pages_empty} fail={pages_fail}) "
        f"matches+={total_matches} teams+={total_teams}"
    )

    # 4) 백엔드로 리그/팀/경기 목록 push (옵션)
    if not getattr(args, "skip_backend_ingest", False):
        for kind, ingest in (
            (
                "leagues",
                push_leagues_to_backend(
                    conn,
                    source_site=args.source_site,
                    backend_base_url=getattr(args, "backend_base_url", ""),
                    integration_key=getattr(args, "backend_integration_key", ""),
                ),
            ),
            (
                "teams",
                push_teams_to_backend(
                    conn,
                    source_site=args.source_site,
                    backend_base_url=getattr(args, "backend_base_url", ""),
                    integration_key=getattr(args, "backend_integration_key", ""),
                ),
            ),
            (
                "matches",
                push_raw_matches_to_backend(
                    conn,
                    source_site=args.source_site,
                    backend_base_url=getattr(args, "backend_base_url", ""),
                    integration_key=getattr(args, "backend_integration_key", ""),
                ),
            ),
        ):
            if ingest.get("skipped"):
                reason = ingest.get("reason")
                if reason and "not set" not in reason:
                    print(f"[score-crawler]   ingest {kind} skipped: {reason}")
            elif ingest.get("ok"):
                resp = ingest.get("response") or {}
                # matches 는 {ingest:{...}, matcher:{...}} 구조, 그 외는 {received,upserted,...}
                ing_sum = resp.get("ingest") if isinstance(resp.get("ingest"), dict) else resp
                summary = (
                    f"received={ing_sum.get('received')} upserted={ing_sum.get('upserted')} "
                    f"new={ing_sum.get('newlyAdded')} updated={ing_sum.get('updated')}"
                )
                matcher = resp.get("matcher")
                if isinstance(matcher, dict):
                    summary += (
                        f" | matcher scanned={matcher.get('scanned')} "
                        f"auto={matcher.get('auto')} pending={matcher.get('pending')}"
                    )
                print(
                    f"[score-crawler]   ingest {kind} ok http={ingest.get('http')} "
                    f"items={ingest.get('items')} → {summary}"
                )
            else:
                print(
                    f"[score-crawler]   ingest {kind} FAIL http={ingest.get('http')} "
                    f"items={ingest.get('items')} err={ingest.get('error')}"
                )

    return {
        "run_id": run_id,
        "status": final_status,
        "matches": total_matches,
        "teams": total_teams,
        "pages_ok": pages_ok,
        "pages_fail": pages_fail,
    }


def main(argv: Optional[list[str]] = None) -> int:
    args = parse_args(argv)

    print(f"[score-crawler] db_url={args.db_url}")
    print(f"[score-crawler] source_site={args.source_site} provider_name={args.provider_name}")
    conn = store.connect(args.db_url)
    store.init_schema(conn)
    mapping_count = store.seed_sport_mappings(
        conn,
        source_site=args.source_site,
        provider_name=args.provider_name,
    )
    print(f"[score-crawler] sport_mappings upserted: {mapping_count}")

    # 로그 조회 모드
    if args.show_log:
        print_recent_log(conn, take=args.log_take)
        s = store.stats(conn)
        print(f"\n  db stats: runs={s['crawler_runs']} page_fetches={s['crawler_page_fetches']} "
              f"matches_raw={s['crawler_matches_raw']} teams_raw={s['crawler_teams_raw']}")
        return 0

    trigger_mode = "loop" if args.loop else "once"

    if not args.loop:
        run_one_cycle(conn, args, trigger_mode=trigger_mode)
        print_recent_log(conn, take=3)
        return 0

    # 루프 모드: Ctrl+C 로 종료
    print(f"[score-crawler] ▶ loop mode — interval={args.interval_seconds}s (Ctrl+C to stop)")
    cycle = 0
    try:
        while True:
            cycle += 1
            print(f"\n[score-crawler] ==== cycle {cycle} ====")
            try:
                run_one_cycle(conn, args, trigger_mode=trigger_mode)
            except Exception as e:
                # run_one_cycle 내에서 이미 try/except 하지만, 혹시 모를 최외곽 방어막
                print(f"[score-crawler] !! cycle {cycle} crashed: {e}")
                traceback.print_exc()
            print(f"[score-crawler]   sleeping {args.interval_seconds}s …")
            time.sleep(max(1, args.interval_seconds))
    except KeyboardInterrupt:
        print("\n[score-crawler] interrupted, exiting.")
        return 0


if __name__ == "__main__":
    sys.exit(main())
