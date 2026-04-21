# Odds-API 기능 이관 체크리스트

목표: 관리자 콘솔 기준으로 odds-api 기능을 먼저 이관/검증하고, 이후 솔루션 화면으로 안전하게 연결한다.

참고 문서: https://docs.odds-api.io/

## 1) 데이터 소스 분리 (필수)

- [ ] WS 실시간 피드: `/hq/odds-api-ws/*` (관리자 제어/모니터링)
- [ ] 프리마켓 스냅샷: `/public/sports-prematch`
- [ ] 라이브 스냅샷: `/public/sports-live`
- [ ] OddsHost 프록시(보조): `/public/oddshost/*`
- [ ] 결론: **모든 데이터를 WS로 받지 않는다** (WS + REST + snapshot 혼합)

## 2) 관리자 기능 (우선 완료 대상)

- [ ] API 키/종목/마켓/status/autoConnect 제어
- [ ] 북메이커 on/off 제어 (bookmakers 필터)
- [ ] 헬스체크(`service-health`) 한 화면 확인
- [ ] 원본 이벤트 테이블 + 가공 매치 테이블 동시 확인
- [ ] 프리마켓 테스트(비WS) 실행/결과 확인

## 3) odds-api 문서 기능 매핑

- [ ] Authentication(API Key) 적용
- [ ] Sports 목록/필터 (`GET /sports`)
- [ ] Bookmakers 목록 (`GET /bookmakers`)
- [ ] Leagues 목록 (`GET /leagues`)
- [ ] Live odds
- [ ] Pre-match odds
- [ ] Multiple markets (ML/Spread/Totals)
- [ ] Bookmaker filtering
- [ ] Period scores
- [ ] Direct bet links(url)
- [ ] WebSocket real-time feed
- [ ] Events 검색/조회 (`/events`, `/events/live`, `/events/search`, `/events/{id}`)
- [ ] Multi odds (`GET /odds/multi`)
- [ ] Updated odds / movements (`/odds/updated`, `/odds/movements`)
- [ ] Value bets / Arbitrage / Dropping odds
- [ ] Participants

## 4) 서버 가공(관리자 기준) 고도화

- [ ] 리그명/팀명 표준화
- [ ] 리그 심볼/로고 매핑
- [ ] 다국어 번역(ko/en) 규칙
- [ ] 마진/정렬 규칙 고정
- [ ] 북메이커 우선순위 정책

## 5) 솔루션 연결 전 게이트

- [ ] 관리자 화면에서 기능별 검증 케이스 통과
- [ ] 프리마켓/라이브/WS 데이터 일관성 점검
- [ ] 장애 시 fallback 경로 확인 (snapshot 우선, ws 보조 등)
- [ ] 운영 체크리스트 문서화

## 6) 권장 이행 순서

1. 관리자 입력/가시성 UI 안정화  
2. 프리마켓(비WS) 테스트 루틴 고정  
3. WS + 가공 매치 검증  
4. 번역/리그 심볼/정렬 정책 확정  
5. 솔루션 탭별 순차 연결

## 7) 즉시 구현 후보 (다음 스프린트)

- [ ] 관리자 `Live Odds` 페이지에 `GET /bookmakers` 조회 + 토글 자동채움
- [ ] 관리자 `Live Odds` 페이지에 `GET /sports` 조회 + sport 필터 자동채움
- [ ] 프리마켓 테스트 결과에 `league/event/game` 건수 상세 표시
- [ ] `odds/multi` 기반 배치 보강 경로 추가 (event 단건 호출 과다 방지)
