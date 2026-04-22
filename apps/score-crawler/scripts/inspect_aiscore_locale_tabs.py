#!/usr/bin/env python3
"""aiscore 축구 페이지(ko / en)에서 상단 탭 라벨·경기 앵커 개수만 출력 — DOM 학습·탭 후보 검증용.

  curl 로는 Cloudflare 403 이라 HTML 을 못 본다. 크롤러와 동일하게 Playwright 사용.

  실행 (Playwright 는 score-crawler/.venv 기준):

    cd apps/score-crawler && source .venv/bin/activate
    python scripts/inspect_aiscore_locale_tabs.py --both

  시스템 python 으로 실행해도, 아래 `._reexec_via_local_venv()` 가
  `apps/score-crawler/.venv/bin/python` 으로 한 번 더 띄워 준다(해당 venv 가 있을 때).

  기본 출력의 mergedUniqueMatchIds 는 «탭 클릭·스크롤 없이» 현재 뷰포트만 집계한 값이라
  실제 크롤(4탭 순회+가상스크롤) 건수와 다름. 전자와 동일 파이프 검증:

    .venv/bin/python scripts/inspect_aiscore_locale_tabs.py --both --verify-fetch
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

# 패키지 루트(score-crawler/) 를 path 에 넣음
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


def _reexec_via_local_venv() -> None:
    """전역 python 으로 실행된 경우 score-crawler/.venv 로 자동 전환."""
    try:
        import playwright  # noqa: F401
    except ModuleNotFoundError:
        pass
    else:
        return
    candidates: list[Path] = [
        ROOT / ".venv" / "bin" / "python",
        ROOT / ".venv" / "Scripts" / "python.exe",
    ]
    here = Path(sys.executable).resolve()
    for vpy in candidates:
        if not vpy.is_file():
            continue
        if here == vpy.resolve():
            print(
                "오류: 이 프로젝트 venv 에도 playwright 가 없습니다.\n"
                f"  cd {ROOT} && .venv/bin/python -m pip install -r requirements.txt\n"
                "  .venv/bin/python -m playwright install chromium",
                file=sys.stderr,
            )
            raise SystemExit(1)
        os.execv(str(vpy), [str(vpy), str(Path(__file__).resolve()), *sys.argv[1:]])
    print(
        "오류: playwright 모듈이 없습니다. score-crawler 가상환경에서 실행하세요.\n"
        f"  cd {ROOT} && python3 -m venv .venv\n"
        f"  source {ROOT}/.venv/bin/activate   # Windows: .venv\\\\Scripts\\\\activate\n"
        f"  pip install -r requirements.txt && python -m playwright install chromium\n"
        f"  python scripts/inspect_aiscore_locale_tabs.py --both",
        file=sys.stderr,
    )
    raise SystemExit(1)


_reexec_via_local_venv()

from aiscore_parser import AiscoreParser, build_sport_url  # noqa: E402

_DUMP_JS = r"""
() => {
  const tabEls = Array.from(
    document.querySelectorAll('.changeItem, span.changeItem, span[class*="changeItem"]')
  );
  const tabs = tabEls.map((el) => (el.textContent || '').replace(/\s+/g, ' ').trim()).filter(Boolean);
  const uniq = [...new Set(tabs)];
  const nSports = document.querySelectorAll('a[itemtype*="SportsEvent"]').length;
  const nMatchBox = document.querySelectorAll('.match-container').length;
  const rawNodes = Array.from(document.querySelectorAll(
    'a[itemtype*="SportsEvent"], a.match-container[href*="/match-"], a.match-container[data-id]'
  ));
  const byId = new Map();
  for (const m of rawNodes) {
    const href0 = m.getAttribute('href') || '';
    let mid = m.getAttribute('data-id');
    if (!mid && href0) {
      const parts = href0.split('/').filter(Boolean);
      mid = parts[parts.length - 1] || null;
    }
    if (mid) byId.set(mid, m);
  }
  const sampleHref = (() => {
    const a = document.querySelector('a[itemtype*="SportsEvent"], a.match-container[href*="/match-"]');
    return a ? a.getAttribute('href') : null;
  })();
  return {
    uniqTabs: uniq,
    tabCount: tabEls.length,
    sportsEventAnchors: nSports,
    matchContainers: nMatchBox,
    mergedUniqueMatchIds: byId.size,
    sampleHref,
  };
}
"""


def main() -> None:
    p = argparse.ArgumentParser(description="aiscore ko/en 축구 랜딩 탭·row 수 덤프")
    p.add_argument("--locale", choices=("ko", "en"), default="ko", help="단일 로케일")
    p.add_argument("--both", action="store_true", help="ko 후 en 순서로 둘 다")
    p.add_argument(
        "--verify-fetch",
        action="store_true",
        help="fetch_sport_page(축구) 로 4탭 전부 스크롤 수집 — 실제 크롤과 동일한 건수",
    )
    p.add_argument(
        "--limit-rows",
        type=int,
        default=15_000,
        help="--verify-fetch 시 경기 상한 (기본 15000)",
    )
    p.add_argument("--headless", action="store_true", default=True)
    p.add_argument("--no-headless", action="store_false", dest="headless", help="브라우저 창으로 보며 디버그")
    args = p.parse_args()

    locales = ["ko", "en"] if args.both else [args.locale]

    if args.verify_fetch:
        lim = max(1, int(args.limit_rows))
        with AiscoreParser(headless=args.headless, nav_timeout_ms=45_000, wait_after_load_ms=2_500) as parser:
            for loc in locales:
                parser.reload_context_for_locale(loc)
                url, rows = parser.fetch_sport_page("football", limit_rows=lim)
                print(f"\n=== verify-fetch locale={loc} url={url} rows={len(rows)} (cap={lim}) ===", flush=True)
                if rows:
                    s = rows[0]
                    print(
                        f"  sample id={s.source_match_id!r} home={s.raw_home_name!r} away={s.raw_away_name!r}",
                        flush=True,
                    )
        return

    with AiscoreParser(headless=args.headless, nav_timeout_ms=45_000, wait_after_load_ms=2_500) as parser:
        for loc in locales:
            parser.reload_context_for_locale(loc)
            url = build_sport_url("football", page_locale=loc)
            print(f"\n=== locale={loc} url={url} ===", flush=True)
            page = parser._page
            assert page
            page.goto(url, wait_until="domcontentloaded", timeout=45_000)
            page.wait_for_timeout(2500)
            try:
                page.wait_for_selector(
                    '.match-container, a[itemtype*="SportsEvent"], a[href*="/match-"]',
                    timeout=20_000,
                )
            except Exception:
                pass
            data = page.evaluate(_DUMP_JS)
            print(json.dumps(data, ensure_ascii=False, indent=2), flush=True)


if __name__ == "__main__":
    main()
