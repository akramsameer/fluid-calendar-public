"use client";

import { inter } from "@/lib/fonts";
import "../app/globals.css";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getTitleFromPathname } from "@/lib/utils/page-title";

export default function Loading() {
  // Use client-side rendering to avoid hydration issues
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
    // Set document title on the client side
    const title = getTitleFromPathname(pathname);
    document.title = `Loading ${title}`;
  }, [pathname]);

  // Only render the full content after mounting on the client
  if (!mounted) {
    return null;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
      <p className={inter.className}>Loading...</p>
    </div>
  );
}
