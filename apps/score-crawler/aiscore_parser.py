"""aiscore.com/ko 종목 페이지 파서.

왜 aiscore 인가:
    * 라이브스포츠보다 구조가 훨씬 안정적 (Vue SSR + 명시적 meta itemprop).
    * startDate 가 `2026-04-21T23:30:00+09:00` 처럼 timezone 포함 ISO → 파싱 생략.
    * 팀 로고/국기가 `img0.aiscore.com` / `img1.aiscore.com` 로 직접 노출.

구조 요약:
    div.match-box
      └─ div.comp-container       ← 리그 1개
           ├─ div.title           ← 리그 헤더 (국가/국기/리그명)
           │   ├─ i.country-logo   (style="background-image: url('…/country/rus.png!w30')")
           │   ├─ span.country-name ("러시아:")
           │   └─ a.compe-name[href="/ko/tournament-russian-premier-league/{id}"] "프리미어 리그"
           └─ div.comp-list
                └─ a.match-container[data-id]    ← 매치 1개
                     ├─ meta[itemprop="startDate"]  (KST ISO)
                     ├─ meta[itemprop="location"]   (리그 백업용)
                     ├─ .name[itemprop="homeTeam"]  홈팀 한글명
                     ├─ .teamLogoHomeBox img        홈팀 로고
                     ├─ .name[itemprop="awayTeam"]
                     ├─ .teamLogoAwayBox img
                     ├─ .score-home / .score-away
                     └─ .status                     상태 ("63", "하프타임", "종료", …)
"""
from __future__ import annotations

import logging
import re
import zlib
from dataclasses import dataclass, field
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, Optional, Sequence
from urllib.parse import urlparse

try:
    from zoneinfo import ZoneInfo
    _KST = ZoneInfo("Asia/Seoul")
except Exception:  # pragma: no cover
    _KST = timezone(timedelta(hours=9))

from playwright.sync_api import (
    Browser,
    BrowserContext,
    Page,
    TimeoutError as PWTimeoutError,
    sync_playwright,
)

from asset_downloader import cache_image

log = logging.getLogger(__name__)

AISCORE_BASE = "https://www.aiscore.com"

# 공식 종목 랜딩(한국어). build_sport_url() 과 동일 규칙.
#   축구:  https://www.aiscore.com/ko
#   그 외: https://www.aiscore.com/ko/{slug}  (water-polo 만 사이트상 waterpolo)
#   baseball, basketball, tennis, volleyball, esports, ice-hockey, cricket,
#   american-football, table-tennis, waterpolo, snooker, badminton
#
# aiscore 는 /ko (soccer) 만 base URL 에 종목을 빼놓음 → 특수케이스.
# 그 외 종목은 /ko/{slug} 로 접근.
SOCCER_ALIASES = {"soccer", "football"}


@dataclass
class RawMatch:
    """aiscore 에서 뽑아낸 경기 row 한 건."""
    source_match_id: Optional[str]
    source_match_href: Optional[str]
    raw_sport_label: Optional[str] = None
    raw_home_name: Optional[str] = None
    raw_home_slug: Optional[str] = None
    raw_home_logo: Optional[str] = None
    raw_away_name: Optional[str] = None
    raw_away_slug: Optional[str] = None
    raw_away_logo: Optional[str] = None
    raw_league_label: Optional[str] = None
    raw_league_slug: Optional[str] = None
    raw_league_logo: Optional[str] = None
    raw_country_label: Optional[str] = None
    raw_country_flag: Optional[str] = None
    raw_kickoff_text: Optional[str] = None
    raw_kickoff_utc: Optional[str] = None
    raw_score_text: Optional[str] = None
    raw_status_text: Optional[str] = None
    raw_payload: dict[str, Any] = field(default_factory=dict)


def build_sport_url(sport_slug: str, *, page_locale: str = "ko") -> str:
    """내부 슬러그를 aiscore URL 로 변환.

    page_locale:
        ko — 한국어 UI (/ko, 축구만 /ko 루트)
        en — 영어 UI (축구는 사이트 루트 `/`, 그 외는 `/baseball` 등 /ko 없음)

    내부 표준 slug 는 odds-api.io 기준:
        football → /ko (aiscore 는 축구를 루트에 둠)
        baseball → /ko/baseball
        basketball → /ko/basketball
        tennis → /ko/tennis
        volleyball → /ko/volleyball
        esports → /ko/esports
        ice-hockey → /ko/ice-hockey
        cricket → /ko/cricket
        american-football → /ko/american-football
        table-tennis → /ko/table-tennis
        water-polo → /ko/waterpolo   (aiscore 는 하이픈 없음)
        snooker → /ko/snooker
        badminton → /ko/badminton
    """
    pl = (page_locale or "ko").strip().lower()
    if pl not in ("ko", "en"):
        pl = "ko"
    if sport_slug in SOCCER_ALIASES:
        if pl == "en":
            return f"{AISCORE_BASE}/"
        return f"{AISCORE_BASE}/ko"
    slug = sport_slug
    if sport_slug == "water-polo":
        slug = "waterpolo"  # aiscore 만 특이하게 한 단어
    if pl == "en":
        return f"{AISCORE_BASE}/{slug}"
    return f"{AISCORE_BASE}/ko/{slug}"


