"""
livesport sport page ↔ 내부 표준 ↔ odds-api.io provider 매핑 시드 데이터.

─────────────────────────────────────────────────────────────────────────────
설계 의도
    • LIVESPORT_SPORTS: livesport.com/kr/<slug>/ 에서 우리가 실제로 순회할 종목 목록
      (한국어 라벨 + URL slug + 1차/2차 우선순위 분류 포함).
    • ODDS_API_SPORTS: odds-api.io 가 현재 지원하는 sport slug/name 목록.
      이 값은 provider_name=odds-api.io 기준에서만 유효하며,
      provider 가 나중에 교체되면 해당 테이블만 교체해주면 된다.
    • SPORT_MAPPINGS: 위 두 테이블을 교차로 연결한 "매핑 시드".
      DB sport_mappings 에 upsert 로 적재한다.
─────────────────────────────────────────────────────────────────────────────
"""

from __future__ import annotations

from typing import List, Optional, TypedDict


class LivesportSport(TypedDict):
    slug: str          # livesport URL slug (예: "soccer", "table-tennis")
    label: str         # 한국어 라벨 (예: "축구")
    priority: str      # "primary" | "secondary"
                       #   primary   -> 현재 매칭 포커스
                       #   secondary -> 원본만 수집, 매칭 보류


# ── 1. 크롤링 대상 livesport 종목 ──────────────────────────────────────────
LIVESPORT_SPORTS: List[LivesportSport] = [
    # ── primary: odds-api.io 와 직접 매칭 가능성이 높은 종목
    {"slug": "soccer", "label": "축구", "priority": "primary"},
    {"slug": "baseball", "label": "야구", "priority": "primary"},
    {"slug": "basketball", "label": "농구", "priority": "primary"},
    {"slug": "hockey", "label": "하키(아이스)", "priority": "primary"},
    {"slug": "volleyball", "label": "배구", "priority": "primary"},
    {"slug": "tennis", "label": "테니스", "priority": "primary"},
    {"slug": "table-tennis", "label": "탁구", "priority": "primary"},
    {"slug": "esports", "label": "이스포츠", "priority": "primary"},
    {"slug": "american-football", "label": "미식축구", "priority": "primary"},
    {"slug": "mma", "label": "MMA", "priority": "primary"},
    {"slug": "badminton", "label": "배드민턴", "priority": "primary"},
    {"slug": "cricket", "label": "크리켓", "priority": "primary"},
    {"slug": "boxing", "label": "복싱", "priority": "primary"},
    {"slug": "golf", "label": "골프", "priority": "primary"},
    {"slug": "darts", "label": "다트", "priority": "primary"},
    {"slug": "handball", "label": "핸드볼", "priority": "primary"},
    {"slug": "futsal", "label": "풋살", "priority": "primary"},
    {"slug": "snooker", "label": "스누커", "priority": "primary"},
    {"slug": "beach-volleyball", "label": "비치발리볼", "priority": "primary"},
    {"slug": "beach-soccer", "label": "비치사커", "priority": "primary"},
    {"slug": "floorball", "label": "플로어볼", "priority": "primary"},
    {"slug": "bandy", "label": "밴디", "priority": "primary"},
    {"slug": "cycling", "label": "사이클", "priority": "primary"},
    {"slug": "water-polo", "label": "수구", "priority": "primary"},
    {"slug": "aussie-rules", "label": "오스트레일리안 풋볼", "priority": "primary"},

    # ── secondary: 원본 수집만, odds-api.io 매칭 보류
    {"slug": "motorsport", "label": "모터스포츠", "priority": "secondary"},
    {"slug": "winter-sports", "label": "윈터스포츠", "priority": "secondary"},
    {"slug": "horse-racing", "label": "경마", "priority": "secondary"},
    {"slug": "kabaddi", "label": "카바디", "priority": "secondary"},
    {"slug": "netball", "label": "네트볼", "priority": "secondary"},
    {"slug": "pesapallo", "label": "페사팔로", "priority": "secondary"},
    {"slug": "field-hockey", "label": "필드 하키", "priority": "secondary"},
    {"slug": "rugby-union", "label": "럭비 유니언", "priority": "secondary"},
    {"slug": "rugby-league", "label": "럭비 리그", "priority": "secondary"},
]


