"use client";

export default function OddsApiWsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-zinc-100">Live Odds (odds-api.io)</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-zinc-400">
          스포츠 배당·인플레이 연동은 API 서버 환경변수{" "}
          <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-zinc-800">ODDSHOST_BASE_URL</code>,{" "}
          <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-zinc-800">ODDS_API_KEY</code> 로
          설정됩니다. 슈퍼어드민 헬스체크에서 OddsHost 응답을 확인할 수 있습니다.
        </p>
      </div>
      <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm dark:border-zinc-700/80 dark:bg-zinc-900/50">
        <p className="text-sm text-gray-700 dark:text-zinc-300">
          전용 UI는 준비 중입니다. 솔루션별 스포츠 피드·동기화는{" "}
          <strong className="text-gray-900 dark:text-zinc-100">솔루션 선택 후</strong> 알값/정책·헬스체크 화면과
          연동 로그를 사용해 주세요.
        </p>
      </div>
    </div>
  );
}