def _slugify(name: Optional[str]) -> Optional[str]:
    if not name:
        return None
    s = name.strip().lower()
    s = re.sub(r"\s+", "-", s)
    s = re.sub(r"[^a-z0-9\-]", "", s)
    return s or None


# href 파싱 실패·placeholder(`;` 등) 시 truthy 라서 라벨 기반 폴백이 스킵되는 문제 방지
_LEAGUE_SLUG_ALNUM = re.compile(r"[a-z0-9]", re.I)


def _is_usable_league_slug(slug: Optional[str]) -> bool:
    if not slug or not isinstance(slug, str):
        return False
    s = slug.strip()
    if not s:
        return False
    return bool(_LEAGUE_SLUG_ALNUM.search(s))


def _abs_url(u: Optional[str]) -> Optional[str]:
    if not u:
        return None
    u = u.strip()
    if not u:
        return None
    if u.startswith("data:"):
        return None
    if u.startswith("//"):
        return "https:" + u
    if u.startswith("/"):
        return f"{AISCORE_BASE}{u}"
    return u


def _parse_league_slug_from_href(href: Optional[str]) -> Optional[str]:
    """href="/ko/tournament-russian-premier-league/{id}" → "russian-premier-league/{id}"
    영어 UI 는 `/tournament-...` (접두 /ko 없음) 도 동일 규칙으로 처리.
    또는 "russian-premier-league" 만 (id 제거).
    일관성을 위해 **slug + id** 를 하나의 key 로 사용 (중복 리그명 구분).
    """
    if not href:
        return None
    m = re.match(r"^/(?:ko/)?tournament-(.+?)/([a-z0-9]+)/?$", href)
    if m:
        out = f"{m.group(1)}/{m.group(2)}"
        return out if _is_usable_league_slug(out) else None
    # fallback
    try:
        path = urlparse(href).path
    except Exception:
        return None
    if path.startswith("/ko/"):
        out = path[len("/ko/"):].strip("/")
    else:
        out = path.strip("/")
    return out if _is_usable_league_slug(out) else None


