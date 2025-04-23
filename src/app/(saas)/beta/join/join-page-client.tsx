"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import RegistrationForm from "./registration-form";

interface WaitlistEntry {
  id: string;
  email: string;
  name: string | null;
}

export default function JoinPageClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [waitlistEntry, setWaitlistEntry] = useState<WaitlistEntry | null>(
    null
  );
  const [publicSignupEnabled, setPublicSignupEnabled] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [isAlreadyRegistered, setIsAlreadyRegistered] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  useEffect(() => {
    // If no token is provided, check if public signup is enabled
    if (!token) {
      checkPublicSignup();
      return;
    }

    // Validate the token
    validateToken(token);
  }, [token]);

  const checkPublicSignup = async () => {
    try {
      const response = await fetch("/api/waitlist/join");
      const data = await response.json();

      setPublicSignupEnabled(data.publicSignupEnabled);

      if (!data.publicSignupEnabled) {
        setValidationError(
          "Registration requires an invitation. Please check your email for an invitation link or join the waitlist."
        );
      }
    } catch (error) {
      console.error("Error checking public signup:", error);
      setValidationError(
        "Failed to check registration status. Please try again later."
      );
    }
  };

  const validateToken = async (token: string) => {
    setIsValidating(true);
    setValidationError(null);

    try {
      const response = await fetch("/api/waitlist/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        setValidationError(data.message || "Invalid invitation link");
        setPublicSignupEnabled(data.publicSignupEnabled || false);

        if (data.expired) {
          setIsExpired(true);
          setUserEmail(data.email);
        }

        if (data.alreadyRegistered) {
          setIsAlreadyRegistered(true);
          setUserEmail(data.email);
        }

        return;
      }

      setWaitlistEntry(data.waitlistEntry);
      setPublicSignupEnabled(data.publicSignupEnabled);
    } catch (error) {
      console.error("Error validating token:", error);
      setValidationError(
        "Failed to validate invitation. Please try again later."
      );
    } finally {
      setIsValidating(false);
    }
  };

  const handleRegistrationSuccess = () => {
    setRegistrationSuccess(true);
  };

  // Show loading state while validating
  if (isValidating) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Validating Invitation</CardTitle>
            <CardDescription className="text-center">
              Please wait while we validate your invitation...
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show success state after registration
  if (registrationSuccess) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">
              Registration Complete!
            </CardTitle>
            <CardDescription className="text-center">
              Welcome to FluidCalendar Beta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p>
              Your account has been created successfully. You can now sign in
              with your email and password.
            </p>
            <Button asChild className="w-full">
              <Link href="/auth/signin">Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error state if validation failed
  if (validationError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">
              {isExpired
                ? "Invitation Expired"
                : isAlreadyRegistered
                  ? "Already Registered"
                  : "Invalid Invitation"}
            </CardTitle>
            <CardDescription className="text-center">
              {validationError}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isExpired && (
              <p className="text-center">
                The invitation for <strong>{userEmail}</strong> has expired.
                Please request a new invitation.
              </p>
            )}

            {isAlreadyRegistered && (
              <p className="text-center">
                The account for <strong>{userEmail}</strong> has already been
                registered. Please log in instead.
              </p>
            )}

            <div className="flex flex-col space-y-2">
              {isAlreadyRegistered ? (
                <Button asChild className="w-full">
                  <Link href="/auth/signin">Sign In</Link>
                </Button>
              ) : (
                <>
                  {publicSignupEnabled ? (
                    <Button
                      onClick={() => {
                        setValidationError(null);
                        setWaitlistEntry(null);
                      }}
                      className="w-full"
                    >
                      Register Anyway
                    </Button>
                  ) : (
                    <Button asChild className="w-full">
                      <Link href="/beta">Join Waitlist</Link>
                    </Button>
                  )}
                </>
              )}

              <Button asChild variant="outline" className="w-full">
                <Link href="/">Back to Home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show registration form
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Join FluidCalendar Beta</CardTitle>
          <CardDescription className="text-center">
            {waitlistEntry
              ? "Complete your registration to join the beta program"
              : publicSignupEnabled
                ? "Create your account to join the beta program"
                : "Registration requires an invitation"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(waitlistEntry || publicSignupEnabled) && (
            <RegistrationForm
              email={waitlistEntry?.email}
              name={waitlistEntry?.name || ""}
              invitationToken={token || undefined}
              onSuccess={handleRegistrationSuccess}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
