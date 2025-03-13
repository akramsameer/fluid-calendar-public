import { Metadata } from "next";
import VerifyPageClient from "./verify-page-client";

export const metadata: Metadata = {
  title: "Verify Email | FluidCalendar Beta",
  description: "Verify your email address for the FluidCalendar beta waitlist.",
};

export default function VerifyPage() {
  return <VerifyPageClient />;
}
