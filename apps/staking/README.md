# GramStake

데이터 기반 스테이킹 인사이트 플랫폼 — Lido.fi 디자인 톤을 참고한 GramStake.com 클론.

## 주요 기능

- **공개 마케팅 페이지** — 홈 / 스캐너 / 뉴스 / 캘린더 / 가이드 / About (Lido 스타일 라이트 톤)
- **회원 가입 & 로그인** — 아이디(이메일 형식 불가) + 비밀번호, SQLite + Prisma + bcrypt + JWT 세션 쿠키
- **멀티 지갑 연동 (WalletConnect)** — Reown AppKit + wagmi 기반, MetaMask · OKX · Binance · Coinbase · Trust 등 550+ 지갑 모달 지원, ETH 메인넷 / Arbitrum / Optimism / Base / Polygon / BSC 자동 인식
- **내 자산 리포트 대시보드** — 총자산, 포트폴리오 도넛 차트, 누적 보상 라인 차트(`recharts`) — 다크 테마

## 기술 스택

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS v4
- Prisma + SQLite (`prisma/dev.db`)
- bcryptjs, jose (JWT)
- wagmi + viem + @reown/appkit (멀티 지갑 / WalletConnect)
- @tanstack/react-query
- recharts, lucide-react

## 빠른 시작

```bash
npm install
npx prisma migrate dev   # 최초 1회
npm run dev              # http://localhost:3000
```

`.env`에 다음 환경변수가 필요합니다 (저장소에 dev용 기본값 포함):

| 키                            | 필수 | 설명                                                                                                         |
| ----------------------------- | ---- | ------------------------------------------------------------------------------------------------------------ |
| `DATABASE_URL`                | ✅   | Prisma SQLite 경로 (예: `file:./dev.db`)                                                                     |
| `SESSION_SECRET`              | ✅   | JWT 서명용 32자 이상 비밀키                                                                                  |
| `NEXT_PUBLIC_WC_PROJECT_ID`   | △    | WalletConnect Cloud([cloud.reown.com](https://cloud.reown.com))에서 발급받는 Project ID. 빈 값이면 데모용 임시 ID 사용 — 운영 배포 전 본인 ID로 교체 권장 |

## 페이지 맵

| 경로                 | 설명                                       | 인증 |
| -------------------- | ------------------------------------------ | ---- |
| `/`                  | 홈 (히어로, 통계, 서비스, 3단계, FAQ)      | -    |
| `/scanner`           | 스테이킹 스캐너 (필터 / 정렬 / 검색)       | -    |
| `/news`              | AI 뉴스 카드                                | -    |
| `/calendar`          | 에어드롭/스냅샷/거버넌스 캘린더             | -    |
| `/guide`             | 초/중/고급 학습 트랙                         | -    |
| `/about`             | GramStake DMCC 소개                         | -    |
| `/login`, `/signup`  | 인증 (아이디/비밀번호)                      | -    |
| `/a/me/my-assets`    | 대시보드 (지갑 연결 / 보상 차트)            | 필요 |

## API

| 메서드 | 경로                     | 설명                       |
| ------ | ------------------------ | -------------------------- |
| POST   | `/api/auth/signup`       | 회원가입 + 자동 로그인     |
| POST   | `/api/auth/login`        | 로그인                     |
| POST   | `/api/auth/logout`       | 로그아웃 (세션 쿠키 삭제)  |
| GET    | `/api/auth/me`           | 현재 로그인 사용자 조회    |
| PUT    | `/api/me/wallet`         | 지갑 주소 등록/해제 (인증) |

## 데이터

스테이킹 옵션, 뉴스, 캘린더, 가격 티커는 `src/lib/mock-data.ts` 의 mock 데이터를 사용합니다.
실제 가격 / APY 연동은 `CoinGecko`, `DefiLlama` 등으로 확장 가능합니다.

## 디자인 톤

- 마케팅 페이지: Lido.fi 스타일의 라이트 베이지 배경(`#faf6f1`) + 코랄 액센트(`#ff6b48`),
  큰 sans-serif 타이포그래피, 둥근 카드 / 도넛
- 대시보드: 짙은 슬레이트(`#0b1220`) 다크 테마, 시안 / 앰버 강조
