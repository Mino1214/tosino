export interface CoinTicker {
  symbol: string;
  price: number;
  color: string;
}

export const TICKER_COINS: CoinTicker[] = [
  { symbol: "ETH", price: 2262.51, color: "text-emerald-500" },
  { symbol: "BNB", price: 616.01, color: "text-amber-500" },
  { symbol: "TRX", price: 0.35, color: "text-red-500" },
  { symbol: "USDT", price: 1.0, color: "text-foreground" },
  { symbol: "CAKE", price: 1.45, color: "text-yellow-500" },
  { symbol: "XVS", price: 2.54, color: "text-cyan-500" },
  { symbol: "BAKE", price: 0.06, color: "text-orange-500" },
  { symbol: "UNI", price: 3.2, color: "text-pink-500" },
  { symbol: "AAVE", price: 92.9, color: "text-purple-500" },
  { symbol: "LINK", price: 9.11, color: "text-blue-500" },
  { symbol: "LDO", price: 0.37, color: "text-sky-500" },
  { symbol: "SOL", price: 142.18, color: "text-violet-500" },
  { symbol: "MATIC", price: 0.51, color: "text-indigo-500" },
];

export interface StakingOption {
  id: string;
  coin: string;
  coinName: string;
  platform: string;
  category: "거래소" | "DeFi" | "지갑";
  apy: number;
  lockup: string;
  minStake: number;
  payoutToken: string;
  audited: boolean;
}

export const STAKING_OPTIONS: StakingOption[] = [
  { id: "1", coin: "ETH", coinName: "Ethereum", platform: "Lido", category: "DeFi", apy: 3.4, lockup: "유동성", minStake: 0.001, payoutToken: "stETH", audited: true },
  { id: "2", coin: "ETH", coinName: "Ethereum", platform: "Rocket Pool", category: "DeFi", apy: 3.1, lockup: "유동성", minStake: 0.01, payoutToken: "rETH", audited: true },
  { id: "3", coin: "ETH", coinName: "Ethereum", platform: "Coinbase", category: "거래소", apy: 2.6, lockup: "없음", minStake: 0.0001, payoutToken: "cbETH", audited: true },
  { id: "4", coin: "ETH", coinName: "Ethereum", platform: "Binance", category: "거래소", apy: 2.9, lockup: "없음", minStake: 0.0001, payoutToken: "WBETH", audited: true },
  { id: "5", coin: "SOL", coinName: "Solana", platform: "Marinade", category: "DeFi", apy: 7.2, lockup: "유동성", minStake: 0.01, payoutToken: "mSOL", audited: true },
  { id: "6", coin: "SOL", coinName: "Solana", platform: "Jito", category: "DeFi", apy: 7.6, lockup: "유동성", minStake: 0.01, payoutToken: "jitoSOL", audited: true },
  { id: "7", coin: "SOL", coinName: "Solana", platform: "Phantom", category: "지갑", apy: 6.5, lockup: "2~3 epoch", minStake: 0.01, payoutToken: "SOL", audited: true },
  { id: "8", coin: "BNB", coinName: "BNB Chain", platform: "Binance", category: "거래소", apy: 3.8, lockup: "30일", minStake: 0.1, payoutToken: "BNB", audited: true },
  { id: "9", coin: "BNB", coinName: "BNB Chain", platform: "PancakeSwap", category: "DeFi", apy: 5.2, lockup: "유동성", minStake: 0.1, payoutToken: "CAKE", audited: true },
  { id: "10", coin: "ATOM", coinName: "Cosmos", platform: "Keplr", category: "지갑", apy: 14.2, lockup: "21일", minStake: 0.1, payoutToken: "ATOM", audited: true },
  { id: "11", coin: "MATIC", coinName: "Polygon", platform: "Lido", category: "DeFi", apy: 4.6, lockup: "유동성", minStake: 1, payoutToken: "stMATIC", audited: true },
  { id: "12", coin: "DOT", coinName: "Polkadot", platform: "Bifrost", category: "DeFi", apy: 12.4, lockup: "유동성", minStake: 1, payoutToken: "vDOT", audited: true },
  { id: "13", coin: "AVAX", coinName: "Avalanche", platform: "Benqi", category: "DeFi", apy: 5.8, lockup: "유동성", minStake: 0.01, payoutToken: "sAVAX", audited: true },
  { id: "14", coin: "ADA", coinName: "Cardano", platform: "Daedalus", category: "지갑", apy: 3.1, lockup: "없음", minStake: 5, payoutToken: "ADA", audited: true },
  { id: "15", coin: "NEAR", coinName: "NEAR", platform: "Meta Pool", category: "DeFi", apy: 9.3, lockup: "유동성", minStake: 0.5, payoutToken: "stNEAR", audited: true },
  { id: "16", coin: "USDT", coinName: "Tether", platform: "Aave", category: "DeFi", apy: 4.1, lockup: "없음", minStake: 1, payoutToken: "aUSDT", audited: true },
  { id: "17", coin: "USDT", coinName: "Tether", platform: "Binance", category: "거래소", apy: 6.5, lockup: "30일", minStake: 10, payoutToken: "USDT", audited: true },
  { id: "18", coin: "USDC", coinName: "USD Coin", platform: "Compound", category: "DeFi", apy: 3.7, lockup: "없음", minStake: 1, payoutToken: "cUSDC", audited: true },
  { id: "19", coin: "DAI", coinName: "Dai", platform: "MakerDAO DSR", category: "DeFi", apy: 5.0, lockup: "없음", minStake: 1, payoutToken: "sDAI", audited: true },
  { id: "20", coin: "OP", coinName: "Optimism", platform: "Velodrome", category: "DeFi", apy: 8.1, lockup: "1주", minStake: 1, payoutToken: "veOP", audited: true },
];