# ── 2. odds-api.io 가 지원하는 sport 목록 ─────────────────────────────────
#    (provider_name = "odds-api.io" 기준)
ODDS_API_SPORTS = [
    {"name": "Football", "slug": "football"},
    {"name": "Basketball", "slug": "basketball"},
    {"name": "Tennis", "slug": "tennis"},
    {"name": "Baseball", "slug": "baseball"},
    {"name": "American Football", "slug": "american-football"},
    {"name": "Ice Hockey", "slug": "ice-hockey"},
    {"name": "Esports", "slug": "esports"},
    {"name": "Darts", "slug": "darts"},
    {"name": "MMA", "slug": "mixed-martial-arts"},
    {"name": "Boxing", "slug": "boxing"},
    {"name": "Handball", "slug": "handball"},
    {"name": "Volleyball", "slug": "volleyball"},
    {"name": "Snooker", "slug": "snooker"},
    {"name": "Table Tennis", "slug": "table-tennis"},
    {"name": "Rugby", "slug": "rugby"},
    {"name": "Cricket", "slug": "cricket"},
    {"name": "Waterpolo", "slug": "water-polo"},
    {"name": "Futsal", "slug": "futsal"},
    {"name": "Beach Volley", "slug": "beach-volleyball"},
    {"name": "Aussie Rules", "slug": "aussie-rules"},
    {"name": "Floorball", "slug": "floorball"},
    {"name": "Squash", "slug": "squash"},
    {"name": "Beach Soccer", "slug": "beach-soccer"},
    {"name": "Lacrosse", "slug": "lacrosse"},
    {"name": "Curling", "slug": "curling"},
    {"name": "Padel", "slug": "padel"},
    {"name": "Bandy", "slug": "bandy"},
    {"name": "Gaelic Football", "slug": "gaelic-football"},
    {"name": "Beach Handball", "slug": "beach-handball"},
    {"name": "Athletics", "slug": "athletics"},
    {"name": "Badminton", "slug": "badminton"},
    {"name": "Cross-Country", "slug": "cross-country"},
    {"name": "Golf", "slug": "golf"},
    {"name": "Cycling", "slug": "cycling"},
]


# ── 3. 내부 표준 sport slug 결정 규칙 ─────────────────────────────────────
#    livesport slug 와 odds-api.io slug 가 어긋나는 경우가 있어서,
#    내부 표준(internal_sport_slug)을 명시한다.
#
#    내부 표준 philosophy:
#      • 내부 표준은 "장기적으로 안정적인 네이밍" 에 맞춘다.
#      • 현재는 대부분 odds-api.io slug 와 동일하게 맞추되,
#        rugby-union/league 처럼 분리/합병 가능성이 있는 경우 해당 시점의
#        결정은 보류하고 provider_sport_slug=null 로 남긴다.
INTERNAL_SPORT_FOR_LIVESPORT: dict[str, str] = {
    "soccer": "football",
    "baseball": "baseball",
    "basketball": "basketball",
    "hockey": "ice-hockey",
    "volleyball": "volleyball",
    "tennis": "tennis",
    "table-tennis": "table-tennis",
    "esports": "esports",
    "american-football": "american-football",
    "mma": "mixed-martial-arts",
    "badminton": "badminton",
    "cricket": "cricket",
    "boxing": "boxing",
    "golf": "golf",
    "darts": "darts",
    "handball": "handball",
    "futsal": "futsal",
    "snooker": "snooker",
    "beach-volleyball": "beach-volleyball",
    "beach-soccer": "beach-soccer",
    "floorball": "floorball",
    "bandy": "bandy",
    "cycling": "cycling",
    "water-polo": "water-polo",
    "aussie-rules": "aussie-rules",

    # ── secondary: 내부 표준은 남기지만 provider 매칭은 null 유지
    "motorsport": "motorsport",
    "winter-sports": "winter-sports",
    "horse-racing": "horse-racing",
    "kabaddi": "kabaddi",
    "netball": "netball",
    "pesapallo": "pesapallo",
    "field-hockey": "field-hockey",

    # rugby-union/league 는 구조적으로 내부 표준 "rugby" 로 뭉칠 수도,
    # 서로 분리해서 유지할 수도 있으므로 당장은 개별 표준으로 두고
    # note 로 "후속 결정 필요" 표시. provider 매칭은 일단 보류.
    "rugby-union": "rugby-union",
    "rugby-league": "rugby-league",
}


def _odds_api_entry(slug: str) -> Optional[dict]:
    for row in ODDS_API_SPORTS:
        if row["slug"] == slug:
            return row
    return None


def build_sport_mapping_rows(
    source_site: str = "livesport",
    provider_name: str = "odds-api.io",
) -> list[dict]:
    """sport_mappings 테이블에 시드할 row 목록을 만든다.

    각 row:
      {source_site, source_sport_slug, source_sport_name,
       internal_sport_slug, provider_name,
       provider_sport_slug, provider_sport_name,
       is_supported, note}
    """
    rows: list[dict] = []

    for sp in LIVESPORT_SPORTS:
        ls_slug = sp["slug"]
        internal = INTERNAL_SPORT_FOR_LIVESPORT.get(ls_slug, ls_slug)

        # provider(odds-api.io) 기준 매칭 시도: internal_sport_slug 기준
        provider_entry = _odds_api_entry(internal)

        # 단, secondary 우선순위는 일단 provider 매칭을 끊어둔다
        # (ex. motorsport, winter-sports, horse-racing, rugby-* 등)
        if sp["priority"] == "secondary":
            provider_entry = None

        note_parts: list[str] = []
        if sp["priority"] == "secondary":
            note_parts.append("secondary-priority; provider matching deferred")
        if ls_slug.startswith("rugby-"):
            note_parts.append("rugby union/league split — internal schema TBD")
        if ls_slug == "hockey":
            note_parts.append("livesport 'hockey' = ice-hockey on odds-api.io")
        if ls_slug == "soccer":
            note_parts.append("livesport 'soccer' = football on odds-api.io")
        if ls_slug == "mma":
            note_parts.append("odds-api.io uses 'mixed-martial-arts'")

        rows.append({
            "source_site": source_site,
            "source_sport_slug": ls_slug,
            "source_sport_name": sp["label"],
            "internal_sport_slug": internal,
            "provider_name": provider_name,
            "provider_sport_slug": provider_entry["slug"] if provider_entry else None,
            "provider_sport_name": provider_entry["name"] if provider_entry else None,
            "is_supported": 1 if provider_entry else 0,
            "note": "; ".join(note_parts) or None,
        })

    return rows


