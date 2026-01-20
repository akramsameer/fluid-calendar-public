import "@/app/globals.css";

import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { Toaster } from "sonner";

export default function BookLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider attribute="data-theme" enableSystem={true}>
      {children}
      <Toaster />
    </ThemeProvider>
  );
}
