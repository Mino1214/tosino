"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <p tabIndex={-1} className="text-lg font-medium text-zinc-100">
        문제가 발생했습니다
      </p>
      {process.env.NODE_ENV === "development" && (
        <pre className="max-w-full overflow-auto text-left text-xs text-zinc-500">
          {error.message}
        </pre>
      )}
      <button
        type="button"
        onClick={() => reset()}
        className="rounded-lg bg-zinc-200 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-300"
      >
        다시 시도
      </button>
    </div>
  );
}
