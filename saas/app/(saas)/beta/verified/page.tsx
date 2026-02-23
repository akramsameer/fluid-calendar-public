import { Metadata } from "next";

import VerifiedPageClient from "./verified-page-client";

export const metadata: Metadata = {
  title: "Email Verified | FluidCalendar Beta",
  description:
    "Your email has been verified for the FluidCalendar beta waitlist.",
};

export default function VerifiedPage() {
  return <VerifiedPageClient />;
}
