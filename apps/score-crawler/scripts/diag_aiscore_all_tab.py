"""'전체' 탭을 눌렀을 때 수집량 변화, 그리고 날짜 탭 탐색."""
from __future__ import annotations

import os
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HERE))
os.environ.setdefault("ASSET_DOWNLOAD_ENABLED", "false")

from playwright.sync_api import sync_playwright  # noqa: E402


FIND_DATE_JS = r"""
() => {
    const out = { all_tab: null, fixture_tab: null, date_arrows: [], date_labels: [] };

    // "전체" 탭
    for (const el of document.querySelectorAll('span.changeItem, .changeItem, span[class*="ActiveTab"]')) {
        const t = (el.textContent || '').trim();
        if (t === '전체' || t.startsWith('전체')) {
            out.all_tab = { cls: el.className, text: t, bounds: el.getBoundingClientRect() };
        }
        if (t === '비품' || t.startsWith('비품')) {
            out.fixture_tab = { cls: el.className, text: t };
        }
    }
    // 날짜 화살표 / 라벨 (흔히 .iconLeft / .iconRight / .dateText / [class*=date])
    for (const el of document.querySelectorAll('[class*="date" i], [class*="calendar" i], i[class*="left" i], i[class*="right" i]')) {
        const t = (el.textContent || '').trim();
        if (t.length > 30) continue;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0) continue;
        out.date_labels.push({ cls: (el.className || '').toString(), text: t, w: Math.round(rect.width), h: Math.round(rect.height) });
    }
    return out;
}
"""

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
        page.wait_for_selector('a[itemtype*="SportsEvent"]', timeout=15000)
        page.wait_for_timeout(2000)

        initial_rows = page.evaluate("() => document.querySelectorAll('a[itemtype*=\"SportsEvent\"]').length")
        print(f"[tabs] initial rows in DOM: {initial_rows}")

        info = page.evaluate(FIND_DATE_JS)
        print("[tabs] all_tab:", info["all_tab"])
        print("[tabs] fixture_tab:", info["fixture_tab"])
        print("[tabs] date labels (first 20):")
        for d in info["date_labels"][:20]:
            print(f"   cls={d['cls'][:60]:<60s} text={d['text']!r} w={d['w']} h={d['h']}")

        # 1) 전체 탭 클릭
        try:
            page.get_by_text("전체", exact=True).first.click(timeout=4000)
            page.wait_for_timeout(2500)
            rows_all = page.evaluate("() => document.querySelectorAll('a[itemtype*=\"SportsEvent\"]').length")
            print(f"[tabs] after click '전체': DOM rows = {rows_all}")
        except Exception as e:
            print(f"[tabs] click '전체' failed: {type(e).__name__}: {e}")

        # 2) 비품 탭 클릭 (예정 경기)
        try:
            page.get_by_text("비품", exact=True).first.click(timeout=4000)
            page.wait_for_timeout(2500)
            rows_fx = page.evaluate("() => document.querySelectorAll('a[itemtype*=\"SportsEvent\"]').length")
            print(f"[tabs] after click '비품': DOM rows = {rows_fx}")
        except Exception as e:
            print(f"[tabs] click '비품' failed: {type(e).__name__}: {e}")

        # 3) 종료 탭 클릭 (끝난 경기)
        try:
            page.get_by_text("종료", exact=True).first.click(timeout=4000)
            page.wait_for_timeout(2500)
            rows_end = page.evaluate("() => document.querySelectorAll('a[itemtype*=\"SportsEvent\"]').length")
            print(f"[tabs] after click '종료': DOM rows = {rows_end}")
        except Exception as e:
            print(f"[tabs] click '종료' failed: {type(e).__name__}: {e}")

        # 4) 스크린샷 저장 (현재 상태)
        page.screenshot(path="/tmp/aiscore_home.png", full_page=False)
        print("[tabs] screenshot: /tmp/aiscore_home.png")

        browser.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
