# 플랫폼별 솔루션(solution-web) 복사본

관리 콘솔에서 플랫폼마다 **다른 미리보기 포트**를 쓰는 경우, 단일 `apps/solution-web`만으로도 `NEXT_PUBLIC_PREVIEW_PORT`를 바꿔 가며 띄울 수 있습니다 (`pnpm dev:solution:preview -- [포트]`).

운영·데모에서 **소스를 복사해 프로세스를 분리**하려면 이 디렉터리 아래에 인스턴스를 둡니다.

## 한 번에: 복사·설치·서버 실행

미리보기가 안 될 때는 보통 **Next 서버를 안 띄웠거나**, **DB `previewPort` ≠ 솔루션 포트**, **API 미기동**입니다.

```bash
# 복사 + 설치가 끝나면 기본적으로 next dev 까지 자동 실행 (터미널 유지)
pnpm solution:provision -- <슬러그> <미리보기포트> [API_URL]

# 설치만 (서버 안 띄움): pnpm solution:provision-only -- …  (= SOLUTION_NO_START=1)

# 복사본이 이미 있으면: 곧바로 next dev (한 터미널)
pnpm solution:dev -- <슬러그> <미리보기포트> [API_URL] [--wait-api]

# API + 미리보기 둘 다 한 번에 (API가 뜰 때까지 기다린 뒤 솔루션 기동)
pnpm solution:stack -- <슬러그> <미리보기포트> [API_URL]
```

예: 슬러그 `brand-b`, 콘솔에 찍힌 미리보기 포트가 `3201`이면:

```bash
pnpm solution:stack -- brand-b 3201
```

`--wait-api`는 이미 API를 다른 터미널에서 띄운 뒤 솔루션만 켤 때 유용합니다.

## 수동 (이전 방식)

```bash
pnpm solution:provision -- <슬러그> <미리보기포트> [API_URL]
pnpm solution:instance -- <슬러그>
```

API에 `PREVIEW_BOOTSTRAP_SECRET`이 있으면, **프로비저닝 시** 셸에 같은 변수를 둔 상태로 실행하면 `solution-web/.env.local`에 `NEXT_PUBLIC_PREVIEW_BOOTSTRAP_SECRET`도 들어갑니다.

## 반드시 맞출 것

| 항목 | 설명 |
|------|------|
| DB | 관리 콘솔 해당 플랫폼의 **미리보기 포트** = 솔루션에서 쓰는 포트 |
| API | `NEXT_PUBLIC_API_URL`이 실제 API 주소(폰에서면 PC LAN IP 등) |
| 비밀값 | API에 `PREVIEW_BOOTSTRAP_SECRET`이면 솔루션 `.env.local`에도 동일 값 |

## 삭제

```bash
rm -rf deployments/solution-instances/<슬러그>
```

원본 `apps/solution-web`을 수정한 뒤 복사본을 갱신하려면 폴더를 지우고 `pnpm solution:provision` 또는 `pnpm solution:dev`를 다시 실행하세요.