export interface NewsItem {
  id: string;
  title: string;
  excerpt: string;
  category: "프로토콜" | "규제" | "시장" | "리서치";
  source: string;
  publishedAt: string;
  imageHue: string;
}

export const NEWS_ITEMS: NewsItem[] = [
  { id: "1", title: "Lido V3, stVaults 정식 출시 — 모듈형 LST 시대 개막", excerpt: "Lido DAO가 발표한 stVaults는 노드 운영자별 맞춤형 위임을 가능하게 하며 기관 수요를 겨냥한다.", category: "프로토콜", source: "The Block", publishedAt: "2026-04-29", imageHue: "from-orange-300 to-pink-400" },
  { id: "2", title: "EigenLayer TVL 280억 달러 돌파, 리스테이킹 시장 재가속", excerpt: "AVS 출시 후 첫 분기 보상 정산이 임박하며 기관 자금이 재유입되고 있다.", category: "시장", source: "CoinDesk", publishedAt: "2026-04-28", imageHue: "from-violet-300 to-indigo-400" },
  { id: "3", title: "한국 금융위, '스테이블코인 + 스테이킹 결합 상품' 가이드라인 초안 공개", excerpt: "투자자 보호 항목과 비수탁 구조 의무화에 무게가 실린다.", category: "규제", source: "조선비즈", publishedAt: "2026-04-26", imageHue: "from-emerald-300 to-cyan-400" },
  { id: "4", title: "Solana 검증인 평균 APY 6.8%로 하락 — 위임자 행동 변화 분석", excerpt: "MEV 보상 비중이 늘어나면서 단순 PoS 보상 수익률은 점진적 하락 중.", category: "리서치", source: "Messari", publishedAt: "2026-04-24", imageHue: "from-purple-300 to-fuchsia-400" },
  { id: "5", title: "Binance, USDT 락업 스테이킹 6.5% APY 캠페인 연장", excerpt: "30일 락업 상품으로 한정 수량 1억 USDT 추가 배정.", category: "프로토콜", source: "Binance", publishedAt: "2026-04-22", imageHue: "from-amber-300 to-orange-400" },
  { id: "6", title: "Cosmos Hub, ATOM 인플레이션 모델 개정안 통과", excerpt: "최대 발행량 도입 및 스테이커 보호 메커니즘 강화.", category: "프로토콜", source: "Cosmos Hub", publishedAt: "2026-04-21", imageHue: "from-sky-300 to-blue-400" },
];

export interface CalendarEvent {
  id: string;
  title: string;
  type: "에어드롭" | "스냅샷" | "거버넌스" | "런칭";
  date: string;
  network: string;
  description: string;
}

export const CALENDAR_EVENTS: CalendarEvent[] = [
  { id: "1", title: "Hyperliquid Season 3 보상 청구", type: "에어드롭", date: "2026-05-04", network: "Arbitrum", description: "거래량 기반 누적 포인트 정산 및 첫 청구 윈도우 오픈." },
  { id: "2", title: "EtherFi Restaking 스냅샷", type: "스냅샷", date: "2026-05-09", network: "Ethereum", description: "AVS 분배 대상 사용자 스냅샷 — eETH 보유자 자동 적용." },
  { id: "3", title: "Lido DAO 모듈 추가 투표", type: "거버넌스", date: "2026-05-12", network: "Ethereum", description: "Community Staking Module 확장 안건 표결." },
  { id: "4", title: "Berachain 메인넷 스테이킹 오픈", type: "런칭", date: "2026-05-15", network: "Berachain", description: "BGT 위임 시작 — 초기 검증인 28개 등록 예정." },
  { id: "5", title: "Jito Restaking 시즌 토큰 청구", type: "에어드롭", date: "2026-05-18", network: "Solana", description: "JTO 보유자 대상 보너스 분배 라운드." },
  { id: "6", title: "Cosmos Hub 거버넌스 #912", type: "거버넌스", date: "2026-05-21", network: "Cosmos", description: "ATOM 인플레이션 매개변수 미세 조정 안건." },
  { id: "7", title: "Eigenpie LRT 추가 자산 등록", type: "런칭", date: "2026-05-25", network: "Ethereum", description: "ezETH/swETH 외 신규 LRT 페어 추가." },
  { id: "8", title: "MakerDAO DSR 금리 표결", type: "거버넌스", date: "2026-05-28", network: "Ethereum", description: "DAI Savings Rate 5.0% → 5.25% 인상안 검토." },
];
