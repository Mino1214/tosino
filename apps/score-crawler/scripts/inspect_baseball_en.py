"""baseball en DOM rows 의 실제 attribute 구조 확인."""
from __future__ import annotations

import sys
import time
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

from playwright.sync_api import sync_playwright

UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.6367.155 Safari/537.36"
)


def main() -> None:
    with sync_playwright() as p:
        b = p.chromium.launch(headless=True)
        ctx = b.new_context(
            locale="en-US",
            timezone_id="Asia/Seoul",
            user_agent=UA,
            viewport={"width": 1440, "height": 2400},
        )
        page = ctx.new_page()
        page.goto("https://www.aiscore.com/", wait_until="domcontentloaded")
        page.wait_for_selector('a[itemtype*="SportsEvent"], a.match-container', timeout=30000)
        page.wait_for_timeout(2000)
        page.goto("https://www.aiscore.com/baseball", wait_until="domcontentloaded")
        page.wait_for_selector('a[itemtype*="SportsEvent"], a.match-container', timeout=30000)
        page.wait_for_timeout(3000)

        # All 탭 클릭
        page.evaluate(
            """() => {
                const items = document.querySelectorAll('.changeItem');
                for (const el of items) {
                    const t = (el.textContent||'').trim();
                    if (t === 'All') { el.click(); return; }
                }
            }"""
        )
        page.wait_for_timeout(2500)
        # heavy scroll 로 virtual list 채움
        for _ in range(30):
            page.evaluate("() => window.scrollTo(0, document.body.scrollHeight)")
            time.sleep(0.3)

        rows = page.evaluate(
            """() => {
                const out = [];
                const nodes = document.querySelectorAll('a[itemtype*=\"SportsEvent\"], a.match-container[href*=\"/match-\"], a.match-container[data-id]');
                for (const n of nodes) {
                    out.push({
                        href: n.getAttribute('href'),
                        dataId: n.getAttribute('data-id'),
                        itemtype: n.getAttribute('itemtype'),
                        cls: (n.className || '').slice(0,60),
                        homeText: (n.querySelector('[itemprop=\"homeTeam\"]')?.textContent || '').trim(),
                        awayText: (n.querySelector('[itemprop=\"awayTeam\"]')?.textContent || '').trim(),
                        startDate: n.querySelector('meta[itemprop=\"startDate\"]')?.getAttribute('content'),
                    });
                }
                return out;
            }"""
        )
        print(f"total rows: {len(rows)}")
        for r in rows[:10]:
            print(json.dumps(r, ensure_ascii=False))
        print("...")
        for r in rows[-5:]:
            print(json.dumps(r, ensure_ascii=False))

        # 리그 ancestor 추출 확인
        league_info = page.evaluate(
            """() => {
                const out = [];
                const nodes = document.querySelectorAll('a[itemtype*=\"SportsEvent\"]');
                for (let i = 0; i < Math.min(5, nodes.length); i++) {
                    const row = nodes[i];
                    let cur = row.parentElement;
                    const chain = [];
                    while (cur && cur !== document.body) {
                        const cls = (cur.className || '').toString().trim().slice(0,60);
                        chain.push(`${cur.tagName}.${cls}`);
                        cur = cur.parentElement;
                    }
                    out.push({ idx: i, home: row.querySelector('[itemprop=\"homeTeam\"]')?.textContent?.trim(), chain });
                }
                return out;
            }"""
        )
        print("\nancestor chains:")
        for r in league_info:
            print(json.dumps(r, ensure_ascii=False, indent=2))

        b.close()


if __name__ == "__main__":
    main()
