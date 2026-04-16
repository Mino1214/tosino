"use client";

import { PlatformProvider } from "@/context/PlatformContext";
import { AdminConsoleModeProvider } from "@/context/AdminConsoleModeContext";
import { ConsoleChrome } from "@/components/ConsoleChrome";

export default function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PlatformProvider>
      <AdminConsoleModeProvider>
        <ConsoleChrome>{children}</ConsoleChrome>
      </AdminConsoleModeProvider>
    </PlatformProvider>
  );
}
