import type { Metadata } from "next";
import { Calendar as CalendarIcon, MapPin } from "lucide-react";
import { CALENDAR_EVENTS } from "@/lib/mock-data";

export const metadata: Metadata = {
  title: "캘린더",
  description:
    "에어드롭, 스냅샷, 거버넌스 표결, 메인넷 런칭 일정을 한눈에 확인하세요.",
};

const TYPE_COLOR: Record<string, string> = {
  에어드롭: "bg-pink-100 text-pink-700",
  스냅샷: "bg-violet-100 text-violet-700",
  거버넌스: "bg-amber-100 text-amber-700",
  런칭: "bg-emerald-100 text-emerald-700",
};

function formatDate(dateString: string) {
  const d = new Date(dateString);
  return {
    day: d.getDate(),
    month: `${d.getMonth() + 1}월`,
    weekday: ["일", "월", "화", "수", "목", "금", "토"][d.getDay()],
  };
}

export default function CalendarPage() {
  const sorted = [...CALENDAR_EVENTS].sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <header className="mb-10 max-w-3xl">
        <span className="text-xs font-semibold uppercase tracking-widest text-accent-strong">
          Events Calendar
        </span>
        <h1 className="mt-2 text-4xl font-extrabold tracking-tight sm:text-5xl">
          놓치면 안 되는 이벤트.
        </h1>
        <p className="mt-3 text-base leading-relaxed text-muted">
          검증된 에어드롭, 스냅샷, 거버넌스 표결, 메인넷 런칭 일정. 모든 이벤트는
          공식 출처 확인 후 등록됩니다.
        </p>
      </header>

      <ol className="space-y-3">
        {sorted.map((event) => {
          const f = formatDate(event.date);
          return (
            <li
              key={event.id}
              className="group flex flex-col gap-4 rounded-3xl border border-black/5 bg-white p-5 transition hover:-translate-y-0.5 hover:border-foreground/15 sm:flex-row sm:items-center"
            >
              <div className="flex w-20 shrink-0 flex-col items-center justify-center rounded-2xl bg-foreground py-3 text-white">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-white/60">
                  {f.month}
                </span>
                <span className="text-3xl font-extrabold leading-none">
                  {f.day}
                </span>
                <span className="mt-0.5 text-[10px] font-medium text-white/60">
                  {f.weekday}요일
                </span>
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${TYPE_COLOR[event.type] ?? "bg-black/10"}`}
                  >
                    {event.type}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-muted">
                    <MapPin className="h-3 w-3" />
                    {event.network}
                  </span>
                </div>
                <h2 className="mt-2 text-base font-bold sm:text-lg">
                  {event.title}
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-muted">
                  {event.description}
                </p>
              </div>
              <div className="hidden text-muted sm:block">
                <CalendarIcon className="h-5 w-5" />
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
