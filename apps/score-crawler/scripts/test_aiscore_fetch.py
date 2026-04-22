"""aiscore_parser.fetch_sport_page 동작 확인용 스크립트.

LIMIT_ROWS 등 .env 무시하고 high limit 으로 돌려서 실제로 몇 건 긁어오는지,
리그/국기/팀 로고/시간 등이 제대로 채워지는지 진단한다.

사용:
    cd apps/score-crawler
    source .venv/bin/activate
    python scripts/test_aiscore_fetch.py                         # 축구, 300건
    python scripts/test_aiscore_fetch.py basketball 500
    python scripts/test_aiscore_fetch.py football 1000 --headful
"""
from __future__ import annotations

import logging
import os
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HERE))

# asset_downloader 가 PUBLIC_API_URL 을 참조. 캐시 다운로드를 타지 않게 끄는 편이 테스트에 유리.
os.environ.setdefault("ASSET_DOWNLOAD_ENABLED", "false")

from aiscore_parser import AiscoreParser, build_sport_url  # noqa: E402


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

    sport = sys.argv[1] if len(sys.argv) > 1 else "football"
    limit = int(sys.argv[2]) if len(sys.argv) > 2 else 300
    headful = "--headful" in sys.argv

    print(f"[test] sport={sport} limit={limit} headless={not headful}")
    print(f"[test] url={build_sport_url(sport)}")

    t0 = time.time()
    with AiscoreParser(
        headless=not headful,
        nav_timeout_ms=30_000,
        wait_after_load_ms=2_500,
        scroll_collect_max_rounds=200,
    ) as p:
        url, matches = p.fetch_sport_page(sport, limit_rows=limit)
    dt = time.time() - t0

    print(f"\n[test] fetched in {dt:.1f}s — url={url}")
    print(f"[test] got {len(matches)} matches (limit={limit})")

    leagues: dict[str, int] = {}
    missing_kickoff = missing_home_logo = missing_league = missing_country = 0
    for m in matches:
        lg = m.raw_league_label or "(no-league)"
        leagues[lg] = leagues.get(lg, 0) + 1
        if not m.raw_kickoff_utc:
            missing_kickoff += 1
        if not m.raw_home_logo:
            missing_home_logo += 1
        if not m.raw_league_label:
            missing_league += 1
        if not m.raw_country_label:
            missing_country += 1

    print(
        f"[test] league_groups={len(leagues)} "
        f"missing kickoff={missing_kickoff} homeLogo={missing_home_logo} "
        f"league={missing_league} country={missing_country}"
    )

    for i, m in enumerate(matches[:15], start=1):
        print(
            f"  {i:>3} id={m.source_match_id} kickoff={m.raw_kickoff_utc} "
            f"league={(m.raw_league_label or '-')[:30]:<30s} "
            f"home={m.raw_home_name!r:<28s} vs away={m.raw_away_name!r}"
        )
    if len(matches) > 15:
        print(f"  ... and {len(matches) - 15} more")

    print("\n[test] top leagues:")
    for lg, c in sorted(leagues.items(), key=lambda x: -x[1])[:15]:
        print(f"  {c:>4}  {lg}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
