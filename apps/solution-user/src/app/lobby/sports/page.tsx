import { Suspense } from "react";
import { SportsHubClient } from "@/components/SportsHubClient";

export default function SportsHubPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-center text-sm text-zinc-500">
          불러오는 중…
        </div>
      }
    >
      <SportsHubClient />
    </Suspense>
  );
}
