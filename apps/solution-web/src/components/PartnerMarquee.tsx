"use client";

/*
  PartnerMarquee — 파트너 로고 무한 << 방향 스크롤
  · 데스크톱 전용 (md:block, mobile에서 제거)
  · 리스트를 두 번 반복해 끊김 없는 루프 구현
  · 실제 로고 URL 주입 시 img src 교체
*/

const PARTNERS = [
  { name: "Evolution"        },
  { name: "Pragmatic Play"   },
  { name: "Vivo Gaming"      },
  { name: "Sexy Casino"      },
  { name: "PlayTech Live"    },
  { name: "SA Gaming"        },
  { name: "Skywind Live"     },
  { name: "Big Gaming"       },
  { name: "CQ9"              },
  { name: "Hacksaw Gaming"   },
  { name: "Netent"           },
  { name: "Evoplay"          },
  { name: "Nolimit City"     },
  { name: "Wazdan"           },
  { name: "Blueprint Gaming" },
  { name: "Booongo"          },
  { name: "Avatarux"         },
  { name: "FC Game"          },
];

export function PartnerMarquee() {
  return (
    <div className="hidden md:block bg-zinc-950 border-t border-white/5 py-14">
      <p className="mb-6 text-center text-[10px] uppercase tracking-[0.2em] text-zinc-600">
        Official Partners
      </p>

      {/* 무한 마퀴: 리스트 × 2 → CSS animation */}
      <div className="overflow-hidden">
        <div className="flex w-max animate-marquee gap-6">
          {[...PARTNERS, ...PARTNERS].map(({ name }, i) => (
            <div
              key={i}
              className="flex h-14 w-40 shrink-0 items-center justify-center rounded-md
                         border border-white/5 bg-white/[0.03] px-3 text-[11px] text-zinc-500
                         hover:border-white/10 hover:text-zinc-300 transition-colors"
            >
              {name}
            </div>
          ))}
        </div>
      </div>

      <p className="mt-10 text-center text-[10px] text-zinc-700">
        COPYRIGHT © TOSINO ALL RIGHTS RESERVED.
      </p>
    </div>
  );
}
