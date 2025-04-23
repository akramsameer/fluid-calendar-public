"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { AlertCircle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function VerifyPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [isVerifying, setIsVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function verifyEmail() {
      if (!token) {
        setError("Verification token is missing");
        setIsVerifying(false);
        return;
      }

      try {
        // Call the API to verify the email
        const response = await fetch(`/api/waitlist/verify?token=${token}`);

        // If the API returns a redirect, follow it
        if (response.redirected) {
          router.push(response.url);
          return;
        }

        // If there's an error, show it
        if (!response.ok) {
          const data = await response.json();
          setError(data.message || "Failed to verify email");
          setIsVerifying(false);
          return;
        }

        // If we get here, something unexpected happened
        setError("Unexpected response from server");
        setIsVerifying(false);
      } catch (err) {
        console.error("Error verifying email:", err);
        setError("An error occurred while verifying your email");
        setIsVerifying(false);
      }
    }

    verifyEmail();
  }, [token, router]);

  if (isVerifying) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Verifying Your Email</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center p-6">
            <Loader2 className="mb-4 h-16 w-16 animate-spin text-blue-500" />
            <p className="text-center">
              Please wait while we verify your email address...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="mb-4 flex justify-center">
              <AlertCircle className="h-16 w-16 text-red-500" />
            </div>
            <CardTitle className="text-center">Verification Failed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-red-600">{error}</p>
            <p className="text-center">
              There was a problem verifying your email address. The verification
              link may have expired or is invalid.
            </p>
            <div className="flex justify-center">
              <Link href="/beta">
                <Button>Return to Signup</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
