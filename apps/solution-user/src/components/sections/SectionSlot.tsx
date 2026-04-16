"use client";

/*
  ─── SectionSlot (ZXX.BET slot-providers-main 참조) ─────────────
  구조:
    .slot-providers-main (배경 이미지)
      .slot_providers_content
        .top-container (타이틀 + "전체 보기")
        .slot-providers-grid
          .slot-provider-card × N
  ─────────────────────────────────────────────────────────────────
*/

import { SlotVendorCatalog } from "@/components/SlotVendorCatalog";
import { ProtectedNavLink } from "@/components/ProtectedNavLink";

const SLOT_PROVIDERS = [
  "CQ9", "Hacksaw", "PlayStar", "Octoplay", "Mobilots",
  "Evoplay", "Avatarux", "Netent", "JDB", "Nolimit City",
  "Bigtime Gaming", "Wazdan", "FC Game", "Blueprint",
];

export function SectionSlot() {
  return (
    <div className="px-3 py-4 sm:px-4">
      {/* 섹션 헤더 */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold text-white">슬롯</h2>
        <ProtectedNavLink href="/lobby/slots" className="text-xs text-main-gold">
          전체 보기 →
        </ProtectedNavLink>
      </div>

      {/* 제공사 그리드 (ZXX.BET: .slot-providers-grid) */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
        {SLOT_PROVIDERS.map((name) => (
          <button
            key={name}
            type="button"
            className="flex aspect-video items-center justify-center rounded border border-white/8 bg-white/3 text-center text-[10px] font-medium text-zinc-400"
          >
            {name}
          </button>
        ))}
      </div>

      {/* 기존 SlotVendorCatalog 재활용 */}
      <div className="mt-4">
        <SlotVendorCatalog className="mt-0" />
      </div>
    </div>
  );
}
