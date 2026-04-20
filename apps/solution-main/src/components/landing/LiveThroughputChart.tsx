"use client";

import { useEffect, useRef, useState } from "react";

const BAR_COUNT = 20;
const LERP = 0.12;
/** SSR/CSR 첫 페인트 동일 — 마운트 후 랜덤·애니메이션 시작 */
const STATIC_HEIGHTS = Array.from({ length: BAR_COUNT }, (_, i) => 32 + ((i * 7) % 5) * 8);

function randomTargets(): number[] {
  return Array.from({ length: BAR_COUNT }, () => 18 + Math.random() * 78);
}

/** 히어로 우측 — 실시간처럼 막대 높이가 부드럽게 변하는 차트 */
export function LiveThroughputChart() {
  const heights = useRef<number[]>([...STATIC_HEIGHTS]);
  const targets = useRef<number[]>([...STATIC_HEIGHTS]);
  const [, setTick] = useState(0);
  const [noAnim, setNoAnim] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setNoAnim(true);
      return;
    }

    heights.current = randomTargets();
    targets.current = randomTargets();

    let raf = 0;
    const pickTargets = () => {
      targets.current = randomTargets();
    };
    const interval = window.setInterval(pickTargets, 450 + Math.random() * 350);

    const loop = () => {
      let changed = false;
      heights.current = heights.current.map((h, i) => {
        const t = targets.current[i] ?? 50;
        const next = h + (t - h) * LERP;
        if (Math.abs(next - t) > 0.12) changed = true;
        return next;
      });
      if (changed) setTick((n) => (n + 1) % 1_000_000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      clearInterval(interval);
      cancelAnimationFrame(raf);
    };
  }, []);

  const h = noAnim ? STATIC_HEIGHTS : heights.current;

  const linePoints = h.map((val, i) => `${i * 10 + 5},${100 - val}`).join(" ");
  const areaD = `M0,100 ${h
    .map((val, i) => {
      const x = i * 10 + 5;
      const y = 100 - val;
      return `L${x},${y}`;
    })
    .join(" ")} L${BAR_COUNT * 10},100 Z`;

  return (
    <div className="mt-4 rounded-lg border border-white/[0.08] bg-black/50 p-3">
      <div className="mb-2 flex items-center justify-between text-[10px] text-slate-500">
        <span>처리량 (실시간)</span>
        <span className="inline-flex items-center gap-1.5 font-medium text-cyan-300/90">
          <span className="relative flex h-2 w-2">
            {!noAnim ? (
              <>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
              </>
            ) : (
              <span className="inline-flex h-2 w-2 rounded-full bg-slate-500" />
            )}
          </span>
          LIVE
        </span>
      </div>
      <div className="relative h-28 overflow-hidden rounded-md bg-gradient-to-b from-violet-950/40 to-black/60 px-1 pt-2">
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full opacity-35"
          preserveAspectRatio="none"
          viewBox={`0 0 ${BAR_COUNT * 10} 100`}
          aria-hidden
        >
          <defs>
            <linearGradient id="liveAreaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="liveLineStroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#a78bfa" />
            </linearGradient>
          </defs>
          <path fill="url(#liveAreaFill)" d={areaD} />
          <polyline
            fill="none"
            stroke="url(#liveLineStroke)"
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            points={linePoints}
          />
        </svg>

        <div className="relative flex h-24 items-end justify-between gap-px px-0.5">
          {h.map((pct, i) => (
            <div
              key={i}
              className="flex-1 origin-bottom rounded-t bg-gradient-to-t from-violet-600/70 via-fuchsia-500/50 to-cyan-400/90 shadow-[0_0_12px_rgba(34,211,238,0.12)]"
              style={{ height: `${Math.min(100, Math.max(8, pct))}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
