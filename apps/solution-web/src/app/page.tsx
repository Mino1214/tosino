"use client";

/*
  ─── PageMain 규격 (ZXX.BET 참조) ──────────────────────────────────

  ZXX.BET #PageMain 구조:
    <div id="PageMain">
      <div class="section" style="width:100vw; height:100vh"> 스포츠 </div>
      <div class="section" style="width:100vw; height:100vh"> 카지노 </div>
      <div class="section" style="width:100vw; height:100vh"> 슬롯   </div>
      <div class="section" style="width:100vw; height:100vh"> 미니게임 </div>
    </div>

  우리 구현:
    - 각 섹션은 min-h-screen (100dvh)
    - 스크롤 위치로 앵커 이동 (id="sports" / "casino" / "slot" / "minigame")
    - BettingCartDock은 md에서 right-0 fixed, 모바일 슬라이드업
  ─────────────────────────────────────────────────────────────────
*/

import { BettingCartProvider } from "@/components/BettingCartContext";
import { BettingCartDock } from "@/components/BettingCartDock";
import { SectionSports } from "@/components/sections/SectionSports";
import { SectionCasino } from "@/components/sections/SectionCasino";
import { SectionSlot } from "@/components/sections/SectionSlot";
import { SectionMinigame } from "@/components/sections/SectionMinigame";

export default function HomePage() {
  return (
    <BettingCartProvider>
      <div id="PageMain" className="md:mr-72">

        {/* ① 스포츠 ─────────────────────────────────────────── */}
        <section id="sports" className="min-h-dvh">
          <SectionSports />
        </section>

        {/* ② 카지노 ─────────────────────────────────────────── */}
        <section id="casino" className="min-h-dvh border-t border-white/8">
          <SectionCasino />
        </section>

        {/* ③ 슬롯 ───────────────────────────────────────────── */}
        <section id="slot" className="min-h-dvh border-t border-white/8">
          <SectionSlot />
        </section>

        {/* ④ 미니게임 ────────────────────────────────────────── */}
        <section id="minigame" className="min-h-dvh border-t border-white/8">
          <SectionMinigame />
        </section>

      </div>

      {/* 배팅카트 */}
      <BettingCartDock />
    </BettingCartProvider>
  );
}
