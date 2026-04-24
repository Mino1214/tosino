"""외부 이미지 URL 을 로컬 캐시로 다운로드.

설계:
    * 동일한 URL 은 여러 경기/팀에서 공유될 수 있으므로 **URL → path 해시 매핑** 을 쓴다.
    * 저장 경로: <ASSETS_ROOT>/crawler/<bucket>/<hash>.<ext>
        - bucket = 'team' | 'league' | 'flag' | 'other'
        - hash   = sha1(URL)[:16]
        - ext    = URL 확장자 (없으면 .png)
    * 공개 URL (백엔드 정적 서빙 prefix `/assets/`) 로 치환해 반환한다.
        - 예: https://img0.aiscore.com/football/team/abcd.png!w80
          →   /assets/crawler/team/<hash>.png
    * 메모리 캐시로 같은 URL 중복 다운로드 방지.
    * 실패 시 원본 URL 을 그대로 돌려주어, 크롤러 실행이 멈추지 않게 한다.

환경변수:
    ASSETS_ROOT        : 로컬 저장소 루트 (기본 apps/api/assets)
    ASSETS_PUBLIC      : 공개 path prefix (기본 /assets)
    ASSETS_PUBLIC_BASE : 공개 origin (예: http://localhost:4001).
                         비워두면 BACKEND_BASE_URL 에서 /api 제거하여 추정.
                         그래도 없으면 path-only 반환 (frontend 가 자기 origin 기준으로 404).
    ASSETS_DOWNLOAD    : '1' 이면 다운로드, '0' 이면 원본 URL 을 그대로 반환(드라이런)
"""
from __future__ import annotations

import hashlib
import logging
import os
import re
import tempfile
from pathlib import Path
from typing import Literal, Optional
from urllib.parse import urlparse

import requests

log = logging.getLogger(__name__)

Bucket = Literal["team", "league", "flag", "other"]

# apps/score-crawler/ 기준 → apps/api/assets/crawler
_DEFAULT_ROOT = (
    Path(__file__).resolve().parent.parent / "api" / "assets"
)

ASSETS_ROOT = Path(os.environ.get("ASSETS_ROOT") or _DEFAULT_ROOT)
ASSETS_PUBLIC = os.environ.get("ASSETS_PUBLIC", "/assets").rstrip("/")
ASSETS_DOWNLOAD = os.environ.get("ASSETS_DOWNLOAD", "1") == "1"


def _resolve_public_base() -> str:
    """공개 origin 결정.

    우선순위:
      1. `ASSETS_PUBLIC_BASE`  (예: https://apisgate.org)
      2. `PUBLIC_API_URL`      (apps/api/.env 의 공식 공개 URL — 터널/프록시 도메인)
      3. `BACKEND_BASE_URL` 에서 /api 를 잘라낸 값 (로컬 개발)
      4. 빈 문자열 (상대경로, 배포에서는 권장하지 않음)
    """
    for env_key in ("ASSETS_PUBLIC_BASE", "PUBLIC_API_URL"):
        v = (os.environ.get(env_key) or "").strip()
        if v:
            base = v.rstrip("/")
            if base.endswith("/api"):
                base = base[: -len("/api")]
            return base
    backend = (os.environ.get("BACKEND_BASE_URL") or "").strip()
    if backend:
        base = backend.rstrip("/")
        if base.endswith("/api"):
            base = base[: -len("/api")]
        return base
    return ""


ASSETS_PUBLIC_BASE = _resolve_public_base()

_session = requests.Session()
_session.headers.update(
    {
        "User-Agent": (
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
        ),
        "Referer": "https://www.aiscore.com/",
    }
)

_mem_cache: dict[str, str] = {}


def _normalize_url(url: str) -> str:
    """aiscore 는 `!w80`, `!w30` 같은 리사이즈 접미어를 붙여 같은 이미지 여러 URL 로 내려준다.
    캐시 키에서는 리사이즈 접미어를 제거해 동일 이미지로 매핑.
    """
    if "!" in url:
        return url.split("!", 1)[0]
    return url


