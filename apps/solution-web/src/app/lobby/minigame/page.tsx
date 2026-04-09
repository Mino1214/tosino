/*
  미니게임 로비
  · 보글보글 / 슈퍼마리오 / 룰렛 / BTC파워볼 / 카지노게임
*/
import { AdBanner } from "@/components/SportsLobbyLayout";

const MINIGAMES = [
  { provider: "SkyPark", name: "스카이 바카라",        status: "LIVE", emoji: "🃏" },
  { provider: "SkyPark", name: "스카이 블랙잭",        status: "LIVE", emoji: "🃏" },
  { provider: "SkyPark", name: "스카이 스피드바카라",   status: "LIVE", emoji: "🃏" },
  { provider: "SkyPark", name: "스카이 드래곤타이거",   status: "LIVE", emoji: "🐉" },
  { provider: "Lotus",   name: "로투스 식보",           status: "LIVE", emoji: "🎲" },
  { provider: "Lotus",   name: "로투스 홀짝",           status: "LIVE", emoji: "🎲" },
  { provider: "Lotus",   name: "로투스 바카라",         status: "LIVE", emoji: "🃏" },
  { provider: "Bubble",  name: "보글보글",              status: "1분",  emoji: "🫧" },
  { provider: "Bubble",  name: "보글보글",              status: "2분",  emoji: "🫧" },
  { provider: "Bubble",  name: "보글보글",              status: "3분",  emoji: "🫧" },
  { provider: "Super",   name: "슈퍼 마리오",           status: "1분",  emoji: "🍄" },
  { provider: "Super",   name: "슈퍼 마리오",           status: "2분",  emoji: "🍄" },
  { provider: "Super",   name: "슈퍼 마리오",           status: "3분",  emoji: "🍄" },
  { provider: "Roulette",name: "룰렛",                  status: "1분",  emoji: "🎡" },
  { provider: "Roulette",name: "룰렛",                  status: "2분",  emoji: "🎡" },
  { provider: "Roulette",name: "룰렛",                  status: "3분",  emoji: "🎡" },
  { provider: "BTC",     name: "BTC 파워볼",            status: "1분",  emoji: "₿"  },
  { provider: "BTC",     name: "BTC 파워볼",            status: "2분",  emoji: "₿"  },
  { provider: "BTC",     name: "BTC 파워볼",            status: "3분",  emoji: "₿"  },
  { provider: "BTC",     name: "BTC 파워볼",            status: "4분",  emoji: "₿"  },
  { provider: "BTC",     name: "BTC 파워볼",            status: "5분",  emoji: "₿"  },
];

const PROVIDER_COLORS: Record<string, string> = {
  SkyPark: "from-blue-950/60",
  Lotus:   "from-emerald-950/60",
  Bubble:  "from-pink-950/60",
  Super:   "from-red-950/60",
  Roulette:"from-violet-950/60",
  BTC:     "from-amber-950/60",
};

export default function MinigamePage() {
  return (
    <div className="min-h-screen bg-zinc-950 pb-8">
      <AdBanner title="미니게임 이벤트 — 어린시절 추억이 가득한 레트로 게임!" />

      <div className="border-b border-white/5 px-4 py-5">
        <h1 className="text-xl font-bold text-white">미니게임</h1>
        <p className="mt-0.5 text-xs text-zinc-500">실시간 · 24시간 운영</p>
      </div>

      <div className="grid grid-cols-2 gap-2.5 px-3 pt-4 sm:grid-cols-3 lg:grid-cols-4">
        {MINIGAMES.map((g, i) => (
          <button
            key={i}
            type="button"
            className={`flex flex-col items-center justify-between gap-2 rounded-xl
                        border border-white/5 bg-gradient-to-b ${PROVIDER_COLORS[g.provider] ?? "from-zinc-900/60"} 
                        to-zinc-950 px-3 py-4 text-center transition-all
                        hover:border-[var(--theme-primary,#c9a227)]/40`}
          >
            <span
              className={`rounded px-2 py-0.5 text-[9px] font-bold uppercase ${
                g.status === "LIVE"
                  ? "bg-red-600/70 text-white"
                  : "bg-zinc-700 text-zinc-300"
              }`}
            >
              {g.status}
            </span>
            <span className="text-2xl">{g.emoji}</span>
            <span className="text-xs font-semibold text-zinc-300">{g.name}</span>
            <span className="text-[10px] text-zinc-600">{g.provider}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
