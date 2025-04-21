import "@/app/globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { SessionProvider } from "@/components/providers/SessionProvider";

export default function OpenSourceHomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider
      attribute="data-theme"
      forcedTheme="light"
      enableSystem={false}
    >
      <SessionProvider>{children}</SessionProvider>
    </ThemeProvider>
  );
}
