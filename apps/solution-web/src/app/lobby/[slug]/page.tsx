import Link from "next/link";
import { LiveCasinoLobby } from "./LiveCasinoLobby";

/* 전용 page.tsx가 없는 slug만 여기서 처리
   (live-casino / slots / minigame / sports / sports-kr / esports / prematch / live 등) */
const TITLES: Record<string, string> = {
  "cq9-casino": "CQ9 카지노",
  "sports-eu":  "유럽 스포츠",
  promo:        "이벤트",
};

export const dynamic = "force-static";

export function generateStaticParams() {
  return Object.keys(TITLES).map((slug) => ({ slug }));
}

export default async function LobbyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const title = TITLES[slug] ?? "게임";

  if (slug === "cq9-casino") {
    return (
      <LiveCasinoLobby
        title="CQ9 카지노"
        vendor="cq9_casino"
        launchSurface="casino-window"
      />
    );
  }

  if (slug === "sports-eu") {
    return (
      <LiveCasinoLobby
        title={title}
        vendor="bt1"
        game="bt1"
        launchSurface="casino-window"
        description="BT1 스포츠 — 배당·베팅은 이 사이트 지갑과 심리스로 연동됩니다."
      />
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <p className="text-sm text-main-gold-solid/65">준비 중</p>
      <h1 className="mt-2 text-2xl font-bold text-main-gold">{title}</h1>
      <p className="mt-4 text-zinc-400">
        게임사/API 연동 시 이 경로에서 런처 또는 iframe을 붙이면 됩니다.
      </p>
      <Link
        href="/"
        className="mt-8 inline-block rounded-xl bg-gold-gradient px-6 py-3 text-sm font-medium"
      >
        홈으로
      </Link>
    </div>
  );
}
