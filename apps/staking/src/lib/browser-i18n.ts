export type AppLocale = "ko" | "en" | "zh-CN";

export const DEFAULT_LOCALE: AppLocale = "ko";
export const SUPPORTED_LOCALES: AppLocale[] = ["ko", "en", "zh-CN"];

type Translation = Record<AppLocale, string>;

const ENTRIES: Array<[string, Translation]> = [
  ["로그인", { ko: "로그인", en: "Log in", "zh-CN": "登录" }],
  ["회원가입", { ko: "회원가입", en: "Sign up", "zh-CN": "注册" }],
  ["로그아웃", { ko: "로그아웃", en: "Log out", "zh-CN": "退出登录" }],
  ["아이디", { ko: "아이디", en: "Username", "zh-CN": "用户名" }],
  ["비밀번호", { ko: "비밀번호", en: "Password", "zh-CN": "密码" }],
  ["이미 계정이 있나요?", { ko: "이미 계정이 있나요?", en: "Already have an account?", "zh-CN": "已有账户？" }],
  ["계정이 없나요?", { ko: "계정이 없나요?", en: "No account yet?", "zh-CN": "还没有账户？" }],
  [
    "아이디와 비밀번호를 입력해 로그인하세요.",
    { ko: "아이디와 비밀번호를 입력해 로그인하세요.", en: "Enter your username and password to log in.", "zh-CN": "请输入用户名和密码登录。" },
  ],
  [
    "아이디와 비밀번호로 StakingDemo 계정을 만드세요. 이메일 형식 아이디는 사용할 수 없습니다.",
    {
      ko: "아이디와 비밀번호로 StakingDemo 계정을 만드세요. 이메일 형식 아이디는 사용할 수 없습니다.",
      en: "Create a StakingDemo account with a username and password. Email-style usernames are not supported.",
      "zh-CN": "使用用户名和密码创建 StakingDemo 账户。不支持邮箱格式的用户名。",
    },
  ],
  ["대시보드", { ko: "대시보드", en: "Dashboard", "zh-CN": "仪表板" }],
  ["트레이딩 봇", { ko: "트레이딩 봇", en: "Trading Bots", "zh-CN": "交易机器人" }],
  ["스테이킹 토큰", { ko: "스테이킹 토큰", en: "Staking Tokens", "zh-CN": "质押代币" }],
  ["뉴스", { ko: "뉴스", en: "News", "zh-CN": "新闻" }],
  ["캘린더", { ko: "캘린더", en: "Calendar", "zh-CN": "日历" }],
  ["에어드롭 캘린더", { ko: "에어드롭 캘린더", en: "Airdrop Calendar", "zh-CN": "空投日历" }],
  ["가이드", { ko: "가이드", en: "Guide", "zh-CN": "指南" }],
  ["회사 소개", { ko: "회사 소개", en: "About", "zh-CN": "关于我们" }],
  ["문의 보내기", { ko: "문의 보내기", en: "Send inquiry", "zh-CN": "发送咨询" }],
  ["Products", { ko: "제품", en: "Products", "zh-CN": "产品" }],
  ["Resources", { ko: "자료", en: "Resources", "zh-CN": "资源" }],
  ["Company", { ko: "회사", en: "Company", "zh-CN": "公司" }],
  ["About", { ko: "소개", en: "About", "zh-CN": "关于" }],
  ["Contact", { ko: "문의", en: "Contact", "zh-CN": "联系" }],
  ["Products", { ko: "제품", en: "Products", "zh-CN": "产品" }],
  [
    "인증된 거래소·DeFi·지갑의 스테이킹 이자율을 기관 수준으로 검증·분석하는 비수탁 데이터 플랫폼.",
    {
      ko: "인증된 거래소·DeFi·지갑의 스테이킹 이자율을 기관 수준으로 검증·분석하는 비수탁 데이터 플랫폼.",
      en: "A non-custodial data platform that verifies and analyzes staking rates from trusted exchanges, DeFi protocols, and wallets at an institutional standard.",
      "zh-CN": "一个非托管数据平台，以机构级标准验证和分析可信交易所、DeFi 协议及钱包的质押收益率。",
    },
  ],
  [
    "APR/APY 수치는 추정치이며 보장되지 않습니다. 본 사이트는 투자 자문을 제공하지 않으며 모든 스테이킹은 사용자 책임 하에 진행됩니다.",
    {
      ko: "APR/APY 수치는 추정치이며 보장되지 않습니다. 본 사이트는 투자 자문을 제공하지 않으며 모든 스테이킹은 사용자 책임 하에 진행됩니다.",
      en: "APR/APY figures are estimates and are not guaranteed. This site does not provide investment advice, and all staking is performed at the user's own responsibility.",
      "zh-CN": "APR/APY 数值仅为估算，不作保证。本网站不提供投资建议，所有质押均由用户自行承担责任。",
    },
  ],
  ["StakingDemo Dashboard", { ko: "StakingDemo 대시보드", en: "StakingDemo Dashboard", "zh-CN": "StakingDemo 仪表板" }],
  ["안녕하세요,", { ko: "안녕하세요,", en: "Hello,", "zh-CN": "您好，" }],
  ["님", { ko: "님", en: "", "zh-CN": "" }],
  ["새로고침", { ko: "새로고침", en: "Refresh", "zh-CN": "刷新" }],
  ["총 자산", { ko: "총 자산", en: "Total assets", "zh-CN": "总资产" }],
  ["전체자산", { ko: "전체자산", en: "All assets", "zh-CN": "全部资产" }],
  ["예치가능자산", { ko: "예치가능자산", en: "Depositable assets", "zh-CN": "可存入资产" }],
  ["예치중인 자산(스테이킹자산)", { ko: "예치중인 자산(스테이킹자산)", en: "Deposited assets (staking assets)", "zh-CN": "存入中资产（质押资产）" }],
  ["예치 자산", { ko: "예치 자산", en: "Staked assets", "zh-CN": "已存入资产" }],
  ["총 예치 금액", { ko: "총 예치 금액", en: "Total staked value", "zh-CN": "总存入金额" }],
  ["최근 지급", { ko: "최근 지급", en: "Latest payout", "zh-CN": "最近发放" }],
  ["대기 중", { ko: "대기 중", en: "Waiting", "zh-CN": "等待中" }],
  ["지갑을 연결하면 실제 온체인 잔액과 보상 시뮬레이션을 보여드립니다.", { ko: "지갑을 연결하면 실제 온체인 잔액과 보상 시뮬레이션을 보여드립니다.", en: "Connect a wallet to view live on-chain balances and reward simulations.", "zh-CN": "连接钱包后即可查看实时链上余额和奖励模拟。" }],
  ["지갑을 연결하면 실제 보유 자산이 표시됩니다.", { ko: "지갑을 연결하면 실제 보유 자산이 표시됩니다.", en: "Connect a wallet to show your live assets.", "zh-CN": "连接钱包后将显示实际持有资产。" }],
  ["연결된 실제 보유 코인 기준", { ko: "연결된 실제 보유 코인 기준", en: "Based on connected live coin balances", "zh-CN": "基于已连接的实时持币余额" }],
  ["지원 네트워크 연결 후 실제 온체인 잔액 표시", { ko: "지원 네트워크 연결 후 실제 온체인 잔액 표시", en: "Connect a supported network to show live on-chain balances", "zh-CN": "连接支持的网络后显示实时链上余额" }],
  ["EVM 계열/TRON 연결 자산 기준", { ko: "EVM 계열/TRON 연결 자산 기준", en: "Based on connected EVM/TRON assets", "zh-CN": "基于已连接的 EVM/TRON 资产" }],
  ["지갑 연결 시 실제 온체인 잔액 표시", { ko: "지갑 연결 시 실제 온체인 잔액 표시", en: "Live on-chain balances after wallet connection", "zh-CN": "连接钱包后显示实时链上余额" }],
  ["총 보상 횟수", { ko: "총 보상 횟수", en: "Total reward count", "zh-CN": "总奖励次数" }],
  ["누적 보상 (30일)", { ko: "누적 보상 (30일)", en: "Cumulative rewards (30 days)", "zh-CN": "累计奖励（30 天）" }],
  ["평균 일일 보상", { ko: "평균 일일 보상", en: "Average daily reward", "zh-CN": "平均每日奖励" }],
  ["예상 일일 보상", { ko: "예상 일일 보상", en: "Estimated daily reward", "zh-CN": "预计每日奖励" }],
  ["최고 보상일", { ko: "최고 보상일", en: "Best reward day", "zh-CN": "最高奖励日" }],
  ["포트폴리오 구성", { ko: "포트폴리오 구성", en: "Portfolio allocation", "zh-CN": "投资组合构成" }],
  ["보상 성장 추이 (30일 시뮬레이션)", { ko: "보상 성장 추이 (30일 시뮬레이션)", en: "Reward growth trend (30-day simulation)", "zh-CN": "奖励增长趋势（30 日模拟）" }],
  ["누적 보상($)", { ko: "누적 보상($)", en: "Cumulative rewards ($)", "zh-CN": "累计奖励（$）" }],
  ["최근 보상 활동", { ko: "최근 보상 활동", en: "Recent reward activity", "zh-CN": "最近奖励活动" }],
  ["최근 5일", { ko: "최근 5일", en: "Last 5 days", "zh-CN": "最近 5 天" }],
  ["Supported LST", { ko: "대표 LST", en: "Supported LST", "zh-CN": "支持的 LST" }],
  ["대표 스테이킹 토큰 목록", { ko: "대표 스테이킹 토큰 목록", en: "Supported staking token list", "zh-CN": "支持的质押代币列表" }],
  ["네트워크별 대표 LST와 보유 여부를 함께 표시합니다.", { ko: "네트워크별 대표 LST와 보유 여부를 함께 표시합니다.", en: "Shows representative LSTs and whether you hold them by network.", "zh-CN": "按网络显示代表性 LST 及持有状态。" }],
  ["Deposit", { ko: "예치", en: "Deposit", "zh-CN": "存入" }],
  ["예치 가능한 보유 자산", { ko: "예치 가능한 보유 자산", en: "Assets available to deposit", "zh-CN": "可存入资产" }],
  ["왼쪽 목록 중 잔액이 있는 자산만 DB 정산형 LST 지급 요청을 만들 수 있습니다.", { ko: "왼쪽 목록 중 잔액이 있는 자산만 DB 정산형 LST 지급 요청을 만들 수 있습니다.", en: "Only assets with a balance in the left list can create a DB-settled LST payout request.", "zh-CN": "只有左侧列表中有余额的资产才能创建数据库结算型 LST 发放请求。" }],
  ["잔액이 있는 자산만 스테이킹 예치를 진행할 수 있습니다.", { ko: "잔액이 있는 자산만 스테이킹 예치를 진행할 수 있습니다.", en: "Only assets with a balance can be staked.", "zh-CN": "只有有余额的资产可以进行质押存入。" }],
  ["Networks", { ko: "네트워크", en: "Networks", "zh-CN": "网络" }],
  ["지원 네트워크 연결", { ko: "지원 네트워크 연결", en: "Supported network connections", "zh-CN": "支持的网络连接" }],
  ["개 네트워크", { ko: "개 네트워크", en: " networks", "zh-CN": " 个网络" }],
  ["개 LST", { ko: "개 LST", en: " LSTs", "zh-CN": " 个 LST" }],
  ["개 상품", { ko: "개 상품", en: " products", "zh-CN": " 个产品" }],
  ["SDK 준비중", { ko: "SDK 준비중", en: "SDK pending", "zh-CN": "SDK 准备中" }],
  ["연결 중...", { ko: "연결 중...", en: "Connecting...", "zh-CN": "连接中..." }],
  ["지갑 변경", { ko: "지갑 변경", en: "Change wallet", "zh-CN": "更换钱包" }],
  ["지갑 연결", { ko: "지갑 연결", en: "Connect wallet", "zh-CN": "连接钱包" }],
  ["지갑 연결됨", { ko: "지갑 연결됨", en: "Wallet connected", "zh-CN": "钱包已连接" }],
  ["지갑 연결 (WalletConnect)", { ko: "지갑 연결 (WalletConnect)", en: "Connect wallet (WalletConnect)", "zh-CN": "连接钱包（WalletConnect）" }],
  ["지갑 미연결", { ko: "지갑 미연결", en: "Wallet not connected", "zh-CN": "钱包未连接" }],
  ["TRON 지갑 연결 (TronLink)", { ko: "TRON 지갑 연결 (TronLink)", en: "Connect TRON wallet (TronLink)", "zh-CN": "连接 TRON 钱包（TronLink）" }],
  ["지갑을 연결하세요 (550+ 지원)", { ko: "지갑을 연결하세요 (550+ 지원)", en: "Connect a wallet (550+ supported)", "zh-CN": "连接钱包（支持 550+）" }],
  ["다른 지갑 선택하기", { ko: "다른 지갑 선택하기", en: "Choose another wallet", "zh-CN": "选择其他钱包" }],
  ["연결한 네트워크에서 보유 중인 자산만 예치 요청할 수 있습니다.", { ko: "연결한 네트워크에서 보유 중인 자산만 예치 요청할 수 있습니다.", en: "You can request deposits only for assets held on connected networks.", "zh-CN": "只能对已连接网络中持有的资产发起存入请求。" }],
  ["예치 가능한 보유 자산이 없습니다.", { ko: "예치 가능한 보유 자산이 없습니다.", en: "No held assets are available to deposit.", "zh-CN": "没有可存入的持有资产。" }],
  ["예치중인 스테이킹 자산이 없습니다.", { ko: "예치중인 스테이킹 자산이 없습니다.", en: "No staking assets are currently deposited.", "zh-CN": "当前没有存入中的质押资产。" }],
  ["TronLink 지갑 연결", { ko: "TronLink 지갑 연결", en: "TronLink wallet connection", "zh-CN": "TronLink 钱包连接" }],
  ["TRX와 USDT(TRC20) 잔액을 표시합니다.", { ko: "TRX와 USDT(TRC20) 잔액을 표시합니다.", en: "Displays TRX and USDT (TRC20) balances.", "zh-CN": "显示 TRX 和 USDT（TRC20）余额。" }],
  ["TronLink 확장 프로그램으로 연결하세요.", { ko: "TronLink 확장 프로그램으로 연결하세요.", en: "Connect with the TronLink extension.", "zh-CN": "请使用 TronLink 扩展连接。" }],
  ["조회 중...", { ko: "조회 중...", en: "Loading...", "zh-CN": "查询中..." }],
  ["지갑을 연결하고 자산을 보유해야 보상 시뮬레이션이 시작됩니다.", { ko: "지갑을 연결하고 자산을 보유해야 보상 시뮬레이션이 시작됩니다.", en: "Connect a wallet and hold assets to start the reward simulation.", "zh-CN": "连接钱包并持有资产后将开始奖励模拟。" }],
  ["연결된 지갑에서 지원 자산 잔액을 찾지 못했습니다. ETH, BNB, MATIC, AVAX, TRX부터 실시간 감지합니다.", { ko: "연결된 지갑에서 지원 자산 잔액을 찾지 못했습니다. ETH, BNB, MATIC, AVAX, TRX부터 실시간 감지합니다.", en: "No supported asset balances were found in the connected wallet. ETH, BNB, MATIC, AVAX, and TRX are detected live first.", "zh-CN": "未在已连接钱包中找到支持资产余额。目前优先实时检测 ETH、BNB、MATIC、AVAX、TRX。" }],
  ["연결된 지갑에서 지원 자산 잔액을 찾지 못했습니다. ETH, BNB, MATIC, AVAX, USDT, TRX부터 실시간 감지합니다.", { ko: "연결된 지갑에서 지원 자산 잔액을 찾지 못했습니다. ETH, BNB, MATIC, AVAX, USDT, TRX부터 실시간 감지합니다.", en: "No supported asset balances were found in the connected wallet. ETH, BNB, MATIC, AVAX, USDT, and TRX are detected live first.", "zh-CN": "未在已连接钱包中找到支持资产余额。目前优先实时检测 ETH、BNB、MATIC、AVAX、USDT、TRX。" }],
  ["예치/receipt token 성격", { ko: "예치/receipt token 성격", en: "Deposit / receipt token model", "zh-CN": "存入 / 收据代币模式" }],
  ["보유중", { ko: "보유중", en: "Held", "zh-CN": "已持有" }],
  ["보유", { ko: "보유", en: "Held", "zh-CN": "持有" }],
  ["대기", { ko: "대기", en: "Waiting", "zh-CN": "等待" }],
  ["준비중", { ko: "준비중", en: "Pending", "zh-CN": "准备中" }],
  ["플랫폼", { ko: "플랫폼", en: "Platform", "zh-CN": "平台" }],
  ["Stake", { ko: "스테이킹", en: "Stake", "zh-CN": "质押" }],
  ["스테이킹 예치", { ko: "스테이킹 예치", en: "Stake", "zh-CN": "质押存入" }],
  ["예치하기", { ko: "예치하기", en: "Stake", "zh-CN": "存入" }],
  ["지갑 승인 요청 중...", { ko: "지갑 승인 요청 중...", en: "Requesting wallet approval...", "zh-CN": "正在请求钱包授权..." }],
  ["예치 중...", { ko: "예치 중...", en: "Staking...", "zh-CN": "正在存入..." }],
  ["예치 요청 완료", { ko: "예치 요청 완료", en: "Stake request complete", "zh-CN": "存入请求已完成" }],
  ["보유 수량", { ko: "보유 수량", en: "Available to stake", "zh-CN": "可质押数量" }],
  ["예치된 수량", { ko: "예치된 수량", en: "Staked amount", "zh-CN": "已存入数量" }],
  ["예상 수령", { ko: "예상 수령", en: "You will receive", "zh-CN": "预计收到" }],
  ["교환 비율", { ko: "교환 비율", en: "Exchange rate", "zh-CN": "兑换比例" }],
  ["지갑 승인", { ko: "지갑 승인", en: "Wallet approval", "zh-CN": "钱包授权" }],
  ["지갑 승인 필요", { ko: "지갑 승인 필요", en: "Approval required", "zh-CN": "需要钱包授权" }],
  ["승인 완료", { ko: "승인 완료", en: "Approved", "zh-CN": "已授权" }],
  ["승인 불필요", { ko: "승인 불필요", en: "No approval needed", "zh-CN": "无需授权" }],
  ["예상 APR", { ko: "예상 APR", en: "Estimated APR", "zh-CN": "预计 APR" }],
  ["보상 수수료", { ko: "보상 수수료", en: "Reward fee", "zh-CN": "奖励费用" }],
  ["요청 자산", { ko: "요청 자산", en: "Requested asset", "zh-CN": "请求资产" }],
  ["DB Settlement", { ko: "DB 정산", en: "DB Settlement", "zh-CN": "数据库结算" }],
  ["Amount", { ko: "수량", en: "Amount", "zh-CN": "数量" }],
  ["요청 중...", { ko: "요청 중...", en: "Requesting...", "zh-CN": "请求中..." }],
  ["요청 접수됨", { ko: "요청 접수됨", en: "Request received", "zh-CN": "请求已接收" }],
  ["지급 요청", { ko: "지급 요청", en: "payout request", "zh-CN": "发放请求" }],
  ["예치 요청 →", { ko: "예치 요청 →", en: "deposit request →", "zh-CN": "存入请求 →" }],
  ["DB 지급", { ko: "DB 지급", en: "DB payout", "zh-CN": "数据库发放" }],
  ["지급 요청하기", { ko: "지급 요청하기", en: "Request payout", "zh-CN": "请求发放" }],
  ["Approve 불가", { ko: "Approve 불가", en: "Approve unavailable", "zh-CN": "无法授权" }],
  ["Allowance OK", { ko: "Allowance OK", en: "Allowance OK", "zh-CN": "Allowance OK" }],
  ["서명 중...", { ko: "서명 중...", en: "Signing...", "zh-CN": "签名中..." }],
  ["네이티브 코인은 ERC-20 allowance가 없습니다.", { ko: "네이티브 코인은 ERC-20 allowance가 없습니다.", en: "Native coins do not have ERC-20 allowance.", "zh-CN": "原生币没有 ERC-20 授权额度。" }],
  ["TRON 자산은 현재 ERC-20 approve/allowance 대상이 아닙니다.", { ko: "TRON 자산은 현재 ERC-20 approve/allowance 대상이 아닙니다.", en: "TRON assets are not currently covered by ERC-20 approve/allowance.", "zh-CN": "TRON 资产当前不属于 ERC-20 approve/allowance 范围。" }],
  ["관리자 콘솔에서 확인 후", { ko: "관리자 콘솔에서 확인 후", en: "After admin console review,", "zh-CN": "管理员控制台确认后，" }],
  ["를 DB상 지급 처리합니다.", { ko: "를 DB상 지급 처리합니다.", en: " is credited in the DB.", "zh-CN": " 将在数据库中发放。" }],
  ["관리자 콘솔에서 확인 후 LST를 DB상 지급 처리합니다.", { ko: "관리자 콘솔에서 확인 후 LST를 DB상 지급 처리합니다.", en: "After admin console review, the LST is credited in the DB.", "zh-CN": "管理员控制台确认后，将在数据库中发放 LST。" }],
  ["ⓘ 이 화면은 “관리자 정산 모델”입니다. 온체인 mint 없이 관리자 콘솔에서", { ko: "ⓘ 이 화면은 “관리자 정산 모델”입니다. 온체인 mint 없이 관리자 콘솔에서", en: "ⓘ This screen uses the admin settlement model. From the admin console,", "zh-CN": "ⓘ 此页面使用“管理员结算模型”。管理员控制台将" }],
  ["를 지급합니다.", { ko: "를 지급합니다.", en: " is credited without on-chain minting.", "zh-CN": " 发放，无需链上 mint。" }],
  ["ⓘ 이 화면은 “관리자 정산 모델”입니다. 온체인 mint 없이 관리자 콘솔에서 LST를 지급합니다.", { ko: "ⓘ 이 화면은 “관리자 정산 모델”입니다. 온체인 mint 없이 관리자 콘솔에서 LST를 지급합니다.", en: "ⓘ This screen uses the admin settlement model. The LST is credited from the admin console without on-chain minting.", "zh-CN": "ⓘ 此页面使用“管理员结算模型”。无需链上 mint，由管理员控制台发放 LST。" }],
  ["ⓘ 이번 요청은 실제 민팅 없이 DB에 지급 요청을 남깁니다. ERC-20 자산은", { ko: "ⓘ 이번 요청은 실제 민팅 없이 DB에 지급 요청을 남깁니다. ERC-20 자산은", en: "ⓘ This request records a DB payout request without actual minting. For ERC-20 assets,", "zh-CN": "ⓘ 本次请求不会实际 mint，只会在数据库中留下发放请求。对于 ERC-20 资产，" }],
  ["사용자가 명시적으로 Approve한 범위 안에서만 관리자가 transferFrom을", { ko: "사용자가 명시적으로 Approve한 범위 안에서만 관리자가 transferFrom을", en: "the admin can run transferFrom only within the amount explicitly approved by the user", "zh-CN": "管理员只能在用户明确 Approve 的额度内执行 transferFrom" }],
  ["실행할 수 있습니다.", { ko: "실행할 수 있습니다.", en: "can be executed.", "zh-CN": "。" }],
  ["ⓘ 이번 요청은 실제 민팅 없이 DB에 지급 요청을 남깁니다. ERC-20 자산은 사용자가 명시적으로 Approve한 범위 안에서만 관리자가 transferFrom을 실행할 수 있습니다.", { ko: "ⓘ 이번 요청은 실제 민팅 없이 DB에 지급 요청을 남깁니다. ERC-20 자산은 사용자가 명시적으로 Approve한 범위 안에서만 관리자가 transferFrom을 실행할 수 있습니다.", en: "ⓘ This request records a DB payout request without actual minting. For ERC-20 assets, the admin can run transferFrom only within the amount explicitly approved by the user.", "zh-CN": "ⓘ 本次请求不会实际 mint，只会在数据库中留下发放请求。对于 ERC-20 资产，管理员只能在用户明确 Approve 的额度内执行 transferFrom。" }],
  ["는 네이티브 자산이라 ERC-20 approve/allowance가 없습니다. 실제 입금 확인 후 DB 정산으로 처리됩니다.", { ko: "는 네이티브 자산이라 ERC-20 approve/allowance가 없습니다. 실제 입금 확인 후 DB 정산으로 처리됩니다.", en: " is a native asset, so it has no ERC-20 approve/allowance. After confirming the actual deposit, it is processed through DB settlement.", "zh-CN": " 是原生资产，因此没有 ERC-20 approve/allowance。实际入金确认后，将通过数据库结算处理。" }],
  ["는 TRON 자산이라 ERC-20 approve/allowance가 없습니다. 실제 입금 확인 후 DB 정산으로 처리됩니다.", { ko: "는 TRON 자산이라 ERC-20 approve/allowance가 없습니다. 실제 입금 확인 후 DB 정산으로 처리됩니다.", en: " is a TRON asset, so it has no ERC-20 approve/allowance. After confirming the actual deposit, it is processed through DB settlement.", "zh-CN": " 是 TRON 资产，因此没有 ERC-20 approve/allowance。实际入金确认后，将通过数据库结算处理。" }],
  ["관리자 EVM 지갑:", { ko: "관리자 EVM 지갑:", en: "Admin EVM wallet:", "zh-CN": "管理员 EVM 钱包：" }],
  ["연결 지갑:", { ko: "연결 지갑:", en: "Connected wallet:", "zh-CN": "已连接钱包：" }],
  ["닫기", { ko: "닫기", en: "Close", "zh-CN": "关闭" }],
  ["Admin", { ko: "관리자", en: "Admin", "zh-CN": "管理员" }],
  ["스테이킹 요청 관리", { ko: "스테이킹 요청 관리", en: "Staking request management", "zh-CN": "质押请求管理" }],
  ["관리자 수령 지갑", { ko: "관리자 수령 지갑", en: "Admin receiving wallet", "zh-CN": "管理员收款钱包" }],
  ["관리자 지갑 저장", { ko: "관리자 지갑 저장", en: "Save admin wallet", "zh-CN": "保存管理员钱包" }],
  ["모든 스테이킹을 한 화면에.", { ko: "모든 스테이킹을 한 화면에.", en: "All staking in one screen.", "zh-CN": "所有质押，一屏掌握。" }],
  ["검색 결과", { ko: "검색 결과", en: "Search results", "zh-CN": "搜索结果" }],
  ["최고 APY", { ko: "최고 APY", en: "Highest APY", "zh-CN": "最高 APY" }],
  ["평균 APY", { ko: "평균 APY", en: "Average APY", "zh-CN": "平均 APY" }],
  ["코인", { ko: "코인", en: "Coin", "zh-CN": "币种" }],
  ["카테고리", { ko: "카테고리", en: "Category", "zh-CN": "类别" }],
  ["락업", { ko: "락업", en: "Lockup", "zh-CN": "锁定期" }],
  ["최소수량", { ko: "최소수량", en: "Minimum", "zh-CN": "最低数量" }],
  ["보상 토큰", { ko: "보상 토큰", en: "Reward token", "zh-CN": "奖励代币" }],
  ["전체", { ko: "전체", en: "All", "zh-CN": "全部" }],
  ["거래소", { ko: "거래소", en: "Exchange", "zh-CN": "交易所" }],
  ["지갑", { ko: "지갑", en: "Wallet", "zh-CN": "钱包" }],
  ["유동성", { ko: "유동성", en: "Liquid", "zh-CN": "流动性" }],
  ["없음", { ko: "없음", en: "None", "zh-CN": "无" }],
  ["감사 완료", { ko: "감사 완료", en: "Audited", "zh-CN": "已审计" }],
  ["오늘의 스테이킹 뉴스.", { ko: "오늘의 스테이킹 뉴스.", en: "Today’s staking news.", "zh-CN": "今日质押新闻。" }],
  ["자세히 보기", { ko: "자세히 보기", en: "View details", "zh-CN": "查看详情" }],
  ["놓치면 안 되는 이벤트.", { ko: "놓치면 안 되는 이벤트.", en: "Events you should not miss.", "zh-CN": "不容错过的事件。" }],
  ["처음부터 전문가까지.", { ko: "처음부터 전문가까지.", en: "From beginner to expert.", "zh-CN": "从入门到专家。" }],
  ["학습 시작", { ko: "학습 시작", en: "Start learning", "zh-CN": "开始学习" }],
  ["팀에 문의하기", { ko: "팀에 문의하기", en: "Contact the team", "zh-CN": "联系团队" }],
  ["데이터로 스테이킹의 표준을 만듭니다.", { ko: "데이터로 스테이킹의 표준을 만듭니다.", en: "Setting the standard for staking with data.", "zh-CN": "用数据建立质押标准。" }],
  ["데이터 기반 스테이킹 인사이트 플랫폼", { ko: "데이터 기반 스테이킹 인사이트 플랫폼", en: "Data-driven staking insights platform", "zh-CN": "数据驱动的质押洞察平台" }],
  ["Data-Driven Staking", { ko: "데이터 기반 스테이킹", en: "Data-Driven Staking", "zh-CN": "数据驱动质押" }],
  ["스테이킹 수익률을", { ko: "스테이킹 수익률을", en: "Staking yield,", "zh-CN": "质押收益率，" }],
  ["한 화면에서.", { ko: "한 화면에서.", en: "all in one screen.", "zh-CN": "一屏掌握。" }],
  ["스캐너 시작하기", { ko: "스캐너 시작하기", en: "Start scanner", "zh-CN": "开始扫描" }],
  ["가이드 보기", { ko: "가이드 보기", en: "View guide", "zh-CN": "查看指南" }],
  ["분석 코인", { ko: "분석 코인", en: "Tracked coins", "zh-CN": "跟踪币种" }],
  ["지원가능 네트워크", { ko: "지원가능 네트워크", en: "Supported networks", "zh-CN": "支持的网络" }],
  ["주요 서비스", { ko: "주요 서비스", en: "Core services", "zh-CN": "核心服务" }],
  ["데이터 기반 스테이킹 인사이트의 모든 것", { ko: "데이터 기반 스테이킹 인사이트의 모든 것", en: "Everything for data-driven staking insights", "zh-CN": "数据驱动质押洞察的一切" }],
  ["바로가기", { ko: "바로가기", en: "Open", "zh-CN": "打开" }],
  ["3단계로 최적의 스테이킹을 찾으세요", { ko: "3단계로 최적의 스테이킹을 찾으세요", en: "Find the best staking option in 3 steps", "zh-CN": "三步找到最佳质押方案" }],
  ["코인 검색", { ko: "코인 검색", en: "Search coins", "zh-CN": "搜索币种" }],
  ["APY 비교", { ko: "APY 비교", en: "Compare APY", "zh-CN": "比较 APY" }],
  ["최적 선택", { ko: "최적 선택", en: "Choose the best", "zh-CN": "选择最佳方案" }],
  ["Security & Trust", { ko: "보안 및 신뢰", en: "Security & Trust", "zh-CN": "安全与信任" }],
  ["비수탁 구조", { ko: "비수탁 구조", en: "Non-custodial", "zh-CN": "非托管结构" }],
  ["데이터 암호화", { ko: "데이터 암호화", en: "Data encryption", "zh-CN": "数据加密" }],
  ["Cloudflare 보호", { ko: "Cloudflare 보호", en: "Cloudflare protection", "zh-CN": "Cloudflare 防护" }],
  ["자주 묻는 질문", { ko: "자주 묻는 질문", en: "FAQ", "zh-CN": "常见问题" }],
  ["회원가입 후 지갑을 연결하면 포트폴리오와 보상 추이까지 한 번에 확인할 수 있습니다.", { ko: "회원가입 후 지갑을 연결하면 포트폴리오와 보상 추이까지 한 번에 확인할 수 있습니다.", en: "Sign up and connect a wallet to view your portfolio and reward trends in one place.", "zh-CN": "注册并连接钱包后，可一站式查看投资组合和奖励趋势。" }],
  ["스캐너 둘러보기", { ko: "스캐너 둘러보기", en: "Explore scanner", "zh-CN": "浏览扫描器" }],
  ["거래소·DeFi·지갑별 APY를 정규화해 비교합니다. 카테고리, 코인, 정렬 기준을 자유롭게 조합해 최적의 풀을 찾아보세요.", { ko: "거래소·DeFi·지갑별 APY를 정규화해 비교합니다. 카테고리, 코인, 정렬 기준을 자유롭게 조합해 최적의 풀을 찾아보세요.", en: "Compare normalized APY across exchanges, DeFi, and wallets. Combine category, coin, and sorting filters to find the best pool.", "zh-CN": "比较交易所、DeFi 和钱包的标准化 APY。可自由组合类别、币种和排序条件，找到最佳池子。" }],
  ["코인 또는 플랫폼 검색 (예: ETH, Lido)", { ko: "코인 또는 플랫폼 검색 (예: ETH, Lido)", en: "Search coin or platform (e.g. ETH, Lido)", "zh-CN": "搜索币种或平台（例如 ETH、Lido）" }],
  ["매일 6시간마다 갱신되는 AI 큐레이션 뉴스. 프로토콜·시장·규제·리서치 카테고리로 분류되어 한눈에 확인할 수 있습니다.", { ko: "매일 6시간마다 갱신되는 AI 큐레이션 뉴스. 프로토콜·시장·규제·리서치 카테고리로 분류되어 한눈에 확인할 수 있습니다.", en: "AI-curated news refreshed every 6 hours, grouped into protocol, market, regulation, and research categories.", "zh-CN": "AI 精选新闻每 6 小时更新一次，按协议、市场、监管和研究分类。" }],
  ["프로토콜", { ko: "프로토콜", en: "Protocol", "zh-CN": "协议" }],
  ["규제", { ko: "규제", en: "Regulation", "zh-CN": "监管" }],
  ["시장", { ko: "시장", en: "Market", "zh-CN": "市场" }],
  ["리서치", { ko: "리서치", en: "Research", "zh-CN": "研究" }],
  ["에어드롭", { ko: "에어드롭", en: "Airdrop", "zh-CN": "空投" }],
  ["스냅샷", { ko: "스냅샷", en: "Snapshot", "zh-CN": "快照" }],
  ["거버넌스", { ko: "거버넌스", en: "Governance", "zh-CN": "治理" }],
  ["런칭", { ko: "런칭", en: "Launch", "zh-CN": "上线" }],
  ["검증된 에어드롭, 스냅샷, 거버넌스 표결, 메인넷 런칭 일정. 모든 이벤트는 공식 출처 확인 후 등록됩니다.", { ko: "검증된 에어드롭, 스냅샷, 거버넌스 표결, 메인넷 런칭 일정. 모든 이벤트는 공식 출처 확인 후 등록됩니다.", en: "Verified airdrops, snapshots, governance votes, and mainnet launches. Every event is added after official source checks.", "zh-CN": "已验证的空投、快照、治理投票和主网上线日程。所有事件均经官方来源确认后登记。" }],
  ["StakingDemo 가이드는 스테이킹의 기초부터 기관급 운영까지 단계적으로 학습할 수 있도록 구성되었습니다. 자신의 레벨에 맞는 트랙을 선택해 시작하세요.", { ko: "StakingDemo 가이드는 스테이킹의 기초부터 기관급 운영까지 단계적으로 학습할 수 있도록 구성되었습니다. 자신의 레벨에 맞는 트랙을 선택해 시작하세요.", en: "The StakingDemo guide is structured from staking basics to institutional operations. Choose the track that matches your level.", "zh-CN": "StakingDemo 指南覆盖从质押基础到机构级运营的学习路径。请选择适合自己水平的课程。" }],
  ["학습에 도움이 되는 추가 리소스", { ko: "학습에 도움이 되는 추가 리소스", en: "Additional learning resources", "zh-CN": "更多学习资源" }],
  ["가이드 외에도 실무에 즉시 활용할 수 있는 자료를 제공합니다.", { ko: "가이드 외에도 실무에 즉시 활용할 수 있는 자료를 제공합니다.", en: "We also provide resources you can use immediately in practice.", "zh-CN": "除指南外，我们还提供可立即用于实践的资料。" }],
  ["초보 트랙", { ko: "초보 트랙", en: "Beginner track", "zh-CN": "入门课程" }],
  ["중급 트랙", { ko: "중급 트랙", en: "Intermediate track", "zh-CN": "中级课程" }],
  ["고급 트랙", { ko: "고급 트랙", en: "Advanced track", "zh-CN": "高级课程" }],
  ["용어 사전", { ko: "용어 사전", en: "Glossary", "zh-CN": "术语表" }],
  ["리포트 라이브러리", { ko: "리포트 라이브러리", en: "Report library", "zh-CN": "报告库" }],
  ["커뮤니티", { ko: "커뮤니티", en: "Community", "zh-CN": "社区" }],
  ["데이터로 스테이킹의 표준을 만듭니다.", { ko: "데이터로 스테이킹의 표준을 만듭니다.", en: "Setting the staking standard with data.", "zh-CN": "以数据建立质押标准。" }],
  ["파트너십 / 데이터 제휴", { ko: "파트너십 / 데이터 제휴", en: "Partnerships / Data alliances", "zh-CN": "合作 / 数据合作" }],
  ["DMCC 등록", { ko: "DMCC 등록", en: "DMCC registration", "zh-CN": "DMCC 注册" }],
  ["추적 코인", { ko: "추적 코인", en: "Tracked coins", "zh-CN": "跟踪币种" }],
  ["분석 플랫폼", { ko: "분석 플랫폼", en: "Analyzed platforms", "zh-CN": "分析平台" }],
  ["전구간 암호화", { ko: "전구간 암호화", en: "End-to-end encryption", "zh-CN": "全程加密" }],
];

