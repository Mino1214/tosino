"use client";

import Link from "next/link";
import { useState } from "react";

/* ══════════════════════════════════════════════════════════
   1. 내 정보
══════════════════════════════════════════════════════════ */
function ProfileSection() {
  return (
    <section className="border-b border-white/8 px-6 py-6">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-white/10 bg-zinc-800 text-3xl">
          👤
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-white">회원</p>
          <p className="text-xs text-zinc-500">Lv.1</p>
        </div>
        <div className="flex w-full gap-3">
          <div className="flex flex-1 flex-col items-center gap-1 rounded-xl border border-white/8 bg-white/3 py-4">
            <span className="text-[10px] uppercase tracking-widest text-zinc-500">MONEY</span>
            <span className="font-mono text-xl font-bold text-main-gold">0</span>
            <span className="text-[10px] text-zinc-500">원</span>
          </div>
          <div className="flex flex-1 flex-col items-center gap-1 rounded-xl border border-white/8 bg-white/3 py-4">
            <span className="text-[10px] uppercase tracking-widest text-zinc-500">POINT</span>
            <span className="font-mono text-xl font-bold text-pink-400">0</span>
            <span className="text-[10px] text-zinc-500">₱</span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════
   2. 롤링현황
══════════════════════════════════════════════════════════ */
function RollingSection() {
  const rolling = 0;
  return (
    <section id="rolling" className="border-b border-white/8 px-6 py-6">
      <h2 className="mb-4 text-sm font-bold text-white">롤링현황</h2>
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-400">롤링 달성</span>
          <span className="font-mono text-zinc-200">0 / 0원 ({rolling}%)</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-gold-gradient transition-all duration-500"
            style={{ width: `${rolling}%` }}
          />
        </div>
        <div className="overflow-hidden rounded-xl border border-white/8">
          {[
            ["입금금액", "0원"],
            ["보너스",   "0원"],
            ["추가롤링", "0원"],
            ["롤링배수", "×0"],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between border-b border-white/5 px-4 py-3 last:border-b-0">
              <span className="text-xs text-zinc-500">{label}</span>
              <span className="font-mono text-sm text-zinc-200">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════
   3. 전환 / 추천 카드
══════════════════════════════════════════════════════════ */
function ConversionSection() {
  const cards = [
    { title: "콤프전환",   btnLabel: "콤프전환",       href: "/wallet?tab=comp",     historyHref: "/mypage#comp-history" },
    { title: "포인트전환", btnLabel: "포인트전환",     href: "/wallet?tab=point",    historyHref: "/mypage#point-history" },
    { title: "지인추천",   btnLabel: "추천인보너스전환", href: "/wallet?tab=referral", historyHref: "/mypage#referral-history" },
  ];
  return (
    <section className="border-b border-white/8 px-6 py-6">
      <div className="grid grid-cols-3 gap-3">
        {cards.map((card) => (
          <div key={card.title} className="flex flex-col gap-2 rounded-xl border border-white/8 bg-white/3 p-3 text-center">
            <p className="text-xs font-semibold text-zinc-200">{card.title}</p>
            <Link href={card.href} className="rounded-lg bg-gold-gradient py-1.5 text-[11px] font-bold text-black">
              {card.btnLabel}
            </Link>
            <Link href={card.historyHref} className="text-[10px] text-zinc-500 hover:text-zinc-300">
              적립내역
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════
   4. 출석체크 달력
══════════════════════════════════════════════════════════ */
function AttendanceSection() {
  const today      = new Date();
  const year       = today.getFullYear();
  const month      = today.getMonth();
  const todayDate  = today.getDate();
  const firstDay   = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const checked    = new Set([1, 2, 3, 4, 5, 6, 7, 8]);
  const dayNames   = ["일", "월", "화", "수", "목", "금", "토"];
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <section id="attend" className="border-b border-white/8 px-6 py-6">
      <h2 className="mb-4 text-sm font-bold text-white">출석체크</h2>
      <div className="overflow-hidden rounded-xl border border-white/8">
        <div className="flex h-10 items-center justify-center border-b border-white/8 bg-white/3">
          <span className="text-sm font-semibold text-zinc-200">{year}년 {month + 1}월</span>
        </div>
        <div className="grid grid-cols-7 border-b border-white/5">
          {dayNames.map((d, i) => (
            <div key={d} className={`flex h-8 items-center justify-center text-[10px] font-medium ${i === 0 ? "text-red-400" : i === 6 ? "text-sky-400" : "text-zinc-500"}`}>
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((day, i) => (
            <div key={i} className={`flex h-10 items-center justify-center text-xs ${!day ? "" : day === todayDate ? "font-bold text-main-gold" : checked.has(day) ? "text-zinc-400" : "text-zinc-600"}`}>
              {day && (
                <span className={`flex h-7 w-7 items-center justify-center rounded-full ${checked.has(day) ? "bg-[rgba(218,174,87,0.2)]" : ""} ${day === todayDate ? "ring-1 ring-[rgba(218,174,87,0.65)]" : ""}`}>
                  {day}
                </span>
              )}
            </div>
          ))}
        </div>
        <div className="border-t border-white/8 p-3">
          <button type="button" className="w-full rounded-lg bg-gold-gradient py-2.5 text-sm font-bold text-black">
            오늘 출석체크
          </button>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════
   5. 공지사항
══════════════════════════════════════════════════════════ */
function NoticeSection() {
  const notices = [
    { title: "서비스 이용 안내",   date: "2026.04.08" },
    { title: "보안 업데이트 공지", date: "2026.04.07" },
    { title: "이벤트 당첨자 발표", date: "2026.04.06" },
  ];
  return (
    <section className="border-b border-white/8 px-6 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold text-white">공지사항</h2>
        <button type="button" className="text-xs text-zinc-500">전체보기</button>
      </div>
      <div className="overflow-hidden rounded-xl border border-white/8">
        {notices.map((n, i) => (
          <div key={i} className="flex items-center justify-between border-b border-white/5 px-4 py-3 last:border-b-0">
            <span className="text-sm text-zinc-300">{n.title}</span>
            <span className="text-[11px] text-zinc-600">{n.date}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════
   6. 이벤트 카드
══════════════════════════════════════════════════════════ */
function EventSection() {
  const events = [
    { id: "event1", badge: "진행중", title: "첫 충전 보너스",     desc: "첫 입금 시 30% 보너스 지급",   color: "from-amber-950/60" },
    { id: "event2", badge: "진행중", title: "피크타임 매충 이벤트", desc: "매 충전마다 5~10% 추가 지급", color: "from-violet-950/60" },
  ];
  return (
    <section className="px-6 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold text-white">이벤트</h2>
        <button type="button" className="text-xs text-zinc-500">전체보기</button>
      </div>
      <div className="space-y-3">
        {events.map((ev) => (
          <div key={ev.id} id={ev.id} className={`relative overflow-hidden rounded-xl border border-white/8 bg-gradient-to-r ${ev.color} to-transparent p-4`}>
            <span className="mb-1 inline-block rounded bg-gold-gradient px-1.5 py-0.5 text-[10px] font-bold text-black">{ev.badge}</span>
            <h3 className="text-sm font-bold text-white">{ev.title}</h3>
            <p className="mt-1 text-xs text-zinc-400">{ev.desc}</p>
            <button type="button" className="mt-3 rounded-lg border border-white/15 px-3 py-1.5 text-xs text-zinc-300">자세히 보기</button>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════
   메인 MyPage
══════════════════════════════════════════════════════════ */
export default function MyPage() {
  return (
    <div className="min-h-screen bg-zinc-950 pb-10">
      {/* 페이지 타이틀 */}
      <div className="border-b border-white/8 bg-zinc-900/60 px-6 py-5">
        <h1 className="text-xl font-bold text-white">마이페이지</h1>
      </div>

      {/* 모바일 앵커 탭 */}
      <div className="sticky top-12 z-30 flex h-10 border-b border-white/8 bg-[#0a0a0e] md:hidden">
        {["내정보", "롤링현황", "출석체크", "공지사항", "이벤트"].map((label, i) => (
          <a key={label} href={`#${["profile","rolling","attend","notice","event1"][i]}`}
             className="flex flex-1 items-center justify-center text-[10px] text-zinc-500 hover:text-zinc-200">
            {label}
          </a>
        ))}
      </div>

      {/* ── 모바일: 세로 스택 ── */}
      <div className="md:hidden">
        <div id="profile"><ProfileSection /></div>
        <RollingSection />
        <ConversionSection />
        <AttendanceSection />
        <div id="notice"><NoticeSection /></div>
        <EventSection />
      </div>

      {/* ── 데스크톱: 3컬럼 그리드
          Left (360px)  : 프로필 + 롤링 + 전환카드
          Middle (1fr)  : 출석체크 + 공지사항
          Right (1fr)   : 이벤트
      ── */}
      <div className="hidden md:grid md:grid-cols-[360px_1fr_1fr] md:divide-x md:divide-white/5">
        {/* 왼쪽 */}
        <div id="profile">
          <ProfileSection />
          <RollingSection />
          <ConversionSection />
        </div>

        {/* 가운데 */}
        <div id="attend">
          <AttendanceSection />
          <div id="notice"><NoticeSection /></div>
        </div>

        {/* 오른쪽 */}
        <div>
          <EventSection />
        </div>
      </div>
    </div>
  );
}