# fetch_sport_page 가 스크롤 루프마다 호출 — maxRows<=0 이면 DOM 스냅샷당 상한 없음.
_AISCORE_DOM_ROWS_JS = r"""
(maxRows) => {
    const out = [];

    const getMetaContent = (root, itemprop) => {
        const el = root.querySelector(`meta[itemprop="${itemprop}"]`);
        return el ? el.getAttribute('content') : null;
    };
    const pickText = (el, sels) => {
        for (const s of sels) {
            const n = el.querySelector(s);
            if (n) {
                const t = (n.textContent || '').trim();
                if (t) return t;
            }
        }
        return null;
    };
    const pickAttr = (el, sels, attr) => {
        for (const s of sels) {
            const n = el.querySelector(s);
            if (n) {
                const v = n.getAttribute(attr);
                if (v) return v;
            }
        }
        return null;
    };
    const bgImage = (el) => {
        if (!el) return null;
        const s = (el.getAttribute('style') || '') + '';
        const m = s.match(/url\(\s*['"]?([^'")]+)['"]?\s*\)/i);
        if (m) return m[1];
        try {
            const cs = getComputedStyle(el).backgroundImage || '';
            const m2 = cs.match(/url\(\s*['"]?([^'")]+)['"]?\s*\)/i);
            if (m2) return m2[1];
        } catch (_) {}
        return null;
    };

    // 축구 등: a.match-container[data-id] 만 있고 itemtype 이 없는 빌드/로케일이 있음 → 둘 다 잡고 data-id 로 중복 제거
    const rawNodes = Array.from(document.querySelectorAll(
        'a[itemtype*="SportsEvent"], a.match-container[href*="/match-"], a.match-container[data-id]'
    ));
    // baseball 등 비축구 영어 페이지 href 는 `/baseball/match-<slug>/<id>` 또는
    // `/baseball/match-<slug>/<id>/h2h` 식으로 끝 segment 가 "h2h|stats|..." 일 수 있어
    // 단순히 마지막 segment 를 matchId 로 쓰면 모두 "h2h" 로 collapse 되어 dedup 때문에 1개만 남는다.
    // → `match-...` segment 바로 뒤의 id-like 를 우선 사용.
    const extractMatchId = (href) => {
        if (!href) return null;
        const parts = href.split('/').filter(Boolean);
        if (parts.length === 0) return null;
        const mi = parts.findIndex((p) => p && p.startsWith('match-'));
        if (mi >= 0 && mi + 1 < parts.length) {
            const candidate = parts[mi + 1];
            if (candidate) return candidate;
        }
        // fallback: 뒤에서부터 h2h/stats/lineup 등 suffix 를 제거
        const SUFFIX = new Set(['h2h', 'stats', 'stat', 'lineup', 'lineups', 'odds', 'info', 'standings', 'events', 'events-h2h']);
        for (let i = parts.length - 1; i >= 0; i--) {
            const v = (parts[i] || '').toLowerCase();
            if (!v) continue;
            if (SUFFIX.has(v)) continue;
            return parts[i];
        }
        return parts[parts.length - 1] || null;
    };
    const byMatchId = new Map();
    for (const m of rawNodes) {
        const href0 = m.getAttribute('href') || '';
        let mid = m.getAttribute('data-id');
        if (!mid && href0) mid = extractMatchId(href0);
        if (!mid) continue;
        if (!byMatchId.has(mid)) byMatchId.set(mid, m);
    }
    const rows = Array.from(byMatchId.values());

    const compCache = new WeakMap();
    function compInfoFor(row) {
        let cur = row;
        while (cur && cur !== document.body) {
            if (cur.classList && cur.classList.contains('comp-container')) {
                if (compCache.has(cur)) return compCache.get(cur);
                const title = cur.querySelector('.title');
                const info = {
                    leagueLabel: null,
                    leagueHref: null,
                    leagueLogo: null,
                    countryLabel: null,
                    countryFlag: null,
                };
                if (title) {
                    const nameEl = title.querySelector('a.compe-name');
                    if (nameEl) {
                        info.leagueLabel = (nameEl.textContent || '').trim() || null;
                        info.leagueHref = nameEl.getAttribute('href');
                    }
                    const countryEl = title.querySelector('.country-name');
                    if (countryEl) {
                        info.countryLabel = (countryEl.textContent || '')
                            .replace(/:$/, '').trim() || null;
                    }
                    const flagEl = title.querySelector('.country-logo');
                    info.countryFlag = bgImage(flagEl);
                    const logoImg = title.querySelector(
                        '.compe-logo img, .comp-logo img'
                    );
                    if (logoImg) info.leagueLogo = logoImg.getAttribute('src');
                }
                compCache.set(cur, info);
                return info;
            }
            cur = cur.parentElement;
        }
        return null;
    }

    const cap = (typeof maxRows === 'number' && maxRows > 0) ? maxRows : 999999;

    for (const m of rows) {
        const href = m.getAttribute('href');
        let matchId = m.getAttribute('data-id');
        if (!matchId && href) {
            matchId = extractMatchId(href);
        }

        const startDate = getMetaContent(m, 'startDate');
        const metaLocation = getMetaContent(m, 'location');

        const home = pickText(m, [
            '[itemprop="homeTeam"]',
        ]);
        const away = pickText(m, [
            '[itemprop="awayTeam"]',
        ]);

        let homeLogo = pickAttr(m, ['.teamLogoHomeBox img'], 'src');
        let awayLogo = pickAttr(m, ['.teamLogoAwayBox img'], 'src');
        if (!homeLogo || !awayLogo) {
            const logos = m.querySelectorAll('img[itemprop="logo"]');
            if (logos.length >= 2) {
                if (!homeLogo) homeLogo = logos[0].getAttribute('src');
                if (!awayLogo) awayLogo = logos[1].getAttribute('src');
            } else if (logos.length === 1 && !homeLogo) {
                homeLogo = logos[0].getAttribute('src');
            }
        }

        const timeText = pickText(m, [
            '.time', '.matchTime', '[class*="matchTime"]', '[class*="time"]',
        ]);
        const statusText = pickText(m, [
            '.status', '.barStatus2', '[class*="barStatus"]',
            '.status-text', '[class*="status"]',
        ]);
        const scoreHome = pickText(m, [
            '.score-home', '.scoreRed', '[class*="score-home"]',
            '[class*="homeScore"]',
        ]);
        const scoreAway = pickText(m, [
            '.score-away', '.scoreBlue', '[class*="score-away"]',
            '[class*="awayScore"]',
        ]);

        const comp = compInfoFor(m) || {};

        out.push({
            matchId,
            href,
            startDate,
            metaLocation,
            home, away, homeLogo, awayLogo,
            timeText, statusText, scoreHome, scoreAway,
            leagueLabel: comp.leagueLabel || metaLocation || null,
            leagueHref: comp.leagueHref || null,
            leagueLogo: comp.leagueLogo || null,
            countryLabel: comp.countryLabel || null,
            countryFlag: comp.countryFlag || null,
        });
        if (out.length >= cap) break;
    }
    return out;
}
"""

