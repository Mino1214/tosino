"""탭 전환 + 전환 후 스크롤 수집이 정상 동작하는지 단독 테스트.

목표: 전체/종료/비품 각 탭에서 스크롤 내려가며 모이는 unique matchId 수가 얼마인지.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HERE))
os.environ.setdefault("ASSET_DOWNLOAD_ENABLED", "false")

from playwright.sync_api import sync_playwright  # noqa: E402

CLICK_TAB = r"""
(label) => {
    const items = document.querySelectorAll('.changeItem, span.changeItem, span[class*="changeItem"]');
    for (const el of items) {
        const t = (el.textContent || '').replace(/\s+/g, ' ').trim();
        const head = t.split(' ')[0].split('(')[0].trim();
        if (head === label) {
            const wasActive = /activeTab/i.test(el.className || '');
            el.click();
            return { found: true, wasActive, text: t, cls: el.className };
        }
    }
    return { found: false };
}
"""

CURRENT_TAB = r"""
() => {
    const items = document.querySelectorAll('.changeItem, span.changeItem');
    for (const el of items) {
        if (/activeTab/i.test(el.className || '')) {
            return { text: (el.textContent || '').replace(/\s+/g, ' ').trim(), cls: el.className };
        }
    }
    return null;
}
"""

ROW_IDS = r"""
() => {
    const rows = document.querySelectorAll('a[itemtype*="SportsEvent"]');
    const ids = [];
    for (const r of rows) {
        const id = r.getAttribute('data-id') || (r.getAttribute('href') || '').split('/').pop();
        if (id) ids.push(id);
    }
    return ids;
}
"""


def scroll_and_collect(page, name: str, max_rounds: int = 80) -> set:
    collected: set = set()
    stagnant = 0
    last_y = 0
    for i in range(max_rounds):
        ids = page.evaluate(ROW_IDS)
        before = len(collected)
        for x in ids:
            collected.add(x)
        gained = len(collected) - before

        # window scroll
        moved = page.evaluate(
            """() => {
            const step = Math.max(500, window.innerHeight * 0.85);
            const y0 = window.scrollY;
            window.scrollBy(0, step);
            return { y0, y1: window.scrollY, docH: document.documentElement.scrollHeight };
        }"""
        )
        page.wait_for_timeout(450)

        docH = moved["docH"]
        at_bottom = moved["y1"] + page.viewport_size["height"] >= docH - 20
        if moved["y1"] == moved["y0"]:
            stagnant += 1
        elif gained == 0:
            stagnant += 1
        else:
            stagnant = 0

        if (i < 6) or (i % 5 == 0):
            print(f"  [{name}] r#{i:02d} ids={len(ids)} total={len(collected)} (+{gained}) y={moved['y1']}/{docH} bottom={at_bottom}")

        if at_bottom and stagnant >= 3:
            break
        if stagnant >= 8:
            break
        last_y = moved["y1"]

    return collected


def main() -> int:
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        ctx = browser.new_context(
            locale="ko-KR", timezone_id="Asia/Seoul",
            viewport={"width": 1440, "height": 2400},
            user_agent=(
                "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
            ),
        )
        page = ctx.new_page()
        page.goto("https://www.aiscore.com/ko", wait_until="domcontentloaded")
        page.wait_for_selector('a[itemtype*="SportsEvent"]', timeout=15_000)
        page.wait_for_timeout(2500)

        all_ids: set = set()
        for label in ["전체", "종료", "비품", "라이브"]:
            click = page.evaluate(CLICK_TAB, label)
            page.wait_for_timeout(1200)
            cur = page.evaluate(CURRENT_TAB)
            print(f"\n[diag] click '{label}' → {click}")
            print(f"[diag] active now: {cur}")
            # scroll to top
            page.evaluate("() => window.scrollTo(0, 0)")
            page.wait_for_timeout(500)
            ids = scroll_and_collect(page, label, max_rounds=60)
            new_in_tab = ids - all_ids
            print(f"[diag] {label}: collected={len(ids)} new-in-this-tab={len(new_in_tab)}")
            all_ids |= ids
            print(f"[diag] cumulative unique ids across tabs: {len(all_ids)}")

        print(f"\n[diag] GRAND TOTAL unique matches across 4 tabs: {len(all_ids)}")
        browser.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
