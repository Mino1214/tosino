"""aiscore 페이지 구조 진단.

1) 초기 로드 직후 SportsEvent row 개수
2) 날짜 탭(dateFilter / .date-bar / [class*=date]) 존재 여부
3) 스크롤 컨테이너 정보
4) 스크롤 루프마다 row 수 변화
5) 탭별(오늘/내일/어제) row 수 (있다면 클릭해서 확인)
"""
from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HERE))

os.environ.setdefault("ASSET_DOWNLOAD_ENABLED", "false")

from playwright.sync_api import sync_playwright  # noqa: E402


PROBE_JS = r"""
() => {
    const rows = document.querySelectorAll('a[itemtype*="SportsEvent"]');
    const matchBox = document.querySelector('.match-box');

    // 날짜 탭 후보
    const dateCandidates = [
        '.date-bar', '.date-tab', '[class*="dateTab"]',
        '[class*="date-bar"]', '[class*="dateFilter"]',
        '.tabDate', '.swiper-slide',
    ];
    const dateTabs = [];
    for (const sel of dateCandidates) {
        const nodes = document.querySelectorAll(sel);
        if (nodes.length > 0 && nodes.length < 40) {
            for (const n of nodes) {
                const t = (n.textContent || '').trim();
                if (t && t.length < 60) dateTabs.push({ sel, text: t, cls: n.className });
            }
        }
    }

    // 상단 필터 (all/live/finished)
    const filterCandidates = ['.filter', '[class*="filter"]', '.menu-item', '.tab'];
    const filters = [];
    for (const sel of filterCandidates) {
        const nodes = document.querySelectorAll(sel);
        if (nodes.length > 0 && nodes.length < 15) {
            for (const n of nodes) {
                const t = (n.textContent || '').trim();
                if (t && t.length < 30) filters.push({ sel, text: t });
            }
        }
    }

    // 스크롤 컨테이너
    const scrollers = [];
    for (const el of document.body.querySelectorAll('div,section,main,article')) {
        if (!(el instanceof HTMLElement)) continue;
        const ex = el.scrollHeight - el.clientHeight;
        if (ex < 80) continue;
        const st = getComputedStyle(el);
        if (!['auto', 'scroll', 'overlay'].includes(st.overflowY)) continue;
        scrollers.push({
            tag: el.tagName,
            cls: el.className?.toString?.().slice(0, 80),
            scrollHeight: el.scrollHeight,
            clientHeight: el.clientHeight,
            exceed: ex,
        });
    }
    scrollers.sort((a, b) => b.exceed - a.exceed);

    // match-container들의 날짜 그룹 헤더
    const compContainers = document.querySelectorAll('.comp-container');
    const leagues = [];
    for (const cc of compContainers) {
        const name = cc.querySelector('.compe-name')?.textContent?.trim() || null;
        const country = cc.querySelector('.country-name')?.textContent?.trim() || null;
        const rowCount = cc.querySelectorAll('a[itemtype*="SportsEvent"], .match-container').length;
        leagues.push({ name, country, rowCount });
    }

    return {
        rowsTotal: rows.length,
        matchBoxExists: !!matchBox,
        matchBoxHTMLLen: matchBox ? matchBox.innerHTML.length : 0,
        dateTabs: dateTabs.slice(0, 20),
        filters: filters.slice(0, 20),
        scrollers: scrollers.slice(0, 5),
        docHeight: document.documentElement.scrollHeight,
        winHeight: window.innerHeight,
        leaguesCount: leagues.length,
        leaguesSample: leagues.slice(0, 5),
    };
}
"""


SCROLL_STEP_JS = r"""
() => {
    let target = window.__aiscoreScroller;
    if (!(target && target.isConnected)) {
        // 다시 찾는다
        let best = null, bestEx = 0;
        for (const el of document.body.querySelectorAll('div,section,main,article')) {
            if (!(el instanceof HTMLElement)) continue;
            const ex = el.scrollHeight - el.clientHeight;
            if (ex < 80) continue;
            const st = getComputedStyle(el);
            if (!['auto', 'scroll', 'overlay'].includes(st.overflowY)) continue;
            if (ex > bestEx) { best = el; bestEx = ex; }
        }
        target = best;
        window.__aiscoreScroller = target;
    }
    const step = Math.min(Math.max(500, window.innerHeight * 0.85), 1400);
    if (target) {
        const t0 = target.scrollTop;
        target.scrollTop = Math.min(t0 + step, target.scrollHeight - target.clientHeight);
        target.dispatchEvent(new Event('scroll', { bubbles: true }));
        return {
            mode: 'element',
            moved: target.scrollTop - t0,
            scrollTop: target.scrollTop,
            scrollHeight: target.scrollHeight,
            clientHeight: target.clientHeight,
        };
    }
    const y0 = window.scrollY;
    window.scrollBy(0, step);
    return {
        mode: 'window',
        moved: window.scrollY - y0,
        scrollY: window.scrollY,
        docHeight: document.documentElement.scrollHeight,
        winHeight: window.innerHeight,
    };
}
"""


def main() -> int:
    sport = sys.argv[1] if len(sys.argv) > 1 else "football"
    url = (
        "https://www.aiscore.com/ko"
        if sport in ("football", "soccer")
        else f"https://www.aiscore.com/ko/{sport if sport != 'water-polo' else 'waterpolo'}"
    )
    print(f"[diag] url={url}")

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        ctx = browser.new_context(
            locale="ko-KR",
            timezone_id="Asia/Seoul",
            user_agent=(
                "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
            ),
            viewport={"width": 1440, "height": 2400},
        )
        page = ctx.new_page()
        page.goto(url, wait_until="domcontentloaded")
        page.wait_for_selector('a[itemtype*="SportsEvent"]', timeout=20_000)
        page.wait_for_timeout(2500)

        probe0 = page.evaluate(PROBE_JS)
        print("\n[diag] initial probe:")
        print(json.dumps(probe0, ensure_ascii=False, indent=2)[:3000])

        print("\n[diag] scroll trace:")
        prev = probe0["rowsTotal"]
        stagnant = 0
        for i in range(40):
            step = page.evaluate(SCROLL_STEP_JS)
            page.wait_for_timeout(500)
            rows = page.evaluate("() => document.querySelectorAll('a[itemtype*=\"SportsEvent\"]').length")
            delta = rows - prev
            prev = rows
            print(f"  round#{i:02d} rows={rows} (+{delta}) step={step}")
            if delta == 0 and not step.get("moved"):
                stagnant += 1
            elif delta == 0:
                stagnant += 1
            else:
                stagnant = 0
            if stagnant >= 6:
                print("  [diag] stop: 6 rounds no progress")
                break

        print("\n[diag] final probe:")
        probe1 = page.evaluate(PROBE_JS)
        print(f"  rowsTotal={probe1['rowsTotal']} leaguesCount={probe1['leaguesCount']}")
        print(f"  scrollers={json.dumps(probe1['scrollers'], ensure_ascii=False)}")

        browser.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
