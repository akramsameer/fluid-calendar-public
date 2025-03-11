import { Metadata } from "next";
import VerifyPageClient from "./verify-page-client";

export const metadata: Metadata = {
  title: "Verify Email | Fluid Calendar Beta",
  description:
    "Verify your email address for the Fluid Calendar beta waitlist.",
};

export default function VerifyPage() {
  return <VerifyPageClient />;
}
