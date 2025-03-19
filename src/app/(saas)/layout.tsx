import "@/app/globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { Toaster } from "@/components/ui/sonner";
import Script from "next/script";
import { inter } from "@/lib/fonts";

export default function SAASLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>FluidCalendar - The Open-Source Intelligent Calendar</title>
        <meta
          name="description"
          content="The open-source intelligent calendar that adapts to your workflow. Experience seamless task scheduling powered by AI, designed to make your time management effortless."
        />
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}');
          `}
        </Script>
      </head>
      <body className={inter.className}>
        <ThemeProvider
          attribute="data-theme"
          forcedTheme="light"
          enableSystem={false}
        >
          <SessionProvider>
            {children}
          </SessionProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
