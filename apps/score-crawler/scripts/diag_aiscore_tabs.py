"""aiscore 홈 상단의 '어제/오늘/내일/라이브' 같은 필터/탭 탐색."""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HERE))
os.environ.setdefault("ASSET_DOWNLOAD_ENABLED", "false")

from playwright.sync_api import sync_playwright  # noqa: E402

PROBE_JS = r"""
() => {
    const interesting = [];
    const matchBox = document.querySelector('.match-box');
    if (!matchBox) return { error: 'no match-box' };

    // match-box 조상들(위에 있는 상단 영역)
    const top = matchBox.parentElement;
    function scan(root, depth) {
        if (!root || depth > 4) return;
        for (const c of root.children) {
            if (c === matchBox) continue;
            const tag = c.tagName;
            const cls = (c.className || '').toString();
            const id = c.id || '';
            const txt = (c.textContent || '').trim().slice(0, 120);
            const rect = c.getBoundingClientRect();
            interesting.push({
                depth, tag, cls: cls.slice(0, 80), id, txt,
                h: Math.round(rect.height), w: Math.round(rect.width),
                childCount: c.children.length,
            });
            if (c.children.length && c.children.length < 20) scan(c, depth + 1);
        }
    }
    scan(top, 0);

    // 버튼/링크 중 "어제/오늘/내일" 텍스트를 포함한 것
    const dateTab = [];
    const dateRe = /(어제|오늘|내일|yesterday|today|tomorrow)/i;
    for (const el of document.querySelectorAll('a,button,div,span,li')) {
        const t = (el.textContent || '').trim();
        if (t.length > 40) continue;
        if (!dateRe.test(t)) continue;
        // leaf 에 가까운 것만
        if (el.children.length > 4) continue;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0) continue;
        dateTab.push({
            tag: el.tagName,
            cls: (el.className || '').toString().slice(0, 80),
            text: t,
            clickable: el.tagName === 'A' || el.tagName === 'BUTTON' || (el.onclick !== null),
        });
    }

    // 최상단 메뉴/헤더 구조
    const header = document.querySelector('header, .header, [class*="header"]');
    const headerTxt = header ? (header.textContent || '').trim().slice(0, 500) : null;

    return {
        dateTabs: dateTab.slice(0, 30),
        siblings: interesting.slice(0, 30),
        headerTxt,
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
    print(f"[tabs] {url}")

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
        page.goto(url, wait_until="domcontentloaded")
        page.wait_for_selector('a[itemtype*="SportsEvent"]', timeout=15000)
        page.wait_for_timeout(2000)

        info = page.evaluate(PROBE_JS)
        print(json.dumps(info, ensure_ascii=False, indent=2)[:8000])
        browser.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