const TRANSLATIONS = new Map(ENTRIES);
const SOURCE_PHRASES = [...ENTRIES]
  .filter(([source]) => source.length > 1)
  .sort((a, b) => b[0].length - a[0].length);

export function coerceLocale(value: string | null | undefined): AppLocale | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "ko" || normalized.startsWith("ko-")) return "ko";
  if (normalized === "en" || normalized.startsWith("en-")) return "en";
  if (normalized === "zh" || normalized.startsWith("zh-")) return "zh-CN";
  return null;
}

export function resolveLocaleFromLanguages(
  languages: readonly string[] | undefined,
  fallback: AppLocale = DEFAULT_LOCALE,
): AppLocale {
  if (!languages?.length) return fallback;

  for (const language of languages) {
    const locale = coerceLocale(language);
    if (locale) return locale;
  }

  return "en";
}

export function resolveLocaleFromAcceptLanguage(
  acceptLanguage: string | null | undefined,
): AppLocale {
  if (!acceptLanguage) return DEFAULT_LOCALE;

  const languages = acceptLanguage
    .split(",")
    .map((part) => part.split(";")[0]?.trim())
    .filter((part): part is string => Boolean(part));

  return resolveLocaleFromLanguages(languages, DEFAULT_LOCALE);
}

export function translateText(text: string, locale: AppLocale): string {
  if (!text.trim()) return text;

  const leading = text.match(/^\s*/)?.[0] ?? "";
  const trailing = text.match(/\s*$/)?.[0] ?? "";
  const core = text.trim().replace(/\s+/g, " ");

  const exact = findTranslation(core, locale);
  if (exact !== undefined) return `${leading}${exact}${trailing}`;

  let translated = applyPatterns(core, locale);

  for (const [source, target] of SOURCE_PHRASES) {
    if (!canReplacePhrase(core, source)) continue;

    const replacement = target[locale];
    if (source !== replacement && translated.includes(source)) {
      translated = translated.split(source).join(replacement);
    }
  }

  return `${leading}${translated}${trailing}`;
}