def primary_livesport_slugs() -> list[str]:
    return [sp["slug"] for sp in LIVESPORT_SPORTS if sp["priority"] == "primary"]


def all_livesport_slugs() -> list[str]:
    return [sp["slug"] for sp in LIVESPORT_SPORTS]


# ── 4. aiscore.com 슬러그 → 내부 표준 매핑 ────────────────────────────────
#    aiscore 는 URL slug 가 내부 표준과 대부분 일치 (football, ice-hockey …).
#    따라서 별도 테이블로 seed 해야 `resolve_mapping(source_site='aiscore', source_sport_slug='football', …)` 가 정확히 매치된다.
AISCORE_SPORTS: list[dict] = [
    {"slug": "football", "label": "축구", "priority": "primary"},
    {"slug": "baseball", "label": "야구", "priority": "primary"},
    {"slug": "basketball", "label": "농구", "priority": "primary"},
    {"slug": "tennis", "label": "테니스", "priority": "primary"},
    {"slug": "volleyball", "label": "배구", "priority": "primary"},
    {"slug": "esports", "label": "이스포츠", "priority": "primary"},
    {"slug": "ice-hockey", "label": "아이스하키", "priority": "primary"},
    {"slug": "cricket", "label": "크리켓", "priority": "primary"},
    {"slug": "american-football", "label": "미식축구", "priority": "primary"},
    {"slug": "table-tennis", "label": "탁구", "priority": "primary"},
    {"slug": "water-polo", "label": "수구", "priority": "primary"},
    {"slug": "snooker", "label": "스누커", "priority": "primary"},
    {"slug": "badminton", "label": "배드민턴", "priority": "primary"},
    {"slug": "handball", "label": "핸드볼", "priority": "primary"},
    {"slug": "futsal", "label": "풋살", "priority": "primary"},
    {"slug": "mma", "label": "MMA", "priority": "primary"},
    {"slug": "boxing", "label": "복싱", "priority": "primary"},
    {"slug": "darts", "label": "다트", "priority": "primary"},
    {"slug": "floorball", "label": "플로어볼", "priority": "primary"},
    {"slug": "beach-volleyball", "label": "비치발리볼", "priority": "primary"},
    {"slug": "beach-soccer", "label": "비치사커", "priority": "primary"},
]

INTERNAL_SPORT_FOR_AISCORE: dict[str, str] = {
    "football": "football",
    "baseball": "baseball",
    "basketball": "basketball",
    "tennis": "tennis",
    "volleyball": "volleyball",
    "esports": "esports",
    "ice-hockey": "ice-hockey",
    "cricket": "cricket",
    "american-football": "american-football",
    "table-tennis": "table-tennis",
    "water-polo": "water-polo",
    "snooker": "snooker",
    "badminton": "badminton",
    "handball": "handball",
    "futsal": "futsal",
    "mma": "mixed-martial-arts",
    "boxing": "boxing",
    "darts": "darts",
    "floorball": "floorball",
    "beach-volleyball": "beach-volleyball",
    "beach-soccer": "beach-soccer",
}


def build_aiscore_sport_mapping_rows(
    source_site: str = "aiscore",
    provider_name: str = "odds-api.io",
) -> list[dict]:
    """aiscore 기준 sport_mappings 시드. source_sport_slug 를 aiscore URL 슬러그에 맞춘다."""
    rows: list[dict] = []
    for sp in AISCORE_SPORTS:
        a_slug = sp["slug"]
        internal = INTERNAL_SPORT_FOR_AISCORE.get(a_slug, a_slug)
        provider_entry = _odds_api_entry(internal)
        note_parts: list[str] = []
        if a_slug == "mma":
            note_parts.append("odds-api.io uses 'mixed-martial-arts'")
        rows.append({
            "source_site": source_site,
            "source_sport_slug": a_slug,
            "source_sport_name": sp["label"],
            "internal_sport_slug": internal,
            "provider_name": provider_name,
            "provider_sport_slug": provider_entry["slug"] if provider_entry else None,
            "provider_sport_name": provider_entry["name"] if provider_entry else None,
            "is_supported": 1 if provider_entry else 0,
            "note": "; ".join(note_parts) or None,
        })
    return rows
