"use client";

/** 데모: 시간 · 팀(로고) vs 팀(로고) · 배당 — API 연동 전 목업 */
const ROWS = [
  {
    time: "04/09 04:00",
    home: { name: "바르셀로나", logo: "🔵" },
    away: { name: "레알 마드리드", logo: "⚪" },
    odds: ["1.72", "3.55", "3.80"],
  },
  {
    time: "04/09 22:30",
    home: { name: "맨체스터 시티", logo: "💠" },
    away: { name: "아스널", logo: "🔴" },
    odds: ["1.95", "3.40", "3.65"],
  },
  {
    time: "04/10 01:00",
    home: { name: "PSG", logo: "🗼" },
    away: { name: "바이에른", logo: "🔴" },
    odds: ["2.10", "3.25", "3.10"],
  },
];

export function SportsOddsPreview() {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/30">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-white/10 text-xs text-zinc-500">
            <th className="px-3 py-2 font-medium">시간</th>
            <th className="px-3 py-2 font-medium" colSpan={3}>
              매치업
            </th>
            <th className="px-2 py-2 text-center font-medium">승</th>
            <th className="px-2 py-2 text-center font-medium">무</th>
            <th className="px-2 py-2 text-center font-medium">패</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((r, i) => (
            <tr
              key={i}
              className="border-b border-white/5 transition hover:bg-white/[0.04]"
            >
              <td className="whitespace-nowrap px-3 py-3 font-mono text-xs text-zinc-400">
                {r.time}
              </td>
              <td className="px-2 py-3">
                <span className="mr-1.5 text-lg" aria-hidden>
                  {r.home.logo}
                </span>
                <span className="font-medium text-zinc-100">{r.home.name}</span>
              </td>
              <td className="px-1 py-3 text-center text-zinc-600">vs</td>
              <td className="px-2 py-3">
                <span className="mr-1.5 text-lg" aria-hidden>
                  {r.away.logo}
                </span>
                <span className="font-medium text-zinc-100">{r.away.name}</span>
              </td>
              {r.odds.map((o, j) => (
                <td key={j} className="px-2 py-3 text-center">
                  <button
                    type="button"
                    className="min-w-[3.25rem] rounded-lg bg-white/5 px-2 py-1.5 font-mono text-xs text-[var(--theme-primary,#c9a227)] ring-1 ring-white/10 hover:bg-white/10"
                  >
                    {o}
                  </button>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
