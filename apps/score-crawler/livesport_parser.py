"""
Livesport.com/kr 종목 페이지 파서.

─────────────────────────────────────────────────────────────────────────────
왜 Playwright 인가
    • Livesport 는 React 기반 SPA 로, 경기 목록이 JS 에서 그려진다.
    • requests + bs4 로는 거의 빈 HTML 만 보이므로 headless 브라우저가 필요.

수집 전략
    1) 페이지 오픈 → 쿠키 동의 배너 dismiss 시도 → live-table 컨테이너 대기.
    2) 경기 row(a.event__match / div.event__match / [id^=g_]) 를 쿼리.
    3) 각 row 에서 다음을 추출:
         - match id / href
         - 팀 이름 2개 (home/away)
         - 시간 텍스트 + title 속성 (Livesport 는 종종 여기에 full date 를 심어둠)
         - 점수 텍스트
         - 상태 텍스트
         - 직전에 잡은 리그 헤더 텍스트 (event__header)
         - 직전에 잡은 날짜 헤더 텍스트 (오늘/어제/2026-04-21 등)
    4) Python 쪽에서 kickoff_text + date hint 를 합쳐 UTC ISO 로 변환.
─────────────────────────────────────────────────────────────────────────────
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

try:
    from zoneinfo import ZoneInfo
    _KST = ZoneInfo("Asia/Seoul")
except Exception:  # pragma: no cover - python<3.9 없음
    _KST = timezone(timedelta(hours=9))  # fallback

from playwright.sync_api import (
    Browser,
    BrowserContext,
    Page,
    TimeoutError as PWTimeoutError,
    sync_playwright,
)


LIVESPORT_BASE = "https://www.livesport.com"


@dataclass
class RawMatch:
    """페이지에서 뽑아낸 경기 row 한 건 (DB 삽입 전 상태)."""
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
    raw_kickoff_text: Optional[str] = None
    raw_kickoff_utc: Optional[str] = None
    raw_score_text: Optional[str] = None
    raw_status_text: Optional[str] = None
    raw_payload: dict[str, Any] = field(default_factory=dict)


def build_sport_url(sport_slug: str) -> str:
    return f"{LIVESPORT_BASE}/kr/{sport_slug}/"


def _slugify(name: Optional[str]) -> Optional[str]:
    if not name:
        return None
    s = name.strip().lower()
    s = re.sub(r"\s+", "-", s)
    s = re.sub(r"[^a-z0-9\-]", "", s)
    return s or None


# ── 시간 파싱 헬퍼 ────────────────────────────────────────────────────────────

_FULL_DT_RE = re.compile(
    r"(?P<y>\d{4})[-./](?P<m>\d{1,2})[-./](?P<d>\d{1,2})\D+(?P<H>\d{1,2}):(?P<M>\d{2})"
)
_DDMM_HHMM_RE = re.compile(
    r"(?P<d>\d{1,2})\.(?P<m>\d{1,2})\.?\s+(?P<H>\d{1,2}):(?P<M>\d{2})"
)
_HHMM_RE = re.compile(r"^\s*(?P<H>\d{1,2}):(?P<M>\d{2})\s*$")
_STATUS_WORDS = (
    "종료", "연기", "취소", "하프타임", "전반", "후반",
    "FT", "HT", "Live", "LIVE", "Canc", "Postp", "Finished",
)


def _parse_kickoff_to_utc(
    text: Optional[str],
    title: Optional[str],
    date_hint: Optional[str],
) -> Optional[str]:
    """Livesport 에서 뽑은 시간 텍스트들을 UTC ISO 문자열로 변환.

    우선순위:
    1. title 속성에 full datetime 이 있으면 그걸 사용
    2. text 가 "DD.MM. HH:MM" 이면 현재 연도 + KST 로 해석
    3. text 가 "HH:MM" 이면 date_hint 를 보고 날짜 추정 (없으면 오늘 KST)
    4. 상태 문구("종료", "FT" 등)만 있으면 None
    """
    def _from_kst(y: int, m: int, d: int, H: int, M: int) -> Optional[str]:
        try:
            local = datetime(y, m, d, H, M, 0, tzinfo=_KST)
            return local.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        except ValueError:
            return None

    def _search_full(s: str) -> Optional[str]:
        mo = _FULL_DT_RE.search(s)
        if not mo:
            return None
        return _from_kst(
            int(mo.group("y")), int(mo.group("m")), int(mo.group("d")),
            int(mo.group("H")), int(mo.group("M")),
        )

    # 1) title 이 우선 (보통 title="20.04.2026 19:00" 또는 "2026-04-20 19:00")
    for src in (title, text):
        if not src:
            continue
        iso = _search_full(src)
        if iso:
            return iso

    # 2) DD.MM. HH:MM
    for src in (text, title):
        if not src:
            continue
        mo = _DDMM_HHMM_RE.search(src)
        if mo:
            now_kst = datetime.now(tz=_KST)
            y = now_kst.year
            # 12월인데 1월 경기면 내년, 반대도 보정
            month = int(mo.group("m"))
            if now_kst.month >= 10 and month <= 3:
                y += 1
            elif now_kst.month <= 3 and month >= 10:
                y -= 1
            return _from_kst(
                y, month, int(mo.group("d")),
                int(mo.group("H")), int(mo.group("M")),
            )

    # 3) HH:MM (오늘/어제/내일 힌트 활용)
    if text:
        mo = _HHMM_RE.match(text)
        if mo:
            now_kst = datetime.now(tz=_KST)
            y, m, d = now_kst.year, now_kst.month, now_kst.day
            hint = (date_hint or "").lower()
            if "내일" in hint or "tomorrow" in hint:
                tgt = now_kst + timedelta(days=1)
                y, m, d = tgt.year, tgt.month, tgt.day
            elif "어제" in hint or "yesterday" in hint:
                tgt = now_kst - timedelta(days=1)
                y, m, d = tgt.year, tgt.month, tgt.day
            else:
                # "2026-04-21" 같은 명시적 날짜가 있으면 그걸 사용
                iso_mo = re.search(r"(\d{4})[-./](\d{1,2})[-./](\d{1,2})", hint)
                if iso_mo:
                    y = int(iso_mo.group(1))
                    m = int(iso_mo.group(2))
                    d = int(iso_mo.group(3))
            return _from_kst(y, m, d, int(mo.group("H")), int(mo.group("M")))

    return None


class LivesportParser:
    """Playwright context 를 공유하며 여러 종목 페이지를 순회하는 파서.

    기본적으로 **탭 하나(self._page)** 를 재사용한다.
    새 종목을 열 때마다 new_page() 를 만들지 않고 goto() 로 같은 탭에서 이동한다.
    """

    def __init__(
        self,
        *,
        headless: bool = True,
        nav_timeout_ms: int = 30_000,
        wait_after_load_ms: int = 1_500,
    ):
        self.headless = headless
        self.nav_timeout_ms = nav_timeout_ms
        self.wait_after_load_ms = wait_after_load_ms

        self._pw = None
        self._browser: Optional[Browser] = None
        self._ctx: Optional[BrowserContext] = None
        self._page: Optional[Page] = None

    # ── context manager sugar ─────────────────────────────────────────────
    def __enter__(self) -> "LivesportParser":
        self._pw = sync_playwright().start()
        self._browser = self._pw.chromium.launch(headless=self.headless)
        self._ctx = self._browser.new_context(
            locale="ko-KR",
            timezone_id="Asia/Seoul",
            user_agent=(
                "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
            ),
            viewport={"width": 1366, "height": 900},
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
        """livesport.com/kr 홈페이지에 접속 가능한지 체크."""
        assert self._page, "LivesportParser must be used as context manager"
        url = f"{LIVESPORT_BASE}/kr/"
        try:
            resp = self._page.goto(url, wait_until="domcontentloaded")
            http = resp.status if resp else 0
            if 200 <= http < 400:
                return {"status": "ok", "http": http, "note": None}
            return {"status": "fail", "http": http, "note": f"http {http}"}
        except PWTimeoutError as e:
            return {"status": "fail", "http": 0, "note": f"timeout: {e}"}
        except Exception as e:
            return {"status": "fail", "http": 0, "note": f"{type(e).__name__}: {e}"}

    # ── page helpers ──────────────────────────────────────────────────────
    def _dismiss_cookies(self, page: Page) -> None:
        """OneTrust / 자체 쿠키 배너 등 가능한 한 닫아본다 (실패해도 무시)."""
        selectors = [
            "button#onetrust-accept-btn-handler",
            "button[aria-label='모두 동의']",
            "button:has-text('모두 동의')",
            "button:has-text('동의')",
            "button:has-text('Accept all')",
            "button:has-text('I Accept')",
        ]
        for sel in selectors:
            try:
                btn = page.locator(sel).first
                if btn.count() > 0 and btn.is_visible():
                    btn.click(timeout=1_500)
                    page.wait_for_timeout(300)
                    break
            except Exception:
                continue

    def _wait_for_matches(self, page: Page) -> None:
        for sel in (
            "#live-table",
            "div.event__match",
            "a.event__match",
            "[id^='g_']",
        ):
            try:
                page.wait_for_selector(sel, timeout=self.nav_timeout_ms / 3)
                break
            except PWTimeoutError:
                continue

    # ── main API ──────────────────────────────────────────────────────────
    def fetch_sport_page(
        self,
        sport_slug: str,
        *,
        limit_rows: int = 20,
    ) -> tuple[str, list[RawMatch]]:
        """단일 sport 페이지를 열고 최대 limit_rows 개의 match row 를 반환.

        **같은 탭(self._page) 에서 goto 로 이동**. 새 탭을 만들지 않는다.
        """
        assert self._page, "LivesportParser must be used as context manager"
        url = build_sport_url(sport_slug)
        page = self._page
        page.goto(url, wait_until="domcontentloaded")
        self._dismiss_cookies(page)
        self._wait_for_matches(page)
        if self.wait_after_load_ms:
            page.wait_for_timeout(self.wait_after_load_ms)
        try:
            raw_rows: list[dict[str, Any]] = page.evaluate(
                """
                (maxRows) => {
                    const out = [];

                    // 문서 전체를 순서대로 훑는다.
                    //   headerLeague (리그/국가 헤더) → leagueState 갱신
                    //   headerDate   (날짜 탭/헤더) → dateHint 갱신
                    //   event__match (또는 id^=g_) → row 추출 후 현재 state 부착
                    const all = Array.from(document.querySelectorAll(
                        '[data-testid="wcl-headerLeague"], ' +
                        '[class*="headerDate"], ' +
                        'a.event__match, div.event__match, [id^="g_"]'
                    ));

                    const classOf = (el) => (el && el.className !== undefined) ? String(el.className) : '';
                    const textOf = (el) => (el && el.textContent) ? el.textContent.trim() : '';
                    const pickText = (el, sels) => {
                        for (const s of sels) {
                            const n = el.querySelector(s);
                            if (n && n.textContent) {
                                const t = n.textContent.trim();
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

                    let leagueLabel = null;
                    let leagueSlug  = null;
                    let leagueLogo  = null;
                    let countryLabel = null;
                    let dateHint = null;

                    const isLeagueHeader = (el) =>
                        el.getAttribute && el.getAttribute('data-testid') === 'wcl-headerLeague';
                    const isDateHeader = (el) => /headerDate/i.test(classOf(el));
                    const isMatch = (el) => {
                        if (el.id && el.id.startsWith('g_')) return true;
                        return /event__match/.test(classOf(el));
                    };

                    const parseLeagueHref = (href) => {
                        if (!href) return null;
                        // "/kr/soccer/south-korea/k-league-1/" → "south-korea/k-league-1"
                        const m = href.match(/\\/kr\\/[^/]+\\/(.+?)\\/?$/);
                        return m ? m[1] : href.replace(/^\\/?kr\\/?/, '').replace(/\\/$/, '');
                    };

                    for (const el of all) {
                        if (isLeagueHeader(el)) {
                            // 리그명 / 국가명 / 리그 href 분리 추출
                            const titleText = pickText(el, [
                                '.headerLeague__title-text',
                                'a.headerLeague__title',
                                '.headerLeague__title',
                            ]);
                            const countryText = pickText(el, [
                                '.headerLeague__category-text',
                                '.headerLeague__category',
                            ]);
                            const titleHref = pickAttr(el, [
                                'a.headerLeague__title',
                                '.headerLeague__title a',
                            ], 'href');
                            if (titleText) leagueLabel = titleText.slice(0, 200);
                            if (countryText) countryLabel = countryText.replace(/:$/, '').trim().slice(0, 100);
                            leagueSlug = parseLeagueHref(titleHref);
                            // 리그 로고 <img>: headerLeague 영역 안의 첫 번째 이미지가 주로 리그/국가 로고
                            leagueLogo = pickAttr(el, [
                                '.headerLeague__logo img',
                                '[class*="headerLeague__logo"] img',
                                '.headerLeague img',
                                'img',
                            ], 'src');
                            continue;
                        }
                        if (isDateHeader(el)) {
                            const d = textOf(el);
                            if (d) dateHint = d.slice(0, 100);
                            continue;
                        }
                        if (!isMatch(el)) continue;

                        const home = pickText(el, [
                            '.event__homeParticipant',
                            '.event__participant--home',
                            '[class*="homeParticipant"] [class*="participant"]',
                            '[class*="home"] .event__participant',
                        ]);
                        const away = pickText(el, [
                            '.event__awayParticipant',
                            '.event__participant--away',
                            '[class*="awayParticipant"] [class*="participant"]',
                            '[class*="away"] .event__participant',
                        ]);
                        // 팀 로고 <img src>: livesport 는 event row 에 팀별 로고를 inline 으로 둔다.
                        // 사용된 selector 들은 실제 DOM 에서 관측된 패턴 (다양성 대비 여러 개 시도).
                        const homeLogo = pickAttr(el, [
                            '.event__logo--home',
                            '[class*="event__logo--home"]',
                            '[class*="participantLogo--home"]',
                            '[class*="participant--home"] img',
                            '[class*="homeParticipant"] img',
                        ], 'src');
                        const awayLogo = pickAttr(el, [
                            '.event__logo--away',
                            '[class*="event__logo--away"]',
                            '[class*="participantLogo--away"]',
                            '[class*="participant--away"] img',
                            '[class*="awayParticipant"] img',
                        ], 'src');
                        const timeText = pickText(el, [
                            '.event__time',
                            '[class*="event__time"]',
                            '[class*="eventTime"]',
                        ]);
                        const timeTitle =
                            pickAttr(el, ['.event__time', '[class*="event__time"]', '[class*="eventTime"]'], 'title') ||
                            el.getAttribute('title');
                        const dataStart =
                            el.getAttribute('data-start-time') ||
                            pickAttr(el, ['[data-start-time]'], 'data-start-time');

                        const scoreHome = pickText(el, [
                            '.event__score--home',
                            '[class*="score--home"]',
                        ]);
                        const scoreAway = pickText(el, [
                            '.event__score--away',
                            '[class*="score--away"]',
                        ]);
                        const statusText = pickText(el, [
                            '.event__stage--block',
                            '[class*="event__stage"]',
                            '[class*="eventStage"]',
                        ]);
                        const href =
                            (el.tagName === 'A' ? el.getAttribute('href') : null) ||
                            pickAttr(el, ['a'], 'href');

                        let matchId = el.id || null;
                        if (!matchId && href) {
                            const m = href.match(/match\\/([^\\/]+)/);
                            if (m) matchId = m[1];
                        }

                        if (!home && !away && !timeText && !timeTitle) continue;

                        out.push({
                            matchId,
                            href,
                            home,
                            homeLogo,
                            away,
                            awayLogo,
                            timeText,
                            timeTitle,
                            dataStart,
                            scoreHome,
                            scoreAway,
                            statusText,
                            leagueLabel,
                            leagueSlug,
                            leagueLogo,
                            countryLabel,
                            dateHint,
                            raw_outer_class: classOf(el) || null,
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
                score_text = None
                sh = r.get("scoreHome")
                sa = r.get("scoreAway")
                if sh or sa:
                    score_text = f"{sh or ''}:{sa or ''}".strip(":")

                href = r.get("href")
                if href and href.startswith("/"):
                    href = f"{LIVESPORT_BASE}{href}"

                def _abs_url(u: Optional[str]) -> Optional[str]:
                    """livesport 가 상대 경로나 // 프로토콜 생략으로 내려줄 때 절대화."""
                    if not u:
                        return None
                    u = u.strip()
                    if not u:
                        return None
                    if u.startswith("data:"):  # placeholder base64 는 의미없음
                        return None
                    if u.startswith("//"):
                        return "https:" + u
                    if u.startswith("/"):
                        return f"{LIVESPORT_BASE}{u}"
                    return u

                home_logo = _abs_url(r.get("homeLogo"))
                away_logo = _abs_url(r.get("awayLogo"))
                league_logo = _abs_url(r.get("leagueLogo"))

                # kickoff UTC: data-start-time (epoch) 우선 → title/text 파싱
                kickoff_utc: Optional[str] = None
                ds = r.get("dataStart")
                if ds:
                    try:
                        # livesport 는 초/밀리초 둘 다 써서 길이로 분기
                        v = int(ds)
                        if v > 10_000_000_000:  # ms
                            v //= 1000
                        kickoff_utc = datetime.fromtimestamp(
                            v, tz=timezone.utc
                        ).strftime("%Y-%m-%dT%H:%M:%SZ")
                    except Exception:
                        pass
                if not kickoff_utc:
                    kickoff_utc = _parse_kickoff_to_utc(
                        r.get("timeText"),
                        r.get("timeTitle"),
                        r.get("dateHint"),
                    )

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
                        raw_league_slug=r.get("leagueSlug"),
                        raw_league_logo=league_logo,
                        raw_country_label=r.get("countryLabel"),
                        raw_kickoff_text=r.get("timeText"),
                        raw_kickoff_utc=kickoff_utc,
                        raw_score_text=score_text,
                        raw_status_text=r.get("statusText"),
                        raw_payload={
                            "outer_class": r.get("raw_outer_class"),
                            "timeTitle": r.get("timeTitle"),
                            "dataStart": r.get("dataStart"),
                            "dateHint": r.get("dateHint"),
                            "scoreHome": sh,
                            "scoreAway": sa,
                        },
                    )
                )

            return (url, matches)
        finally:
            try:
                page.evaluate("() => { try { window.stop(); } catch (_) {} }")
            except Exception:
                pass