_AISCORE_PIN_SCROLLER_JS = r"""
() => {
    // 가장 큰 세로 overflow 요소를 찾아 window에 저장
    let best = null;
    let bestEx = 0;
    const all = document.body.querySelectorAll('div,section,article,main');
    for (const el of all) {
        if (!(el instanceof HTMLElement)) continue;
        const ex = el.scrollHeight - el.clientHeight;
        if (ex < 80) continue;
        const st = getComputedStyle(el);
        if (st.overflowY !== 'auto' && st.overflowY !== 'scroll' && st.overflowY !== 'overlay') continue;
        if (ex > bestEx) { bestEx = ex; best = el; }
    }
    // vue-recycle-scroller 우선
    const vrs = document.querySelector('.vue-recycle-scroller, [class*="vue-recycle-scroller"]');
    if (vrs instanceof HTMLElement) {
        const ex = vrs.scrollHeight - vrs.clientHeight;
        if (ex >= 80) { best = vrs; bestEx = ex; }
    }
    window.__aiscoreScroller = best;
    window.__aiscoreUsesWindow = !best;
    return { pinned: !!best, exceed: bestEx, tag: best ? best.tagName : null, cls: best ? best.className : null };
}
"""

# 상단 탭: 한국어 "전체/종료/비품/라이브", 영어 All/Finished/… 등 후보 배열로 매칭.
_AISCORE_CLICK_TAB_JS = r"""
(candidates) => {
    const cand = Array.isArray(candidates) ? candidates : [candidates];
    const isActive = (el) => {
        if (!el || !el.classList) return false;
        return el.classList.contains('activeTab')
            || el.classList.contains('activeLiveTab');
    };
    const items = document.querySelectorAll('.changeItem, span.changeItem, span[class*="changeItem"]');
    for (const el of items) {
        const t = (el.textContent || '').replace(/\s+/g, ' ').trim();
        const head = t.split(' ')[0].split('(')[0].trim();
        for (const label of cand) {
            if (!label) continue;
            if (head === label || t === label || t.startsWith(label + ' ') || t.startsWith(label + '(')) {
                if (isActive(el)) {
                    return { clicked: false, alreadyActive: true, text: t, cls: el.className };
                }
                el.click();
                return { clicked: true, alreadyActive: false, text: t, cls: el.className };
            }
        }
    }
    return { clicked: false, alreadyActive: false, text: null };
}
"""

# fetch_sport_page 탭 순회: (후보 문자열, …) 튜플을 로케일별로 둔다.
#
# 영어(en) 페이지 DOM:
#   * 한국어(/ko)와 **같은 클래스**(.changeItem, .comp-container, a[itemtype*="SportsEvent"] 등)를 쓴다.
#   * curl 로는 Cloudflare 403 → 실제 탭 문구는 Playwright 로만 확실히 볼 수 있음.
#   * 로컬에서 탭 라벨을 덤프: cd apps/score-crawler && .venv/bin/python scripts/inspect_aiscore_locale_tabs.py --both
#     (시스템 python 으로 실행해도 스크립트가 .venv 로 재실행 시도)
#   * 출력된 uniqTabs 를 보고 AIS_TAB_GROUPS["en"] 후보를 맞추면 된다.
AIS_TAB_GROUPS: dict[str, tuple[tuple[str, ...], ...]] = {
    "ko": (("전체",), ("종료",), ("비품",), ("라이브",)),
    # 실측(scripts/inspect_aiscore_locale_tabs.py --locale en): All | Live (N) | Finished | Scheduled
    "en": (
        ("All", "전체"),
        ("Finished", "Ended", "종료"),
        ("Scheduled", "Upcoming", "Fixtures", "Fixture", "비품"),
        ("Live", "라이브"),
    ),
}

# 탭/페이지 전환 후 맨 위로
_AISCORE_SCROLL_TOP_JS = r"""
() => {
    const el = window.__aiscoreScroller;
    if (el && el.isConnected) {
        el.scrollTop = 0;
        el.dispatchEvent(new Event('scroll', { bubbles: true }));
    }
    window.scrollTo(0, 0);
}
"""