def _guess_ext(url: str) -> str:
    path = urlparse(_normalize_url(url)).path
    m = re.search(r"\.(png|jpg|jpeg|gif|webp|svg)$", path, re.IGNORECASE)
    if m:
        return "." + m.group(1).lower()
    return ".png"


def _hash(url: str) -> str:
    return hashlib.sha1(_normalize_url(url).encode("utf-8")).hexdigest()[:16]


def _target_paths(bucket: Bucket, url: str) -> tuple[Path, str]:
    h = _hash(url)
    ext = _guess_ext(url)
    fname = f"{h}{ext}"
    local = ASSETS_ROOT / "crawler" / bucket / fname
    path = f"{ASSETS_PUBLIC}/crawler/{bucket}/{fname}"
    public = f"{ASSETS_PUBLIC_BASE}{path}" if ASSETS_PUBLIC_BASE else path
    return local, public


def cache_image(url: Optional[str], bucket: Bucket = "other") -> Optional[str]:
    """원격 이미지 URL → 로컬 캐시 파일 + 공개 URL 반환.

    - url 이 None/빈 문자열 → None
    - 이미 우리 `/assets/` prefix 로 시작하면 그대로 (이중 변환 방지)
    - 다운로드 비활성(ASSETS_DOWNLOAD=0)이면 원본 URL 그대로
    - 실패 시 원본 URL 그대로 (크롤링 멈추지 않게)
    """
    if not url:
        return None
    u = url.strip()
    if not u:
        return None

    # 이미 로컬로 변환된 것 (상대/절대 둘 다)
    if u.startswith(ASSETS_PUBLIC + "/") or u.startswith("/assets/"):
        # 상대경로로 저장된 과거 데이터가 들어올 수 있으니 base 가 있으면 절대화.
        return f"{ASSETS_PUBLIC_BASE}{u}" if ASSETS_PUBLIC_BASE else u
    if ASSETS_PUBLIC_BASE and u.startswith(ASSETS_PUBLIC_BASE + "/assets/"):
        return u

    # data: base64 등은 그대로 (저장 이득 없음)
    if u.startswith("data:"):
        return None

    if not ASSETS_DOWNLOAD:
        return u

    if u in _mem_cache:
        return _mem_cache[u]

    local, public = _target_paths(bucket, u)
    if local.exists():
        _mem_cache[u] = public
        return public

    try:
        local.parent.mkdir(parents=True, exist_ok=True)
        resp = _session.get(u, timeout=10, stream=True)
        if resp.status_code != 200:
            log.warning("asset fetch http=%s url=%s", resp.status_code, u)
            return u
        content_type = resp.headers.get("Content-Type", "")
        if "image" not in content_type and "octet-stream" not in content_type:
            log.warning("asset skipped (not image) ct=%s url=%s", content_type, u)
            return u
        # 고정 경로 `*.part` 는 동시에 같은 URL/해시를 받을 때 한쪽이 rename 하면
        # 다른 쪽에서 .part 가 없어져 ENOENT 가 난다. 디렉터리 안에 고유 임시 파일 사용.
        fd, tmp_path = tempfile.mkstemp(
            prefix=f"{local.stem}.",
            suffix=".part",
            dir=local.parent,
        )
        try:
            with os.fdopen(fd, "wb") as fp:
                for chunk in resp.iter_content(64 * 1024):
                    if chunk:
                        fp.write(chunk)
            os.replace(tmp_path, local)
        except Exception:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass
            raise
        _mem_cache[u] = public
        return public
    except Exception as e:  # pragma: no cover — 네트워크 에러
        if local.exists():
            _mem_cache[u] = public
            return public
        log.warning("asset fetch failed url=%s err=%s", u, e)
        return u


def stats() -> dict:
    """세션 내 다운로드 통계 (cli 출력용)."""
    return {
        "root": str(ASSETS_ROOT),
        "public": ASSETS_PUBLIC,
        "public_base": ASSETS_PUBLIC_BASE or "(relative)",
        "download": ASSETS_DOWNLOAD,
        "cached": len(_mem_cache),
    }
