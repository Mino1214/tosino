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
from dataclasses import dataclass, field
from datetime import datetime, timezone, timedelta
from typing import Any, Optional
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


def build_sport_url(sport_slug: str) -> str:
    """내부 슬러그를 aiscore URL 로 변환.

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
    if sport_slug in SOCCER_ALIASES:
        return f"{AISCORE_BASE}/ko"
    slug = sport_slug
    if sport_slug == "water-polo":
        slug = "waterpolo"  # aiscore 만 특이하게 한 단어
    return f"{AISCORE_BASE}/ko/{slug}"


def _slugify(name: Optional[str]) -> Optional[str]:
    if not name:
        return None
    s = name.strip().lower()
    s = re.sub(r"\s+", "-", s)
    s = re.sub(r"[^a-z0-9\-]", "", s)
    return s or None


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
    또는 "russian-premier-league" 만 (id 제거).
    일관성을 위해 **slug + id** 를 하나의 key 로 사용 (중복 리그명 구분).
    """
    if not href:
        return None
    m = re.match(r"^/ko/tournament-(.+?)/([a-z0-9]+)/?$", href)
    if m:
        return f"{m.group(1)}/{m.group(2)}"
    # fallback
    try:
        path = urlparse(href).path
    except Exception:
        return None
    if path.startswith("/ko/"):
        return path[len("/ko/"):].strip("/")
    return path.strip("/")


class AiscoreParser:
    """aiscore.com/ko 파서 (Playwright 단일 탭 재사용)."""

    def __init__(
        self,
        *,
        headless: bool = True,
        nav_timeout_ms: int = 30_000,
        wait_after_load_ms: int = 2_500,
        scroll_passes: int = 3,
    ):
        self.headless = headless
        self.nav_timeout_ms = nav_timeout_ms
        self.wait_after_load_ms = wait_after_load_ms
        self.scroll_passes = scroll_passes

        self._pw = None
        self._browser: Optional[Browser] = None
        self._ctx: Optional[BrowserContext] = None
        self._page: Optional[Page] = None

    def __enter__(self) -> "AiscoreParser":
        self._pw = sync_playwright().start()
        self._browser = self._pw.chromium.launch(headless=self.headless)
        self._ctx = self._browser.new_context(
            locale="ko-KR",
            timezone_id="Asia/Seoul",
            user_agent=(
                "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
            ),
            viewport={"width": 1440, "height": 1600},
        )
        self._ctx.set_default_navigation_timeout(self.nav_timeout_ms)
        self._ctx.set_default_timeout(self.nav_timeout_ms)
        self._page = self._ctx.new_page()
        return self

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
            resp = self._page.goto(f"{AISCORE_BASE}/ko", wait_until="domcontentloaded")
            http = resp.status if resp else 0
            if 200 <= http < 400:
                return {"status": "ok", "http": http, "note": None}
            return {"status": "fail", "http": http, "note": f"http {http}"}
        except PWTimeoutError as e:
            return {"status": "fail", "http": 0, "note": f"timeout: {e}"}
        except Exception as e:
            return {"status": "fail", "http": 0, "note": f"{type(e).__name__}: {e}"}

    # ── 페이지 페치 ───────────────────────────────────────────────────────
    def fetch_sport_page(
        self,
        sport_slug: str,
        *,
        limit_rows: int = 20,
    ) -> tuple[str, list[RawMatch]]:
        assert self._page, "AiscoreParser must be used as context manager"
        url = build_sport_url(sport_slug)
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

        # vue-recycle-scroller 기반이라 스크롤해야 뒤쪽 리그가 렌더됨
        for _ in range(max(0, self.scroll_passes)):
            try:
                page.evaluate("window.scrollBy(0, window.innerHeight * 1.2)")
            except Exception:
                break
            page.wait_for_timeout(500)
        try:
            page.evaluate("window.scrollTo(0, 0)")
        except Exception:
            pass
        page.wait_for_timeout(400)

        raw_rows: list[dict[str, Any]] = page.evaluate(
            """
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
                    const m = s.match(/url\\(\\s*['\"]?([^'\")]+)['\"]?\\s*\\)/i);
                    if (m) return m[1];
                    try {
                        const cs = getComputedStyle(el).backgroundImage || '';
                        const m2 = cs.match(/url\\(\\s*['\"]?([^'\")]+)['\"]?\\s*\\)/i);
                        if (m2) return m2[1];
                    } catch (_) {}
                    return null;
                };

                // Schema.org itemprop 기반 매치 row (전 종목 공통).
                // 축구는 .match-container 에 SportsEvent itemtype 도 같이 붙어 있으므로
                // 두 경로가 충돌하지 않는다.
                const rows = Array.from(
                    document.querySelectorAll('a[itemtype*="SportsEvent"]')
                );

                // 리그 헤더 캐시(.comp-container > .title 구조가 있는 경우 = 축구).
                // 매치 row 의 부모 체인을 타고 .comp-container 를 찾으면 국가/국기를 얻을 수 있다.
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

                for (const m of rows) {
                    const href = m.getAttribute('href');
                    // aiscore 의 match id 는 URL 마지막 path segment.
                    let matchId = m.getAttribute('data-id');
                    if (!matchId && href) {
                        const parts = href.split('/').filter(Boolean);
                        matchId = parts[parts.length - 1] || null;
                    }

                    const startDate = getMetaContent(m, 'startDate');
                    const metaLocation = getMetaContent(m, 'location');

                    // 팀 이름: itemprop 기반이 전 종목 공통.
                    const home = pickText(m, [
                        '[itemprop="homeTeam"]',
                    ]);
                    const away = pickText(m, [
                        '[itemprop="awayTeam"]',
                    ]);

                    // 팀 로고: 축구는 .teamLogoHomeBox/.teamLogoAwayBox 구분.
                    // 그 외 종목은 .teamLogoBox img 가 home/away 2개 순서대로 있음.
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

                    // 시간/상태/스코어: 종목마다 다름. 후보 selector 를 여러 개 시도.
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
                    if (out.length >= maxRows) break;
                }
                return out;
            }
            """,
            int(max(1, limit_rows)),
        )

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

            # 로고/국기 다운로드 (로컬 캐시 경로로 치환)
            home_logo = cache_image(_abs_url(r.get("homeLogo")), bucket="team")
            away_logo = cache_image(_abs_url(r.get("awayLogo")), bucket="team")
            league_logo = cache_image(_abs_url(r.get("leagueLogo")), bucket="league")
            country_flag = cache_image(_abs_url(r.get("countryFlag")), bucket="flag")

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
            if not league_slug:
                league_label = r.get("leagueLabel") or r.get("metaLocation")
                sl = _slugify(league_label)
                if sl:
                    league_slug = f"{sport_slug}/{sl}"

            matches.append(
                RawMatch(
                    source_match_id=r.get("matchId"),
                    source_match_href=href,
                    raw_home_name=r.get("home"),
                    raw_home_slug=_slugify(r.get("home")),
                    raw_home_logo=home_logo,
                    raw_away_name=r.get("away"),
                    raw_away_slug=_slugify(r.get("away")),
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
                        "startDate": sd,
                        "metaLocation": r.get("metaLocation"),
                        "leagueHref": r.get("leagueHref"),
                        "scoreHome": sh,
                        "scoreAway": sa,
                    },
                )
            )

        return (url, matches)