_AISCORE_SCROLL_PINNED_JS = r"""
() => {
    const step = Math.min(Math.max(500, window.innerHeight * 0.85), 1400);
    const el = window.__aiscoreScroller;
    if (el && el.isConnected) {
        const t0 = el.scrollTop;
        el.scrollTop = Math.min(t0 + step, el.scrollHeight - el.clientHeight);
        // scroll 이벤트 강제 디스패치 (일부 virtual scroller가 이벤트 기반으로 렌더)
        el.dispatchEvent(new Event('scroll', { bubbles: true }));
        return Math.abs(el.scrollTop - t0) > 2;
    }
    const y0 = window.scrollY;
    window.scrollBy(0, step);
    return Math.abs(window.scrollY - y0) > 2;
}
"""

_AISCORE_AT_BOTTOM_JS = r"""
() => {
    const eps = 20;
    const elBottom = (el) => {
        if (!el) return true;
        if (el.scrollHeight <= el.clientHeight + eps) return true;
        return el.scrollTop + el.clientHeight >= el.scrollHeight - eps;
    };

    let best = null;
    let bestEx = 0;
    for (const el of document.body.querySelectorAll('div,section,article,main')) {
        if (!(el instanceof HTMLElement)) continue;
        const ex = el.scrollHeight - el.clientHeight;
        if (ex < 80) continue;
        const st = getComputedStyle(el);
        if (st.overflowY !== 'auto' && st.overflowY !== 'scroll') continue;
        if (ex > bestEx) {
            bestEx = ex;
            best = el;
        }
    }

    // 바깥 문서는 짧은데 안쪽 리스트만 긴 레이아웃: window "하단"은 쓰지 않는다.
    // (winBottom 이 항상 true 면 stagnant>=2 에서 바로 루프 종료 → 8건만 수집되는 버그)
    if (best && bestEx >= 80) {
        return elBottom(best);
    }

    const docH = document.documentElement.scrollHeight;
    return window.innerHeight + window.scrollY >= docH - eps;
}
"""


