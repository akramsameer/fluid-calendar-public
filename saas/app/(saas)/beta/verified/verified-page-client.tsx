"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { CheckCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function VerifiedPageClient() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-4 flex justify-center">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-center">Email Verified!</CardTitle>
          <CardDescription className="text-center">
            You&apos;ve successfully joined the FluidCalendar waitlist
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center">
            Thank you for verifying your email address. We&apos;ve added you to
            our waitlist and will notify you when your spot is available.
          </p>
          {email && (
            <p className="text-center text-sm text-muted-foreground">
              A confirmation email has been sent to {email} with your waitlist
              details.
            </p>
          )}
          <div className="flex justify-center">
            <Link href="/beta/status">
              <Button>Check Your Waitlist Status</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