function findTranslation(text: string, locale: AppLocale) {
  const sourceMatch = TRANSLATIONS.get(text)?.[locale];
  if (sourceMatch !== undefined) return sourceMatch;

  for (const [, target] of ENTRIES) {
    if (target.ko === text || target.en === text || target["zh-CN"] === text) {
      return target[locale];
    }
  }

  return undefined;
}

function canReplacePhrase(text: string, source: string) {
  if (!/[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(text)) return true;
  if (text === source) return true;
  if (source.length >= 8) return true;

  return /^[A-Za-z0-9\s·:/()+.,$%#_\-]+$/.test(text.replace(source, ""));
}

function applyPatterns(text: string, locale: AppLocale): string {
  if (locale === "ko") {
    return text
      .replace(/^(\d+) networks · (\d+) LSTs$/, "$1개 네트워크 · $2개 LST")
      .replace(/^(\d+) 个网络 · (\d+) 个 LST$/, "$1개 네트워크 · $2개 LST")
      .replace(/^(\d+) items$/, "$1개")
      .replace(/^(\d+) 个$/, "$1개")
      .replace(/^(\d+) products$/, "$1개 상품")
      .replace(/^(\d+) 个产品$/, "$1개 상품")
      .replace(/^Held (.+)$/, "보유 $1")
      .replace(/^持有 (.+)$/, "보유 $1")
      .replace(/^(.+) payout request$/, "$1 지급 요청")
      .replace(/^(.+) 发放请求$/, "$1 지급 요청")
      .replace(/^(.+) deposit request → (.+) DB payout$/, "$1 예치 요청 → $2 DB 지급")
      .replace(/^(.+) 存入请求 → (.+) 数据库发放$/, "$1 예치 요청 → $2 DB 지급")
      .replace(/^(.+) · total assets (.+)$/, "보유 $1 · 총 자산 $2")
      .replace(/^(.+) · 总资产 (.+)$/, "보유 $1 · 총 자산 $2")
      .replace(/^After admin console review, (.+) is credited in the DB\.$/, "관리자 콘솔에서 확인 후 $1를 DB상 지급 처리합니다.")
      .replace(/^管理员控制台确认后，将在数据库中发放 (.+)。$/, "관리자 콘솔에서 확인 후 $1를 DB상 지급 처리합니다.")
      .replace(/^ⓘ This screen uses the admin settlement model\. (.+) is credited from the admin console without on-chain minting\.$/, "ⓘ 이 화면은 “관리자 정산 모델”입니다. 온체인 mint 없이 관리자 콘솔에서 $1를 지급합니다.")
      .replace(/^ⓘ 此页面使用“管理员结算模型”。无需链上 mint，由管理员控制台发放 (.+)。$/, "ⓘ 이 화면은 “관리자 정산 모델”입니다. 온체인 mint 없이 관리자 콘솔에서 $1를 지급합니다.")
      .replace(/^(.+) is a native asset, so it has no ERC-20 approve\/allowance\. After confirming the actual deposit, it is processed through DB settlement\.$/, "$1는 네이티브 자산이라 ERC-20 approve/allowance가 없습니다. 실제 입금 확인 후 DB 정산으로 처리됩니다.")
      .replace(/^(.+) 是原生资产，因此没有 ERC-20 approve\/allowance。实际入金确认后，将通过数据库结算处理。$/, "$1는 네이티브 자산이라 ERC-20 approve/allowance가 없습니다. 실제 입금 확인 후 DB 정산으로 처리됩니다.");
  }

  const replacements =
    locale === "en"
      ? {
          networkCount: "$1 networks · $2 LSTs",
          products: "$1 products",
          items: "$1 items",
          heldCount: "Held $1",
          recentDays: "Last $1 days",
          saved: "Saved $1",
          connectedMainnet: "Mainnet · live balances + reward simulation linked to $1",
          hello: "Hello, $1",
          startStake: "Start staking — $1",
          stakeTitle: "Stake $1",
          stakeReceive: "Stake $1 and receive $2",
          payoutRequest: "$1 payout request",
          depositToPayout: "$1 deposit request → $2 DB payout",
          productBalance: "$1 · total assets $2",
          adminCredit: "After admin console review, $1 is credited in the DB.",
          adminModel:
            "ⓘ This screen uses the admin settlement model. $1 is credited from the admin console without on-chain minting.",
          nativeSettlement:
            "$1 is a native asset, so it has no ERC-20 approve/allowance. After confirming the actual deposit, it is processed through DB settlement.",
          month: "$1/",
          weekday: "$1",
        }
      : {
          networkCount: "$1 个网络 · $2 个 LST",
          products: "$1 个产品",
          items: "$1 个",
          heldCount: "持有 $1",
          recentDays: "最近 $1 天",
          saved: "已保存 $1",
          connectedMainnet: "Mainnet · 已连接 $1 的实时余额 + 奖励模拟",
          hello: "$1，您好",
          startStake: "开始质押 — $1",
          stakeTitle: "质押 $1",
          stakeReceive: "质押 $1 并获得 $2",
          payoutRequest: "$1 发放请求",
          depositToPayout: "$1 存入请求 → $2 数据库发放",
          productBalance: "$1 · 总资产 $2",
          adminCredit: "管理员控制台确认后，将在数据库中发放 $1。",
          adminModel:
            "ⓘ 此页面使用“管理员结算模型”。无需链上 mint，由管理员控制台发放 $1。",
          nativeSettlement:
            "$1 是原生资产，因此没有 ERC-20 approve/allowance。实际入金确认后，将通过数据库结算处理。",
          month: "$1月",
          weekday: "$1",
        };

  return text
    .replace(/^(\d+)개 네트워크 · (\d+)개 LST$/, replacements.networkCount)
    .replace(/^(\d+)개 상품$/, replacements.products)
    .replace(/^(\d+)개$/, replacements.items)
    .replace(/^보유 (\d+)$/, replacements.heldCount)
    .replace(/^최근 (\d+)일$/, replacements.recentDays)
    .replace(/^저장 (.+)$/, replacements.saved)
    .replace(/^(.+)님$/, "$1")
    .replace(/^Mainnet · (.+) 와 연동된 실시간 잔액 \+ 보상 시뮬레이션$/, replacements.connectedMainnet)
    .replace(/^안녕하세요, (.+)님$/, replacements.hello)
    .replace(/^스테이킹 시작 — (.+)$/, replacements.startStake)
    .replace(/^(.+) 예치$/, replacements.stakeTitle)
    .replace(/^(.+) 예치하고 (.+) 받기$/, replacements.stakeReceive)
    .replace(/^평균 일일 (.+)$/, locale === "en" ? "Daily average $1" : "平均每日 $1")
    .replace(/^≈ APR (.+) 가정$/, locale === "en" ? "≈ Assuming APR $1" : "≈ 假设 APR $1")
    .replace(/^(.+) 지급 요청$/, replacements.payoutRequest)
    .replace(/^(.+) 예치 요청 → (.+) DB 지급$/, replacements.depositToPayout)
    .replace(/^보유 (.+) · 총 자산 (.+)$/, replacements.productBalance)
    .replace(/^관리자 콘솔에서 확인 후 (.+)를 DB상 지급 처리합니다\.$/, replacements.adminCredit)
    .replace(/^ⓘ 이 화면은 “관리자 정산 모델”입니다\. 온체인 mint 없이 관리자 콘솔에서 (.+)를 지급합니다\.$/, replacements.adminModel)
    .replace(/^(.+)는 네이티브 자산이라 ERC-20 approve\/allowance가 없습니다\. 실제 입금 확인 후 DB 정산으로 처리됩니다\.$/, replacements.nativeSettlement)
    .replace(/^(\d+)월$/, replacements.month)
    .replace(/^([일월화수목금토])요일$/, (_, weekday: string) => {
      if (locale === "en") {
        const map: Record<string, string> = {
          일: "Sun",
          월: "Mon",
          화: "Tue",
          수: "Wed",
          목: "Thu",
          금: "Fri",
          토: "Sat",
        };
        return map[weekday] ?? weekday;
      }
      const map: Record<string, string> = {
        일: "周日",
        월: "周一",
        화: "周二",
        수: "周三",
        목: "周四",
        금: "周五",
        토: "周六",
      };
      return map[weekday] ?? weekday;
    });
}