class AiscoreParser:
    """aiscore.com — 한국어(/ko)·영어(루트 등) 페이지 파서 (브라우저 1개·컨텍스트 교체)."""

    def __init__(
        self,
        *,
        headless: bool = True,
        nav_timeout_ms: int = 30_000,
        wait_after_load_ms: int = 2_500,
        scroll_passes: int = 10,
        scroll_collect_max_rounds: int = 140,
        page_locale: str = "ko",
        asset_hints: Optional[Dict[str, Any]] = None,
    ):
        self.headless = headless
        self.nav_timeout_ms = nav_timeout_ms
        self.wait_after_load_ms = wait_after_load_ms
        self.scroll_passes = scroll_passes
        self.scroll_collect_max_rounds = max(8, scroll_collect_max_rounds)
        pl = (page_locale or "ko").strip().lower()
        self.page_locale = pl if pl in ("ko", "en") else "ko"

        self._pw = None
        self._browser: Optional[Browser] = None
        self._ctx: Optional[BrowserContext] = None
        self._page: Optional[Page] = None
        self._active_page_locale: Optional[str] = None

        self._team_logo_hints: dict[str, str] = {}
        self._league_logo_hints: dict[str, str] = {}
        self._league_flag_hints: dict[str, str] = {}
        if asset_hints:
            for row in asset_hints.get("teams") or []:
                if not isinstance(row, dict):
                    continue
                ss = (row.get("sourceSportSlug") or "").strip()
                nm = (row.get("sourceTeamName") or "").strip()
                logo = (row.get("logoUrl") or "").strip()
                if ss and nm and logo:
                    self._team_logo_hints[f"{ss}\t{nm}"] = logo
            for row in asset_hints.get("leagues") or []:
                if not isinstance(row, dict):
                    continue
                ss = (row.get("sourceSportSlug") or "").strip()
                lslug = (row.get("sourceLeagueSlug") or "").strip()
                if not (ss and lslug):
                    continue
                k = f"{ss}\t{lslug}"
                ll = (row.get("leagueLogo") or "").strip()
                cf = (row.get("countryFlag") or "").strip()
                if ll:
                    self._league_logo_hints[k] = ll
                if cf:
                    self._league_flag_hints[k] = cf

    def __enter__(self) -> "AiscoreParser":
        self._pw = sync_playwright().start()
        self._browser = self._pw.chromium.launch(headless=self.headless)
        self.reload_context_for_locale(self.page_locale)
        return self

    def reload_context_for_locale(self, page_locale: str) -> None:
        """동일 브라우저에서 Playwright 컨텍스트만 바꿔 ko/en UI 를 전환 (축구 이중 수집용)."""
        pl = (page_locale or "ko").strip().lower()
        if pl not in ("ko", "en"):
            pl = "ko"
        if self._page and self._ctx and self._active_page_locale == pl:
            return
        if self._page:
            try:
                self._page.close()
            except Exception:
                pass
            self._page = None
        if self._ctx:
            try:
                self._ctx.close()
            except Exception:
                pass
            self._ctx = None
        if not self._browser:
            raise RuntimeError("AiscoreParser.reload_context_for_locale: browser not started")
        loc = "en-US" if pl == "en" else "ko-KR"
        self._ctx = self._browser.new_context(
            locale=loc,
            timezone_id="Asia/Seoul",
            user_agent=(
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.6367.155 Safari/537.36"
            ),
            viewport={"width": 1440, "height": 2400},
        )
        self._ctx.set_default_navigation_timeout(self.nav_timeout_ms)
        self._ctx.set_default_timeout(self.nav_timeout_ms)
        self._page = self._ctx.new_page()
        self._active_page_locale = pl

        # Cloudflare "Just a moment..." interstitial 을 통과시키기 위한 warmup.
        # 새 context 는 쿠키가 비어 있어 sport 페이지로 바로 가면 challenge 에 걸려
        # 부분 렌더(상단 live 몇 경기만)만 얻는 문제가 있다.
        #   1) 홈(/ 또는 /ko) 에 먼저 접속해 Cloudflare JS challenge 통과를 기다리고
        #   2) SportsEvent row 가 실제로 나타날 때까지 wait_for_selector
        try:
            warm_url = f"{AISCORE_BASE}/" if pl == "en" else f"{AISCORE_BASE}/ko"
            self._page.goto(warm_url, wait_until="domcontentloaded")
            try:
                self._page.wait_for_selector(
                    'a[itemtype*="SportsEvent"], a.match-container, .comp-container',
                    timeout=self.nav_timeout_ms,
                )
            except PWTimeoutError:
                pass
            self._page.wait_for_timeout(1500)
        except Exception as e:  # pragma: no cover
            log.warning("aiscore warmup failed for locale=%s: %s", pl, e)

    def __exit__(self, exc_type, exc, tb):
        try:
            if self._page:
                try:
                    self._page.close()
                except Exception:
                    pass
            if self._ctx:
                self._ctx.close()
        finally:
            try:
                if self._browser:
                    self._browser.close()
            finally:
                if self._pw:
                    self._pw.stop()

    # ── 헬스체크 ──────────────────────────────────────────────────────────
    def healthcheck(self) -> dict:
        assert self._page, "AiscoreParser must be used as context manager"
        try:
            hc_url = f"{AISCORE_BASE}/" if self._active_page_locale == "en" else f"{AISCORE_BASE}/ko"
            resp = self._page.goto(hc_url, wait_until="domcontentloaded")
            http = resp.status if resp else 0
            if 200 <= http < 400:
                return {"status": "ok", "http": http, "note": None}
            return {"status": "fail", "http": http, "note": f"http {http}"}
        except PWTimeoutError as e:
            return {"status": "fail", "http": 0, "note": f"timeout: {e}"}
        except Exception as e:
            return {"status": "fail", "http": 0, "note": f"{type(e).__name__}: {e}"}

    def _hinted_team_logo(self, sport_slug: str, name: Optional[str]) -> Optional[str]:
        if not name or not self._team_logo_hints:
            return None
        return self._team_logo_hints.get(f"{sport_slug}\t{name.strip()}")

    def _hinted_league_logo(self, sport_slug: str, league_slug: Optional[str]) -> Optional[str]:
        if not league_slug or not self._league_logo_hints:
            return None
        return self._league_logo_hints.get(f"{sport_slug}\t{league_slug.strip()}")

    def _hinted_country_flag(self, sport_slug: str, league_slug: Optional[str]) -> Optional[str]:
        if not league_slug or not self._league_flag_hints:
            return None
        return self._league_flag_hints.get(f"{sport_slug}\t{league_slug.strip()}")

    # ── 탭 전환 ───────────────────────────────────────────────────────────
    def _switch_tab_group(self, candidates: Sequence[str]) -> dict:
        """상단 탭을 후보 라벨 중 하나로 전환. 반환: {clicked, alreadyActive, text}.

        aiscore 영어 페이지는 virtual list 가 탭 전환 후 비동기로 다시 렌더되어
        900ms 로는 DOM row 가 0 인 상태에서 수집이 시작되는 경우가 있다.
        → 클릭 성공 시 가상 리스트 row 가 다시 나타날 때까지 명시적으로 wait.
        """
        assert self._page
        c = [x for x in candidates if x]
        if not c:
            return {"clicked": False, "alreadyActive": False, "text": None}
        try:
            info = self._page.evaluate(_AISCORE_CLICK_TAB_JS, c)
        except Exception as e:
            return {"clicked": False, "alreadyActive": False, "text": None, "error": str(e)}
        if info.get("clicked"):
            self._page.wait_for_timeout(1500)
            try:
                self._page.wait_for_selector(
                    '.match-container, a[itemtype*="SportsEvent"], a[href*="/match-"]',
                    timeout=self.nav_timeout_ms / 3,
                )
            except PWTimeoutError:
                pass
            self._page.wait_for_timeout(600)
        return info

    # ── 한 탭에서 DOM 스크롤·수집 루프 ─────────────────────────────────────
    def _collect_current_tab(
        self,
        merged: dict[str, dict[str, Any]],
        *,
        lim: int,
    ) -> int:
        """현재 활성 탭에서 스크롤 내려가며 `merged` (matchId → row) 에 누적.

        반환: 이 탭 호출로 추가된 고유 매치 수.
        """
        assert self._page
        page = self._page

        # 탭이 바뀌면 스크롤 컨테이너가 재생성될 수 있으므로 매번 pin 을 다시 시도.
        try:
            page.evaluate(_AISCORE_PIN_SCROLLER_JS)
        except Exception:
            pass

        # 탭 전환 후에는 맨 위로 올려 처음부터 수집.
        try:
            page.evaluate(_AISCORE_SCROLL_TOP_JS)
            page.wait_for_timeout(800)
        except Exception:
            pass

        added_before = len(merged)
        stagnant = 0
        STAGNANT_LIMIT = 15  # virtual list 초반 빈 라운드를 허용

        for _ in range(self.scroll_collect_max_rounds):
            batch = page.evaluate(_AISCORE_DOM_ROWS_JS, -1)
            if not isinstance(batch, list):
                batch = []
            n_before = len(merged)
            for row in batch:
                mid = row.get("matchId")
                if not mid:
                    continue
                merged[str(mid)] = row
            gained = len(merged) - n_before

            if len(merged) >= lim:
                break

            moved = False
            try:
                moved = bool(page.evaluate(_AISCORE_SCROLL_PINNED_JS))
            except Exception:
                pass
            page.wait_for_timeout(450)

            if gained == 0 and not moved:
                stagnant += 1
            elif gained == 0:
                stagnant += 1
            else:
                stagnant = 0

            try:
                at_bottom = bool(page.evaluate(_AISCORE_AT_BOTTOM_JS))
            except Exception:
                at_bottom = False
            if at_bottom and stagnant >= 5:
                break
            if stagnant >= STAGNANT_LIMIT:
                break

        return len(merged) - added_before

    # ── 페이지 페치 ───────────────────────────────────────────────────────
    def fetch_sport_page(
        self,
        sport_slug: str,
        *,
        limit_rows: int = 20,
    ) -> tuple[str, list[RawMatch]]:
        assert self._page, "AiscoreParser must be used as context manager"
        ploc = self._active_page_locale or "ko"
        url = build_sport_url(sport_slug, page_locale=ploc)
        page = self._page
        page.goto(url, wait_until="domcontentloaded")
        # 축구는 .match-container, 그 외 종목은 a[itemtype*="SportsEvent"] 만 사용.
        # 두 후보 중 먼저 나타나는 쪽을 기다림.
        try:
            page.wait_for_selector(
                '.match-container, a[itemtype*="SportsEvent"], a[href*="/match-"]',
                timeout=self.nav_timeout_ms / 2,
            )
        except PWTimeoutError:
            pass
        if self.wait_after_load_ms:
            page.wait_for_timeout(self.wait_after_load_ms)

        merged: dict[str, dict[str, Any]] = {}
        lim = max(1, int(limit_rows))

        # aiscore 는 상단에 "전체 / 라이브 / 종료 / 비품(예정)" 탭이 있고,
        # 각 탭이 경기 집합을 독립적으로 보여준다. 라이브 탭은 '전체' 에 포함되는
        # 경우도 있지만 보장되지 않아 명시적으로 4개 다 돈다.
        # 클릭 순서:
        #   1) 전체    - 오늘의 전체 경기 (가장 많음)
        #   2) 종료    - 이미 끝난 경기 (status 확정)
        #   3) 비품    - 예정된 경기 (upcoming)
        #   4) 라이브  - 현재 진행중 (재확인용)
        tab_groups = AIS_TAB_GROUPS.get(ploc, AIS_TAB_GROUPS["ko"])
        tab_stats: list[tuple[str, int, dict]] = []

        for candidates in tab_groups:
            if len(merged) >= lim:
                break
            info = self._switch_tab_group(candidates)
            gained = self._collect_current_tab(merged, lim=lim)
            tab_lbl = candidates[0] if len(candidates) == 1 else "/".join(candidates[:2])
            tab_stats.append((tab_lbl, gained, info))
            log.debug(
                "aiscore[%s][%s] tab=%s clicked=%s alreadyActive=%s gained=%d total=%d",
                sport_slug, ploc, tab_lbl, info.get("clicked"), info.get("alreadyActive"),
                gained, len(merged),
            )

        log.info(
            "aiscore[%s][%s] tab summary: %s → total=%d (cap=%d)",
            sport_slug, ploc,
            ", ".join(f"{lbl}+{g}" for lbl, g, _ in tab_stats),
            len(merged),
            lim,
        )

        raw_rows = sorted(
            merged.values(),
            key=lambda r: (r.get("startDate") or "", r.get("href") or ""),
        )[:lim]

        matches: list[RawMatch] = []
        for r in raw_rows:
            # startDate 는 aiscore 가 이미 KST ISO 로 내려줌.
            kickoff_utc: Optional[str] = None
            sd = r.get("startDate")
            if sd:
                try:
                    dt = datetime.fromisoformat(sd.replace("Z", "+00:00"))
                    kickoff_utc = dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
                except Exception:
                    pass

            score_text = None
            sh = r.get("scoreHome")
            sa = r.get("scoreAway")
            if sh or sa:
                score_text = f"{sh or ''}:{sa or ''}".strip(":")

            href = _abs_url(r.get("href"))

            # 리그 슬러그 확정:
            #   - 축구(leagueHref 있음): /ko/tournament-xxx/{id} → "xxx/{id}"
            #   - 그 외 종목: tournament 링크가 없으므로 "sport/<slugified-league-label>" 로 합성.
            league_slug = _parse_league_slug_from_href(r.get("leagueHref"))
            if not _is_usable_league_slug(league_slug):
                league_slug = None
            if not league_slug:
                league_label = r.get("leagueLabel") or r.get("metaLocation")
                sl = _slugify(league_label)
                if sl:
                    league_slug = f"{sport_slug}/{sl}"
                else:
                    t = (league_label or "").strip()
                    if t:
                        h = zlib.crc32(t.encode("utf-8")) & 0xFFFFFFFF
                        league_slug = f"{sport_slug}/u{h:08x}"

            home_nm = r.get("home")
            away_nm = r.get("away")
            ls_for_hint = (league_slug or "").strip() or None
            # 로고/국기: DB 확정 매핑에 로컬 `/assets/` 가 있으면 원격 fetch 생략
            home_logo = self._hinted_team_logo(sport_slug, home_nm) or cache_image(
                _abs_url(r.get("homeLogo")), bucket="team"
            )
            away_logo = self._hinted_team_logo(sport_slug, away_nm) or cache_image(
                _abs_url(r.get("awayLogo")), bucket="team"
            )
            league_logo = self._hinted_league_logo(sport_slug, ls_for_hint) or cache_image(
                _abs_url(r.get("leagueLogo")), bucket="league"
            )
            country_flag = self._hinted_country_flag(sport_slug, ls_for_hint) or cache_image(
                _abs_url(r.get("countryFlag")), bucket="flag"
            )

            matches.append(
                RawMatch(
                    source_match_id=r.get("matchId"),
                    source_match_href=href,
                    raw_home_name=home_nm,
                    raw_home_slug=_slugify(home_nm),
                    raw_home_logo=home_logo,
                    raw_away_name=away_nm,
                    raw_away_slug=_slugify(away_nm),
                    raw_away_logo=away_logo,
                    raw_league_label=r.get("leagueLabel"),
                    raw_league_slug=league_slug,
                    raw_league_logo=league_logo,
                    raw_country_label=r.get("countryLabel"),
                    raw_country_flag=country_flag,
                    raw_kickoff_text=r.get("timeText"),
                    raw_kickoff_utc=kickoff_utc,
                    raw_score_text=score_text,
                    raw_status_text=r.get("statusText"),
                    raw_payload={
                        "pageLocale": ploc,
                        "startDate": sd,
                        "metaLocation": r.get("metaLocation"),
                        "leagueHref": r.get("leagueHref"),
                        "scoreHome": sh,
                        "scoreAway": sa,
                    },
                )
            )

        return (url, matches)
