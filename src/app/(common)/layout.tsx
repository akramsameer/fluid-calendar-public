"use client";

import { useState, useEffect } from "react";
import "../globals.css";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { PrivacyProvider } from "@/components/providers/PrivacyProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { AppNav } from "@/components/navigation/AppNav";
import { DndProvider } from "@/components/dnd/DndProvider";
import { CommandPalette } from "@/components/ui/command-palette";
import { CommandPaletteHint } from "@/components/ui/command-palette-hint";
import { CommandPaletteFab } from "@/components/ui/command-palette-fab";
import { ShortcutsModal } from "@/components/ui/shortcuts-modal";
import { useShortcutsStore } from "@/store/shortcuts";
import { SetupCheck } from "@/components/setup/SetupCheck";
import { Toaster } from "@/components/ui/sonner";
import dynamic from "next/dynamic";
import { usePageTitle } from "@/hooks/use-page-title";

// Dynamically import the NotificationProvider based on SAAS flag
const NotificationProvider = dynamic<{ children: React.ReactNode }>(
  () =>
    import(
      `@/components/providers/NotificationProvider${process.env.NEXT_PUBLIC_ENABLE_SAAS_FEATURES === "true"
        ? ".saas"
        : ".open"
      }`
    ).then((mod) => mod.NotificationProvider),
  {
    ssr: false,
    loading: () => <>{/* Render nothing while loading */}</>,
  }
);

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const { isOpen: shortcutsOpen, setOpen: setShortcutsOpen } =
    useShortcutsStore();

  // Use the page title hook
  usePageTitle();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandPaletteOpen((open) => !open);
      } else if (e.key === "?" && !(e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setShortcutsOpen(true);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [setShortcutsOpen]);

  return (
    <div className="flex flex-col min-h-screen">
      <SessionProvider>
        <ThemeProvider attribute="data-theme" enableSystem={true}>
          <PrivacyProvider>
            <DndProvider>
              <SetupCheck />
              <CommandPalette
                open={commandPaletteOpen}
                onOpenChange={setCommandPaletteOpen}
              />
              <CommandPaletteHint />
              <CommandPaletteFab />
              <ShortcutsModal
                isOpen={shortcutsOpen}
                onClose={() => setShortcutsOpen(false)}
              />
              <AppNav />
              <main className="flex-1 relative">
                <NotificationProvider>{children}</NotificationProvider>
              </main>
              <Toaster />
            </DndProvider>
          </PrivacyProvider>
        </ThemeProvider>
      </SessionProvider>
    </div>
  );
}
