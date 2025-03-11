"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

export default function VerifiedPageClient() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-center">Email Verified!</CardTitle>
          <CardDescription className="text-center">
            You&apos;ve successfully joined the Fluid Calendar waitlist
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
