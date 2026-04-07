import Link from "next/link";
import { LiveCasinoLobby } from "./LiveCasinoLobby";

const TITLES: Record<string, string> = {
  "live-casino": "라이브 카지노",
  "pragmatic-casino": "프라그마틱 카지노",
  slots: "슬롯",
  "sports-kr": "국내 스포츠",
  "sports-eu": "유럽 스포츠",
  minigame: "미니게임",
  promo: "이벤트",
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

  if (slug === "live-casino") {
    return <LiveCasinoLobby />;
  }

  if (slug === "pragmatic-casino") {
    return (
      <LiveCasinoLobby
        title="프라그마틱 카지노"
        vendor="pragmatic_casino"
        transferOnly
      />
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <p className="text-sm text-zinc-500">준비 중</p>
      <h1 className="mt-2 text-2xl font-bold text-white">{title}</h1>
      <p className="mt-4 text-zinc-400">
        게임사/API 연동 시 이 경로에서 런처 또는 iframe을 붙이면 됩니다.
      </p>
      <Link
        href="/"
        className="mt-8 inline-block rounded-xl px-6 py-3 text-sm font-medium text-black"
        style={{ backgroundColor: "var(--theme-primary, #c9a227)" }}
      >
        홈으로
      </Link>
    </div>
  );
}
