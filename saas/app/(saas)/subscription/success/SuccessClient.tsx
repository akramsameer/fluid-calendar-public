"use client";

import { useEffect } from "react";

import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";

import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderHeading,
} from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import { trackUserSignup } from "@/lib/x-tracking";

interface PaymentResult {
  metadata?: {
    name?: string;
    email?: string;
    subscriptionPlan?: string;
  };
  isLifetime?: boolean;
  isSubscription?: boolean;
  amount?: number;
  subscriptionId?: string;
  subscription?: object;
}

interface SuccessClientProps {
  paymentResult: PaymentResult;
  isLoggedIn?: boolean;
  redirectUrl?: string;
}

export default function SuccessClient({
  paymentResult,
  isLoggedIn = false,
  redirectUrl,
}: SuccessClientProps) {
  const isLifetime = paymentResult.isLifetime;

  // Track signup conversion when component mounts
  useEffect(() => {
    const email = paymentResult.metadata?.email;
    if (email) {
      trackUserSignup(email, "subscription");
    }
  }, [paymentResult.metadata?.email]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center space-y-8"
    >
      <div className="flex flex-col items-center space-y-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        >
          <CheckCircle className="h-20 w-20 text-green-500" />
        </motion.div>
        <PageHeader className="text-center">
          <PageHeaderHeading>
            {isLifetime
              ? "Welcome to the Lifetime Club!"
              : "Your Subscription is Active!"}
          </PageHeaderHeading>
          <PageHeaderDescription>
            {isLifetime
              ? "Thank you for your purchase. You now have lifetime access to all premium features."
              : "Thank you for your purchase. Your subscription is now active."}
          </PageHeaderDescription>
        </PageHeader>
      </div>

      <Card className="max-w-2xl w-full p-6">
        <div className="space-y-6">
          <div className="space-y-2 text-center">
            <h2 className="text-xl font-semibold">Next Steps</h2>
            <p className="text-muted-foreground">
              {redirectUrl
                ? "Your subscription is active! You can now continue to the feature you were trying to access."
                : "Your subscription is active! You can now start using FluidCalendar."}
            </p>
          </div>

          <div className="grid gap-4">
            <Button
              size="lg"
              className="w-full"
              onClick={() => {
                if (isLoggedIn) {
                  // If there's a redirect URL, go there; otherwise go to calendar
                  const destination = redirectUrl || "/calendar";
                  window.location.href = destination;
                } else {
                  // If not logged in, go to sign in with return URL
                  const returnUrl = redirectUrl || "/calendar";
                  window.location.href = `/auth/signin?callbackUrl=${encodeURIComponent(returnUrl)}`;
                }
              }}
            >
              {isLoggedIn
                ? redirectUrl
                  ? "Continue to App"
                  : "Go to Calendar"
                : "Go to Login"}
            </Button>

            {/* Debug section removed */}

            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Need help getting started?
              </p>
              <div className="flex justify-center gap-4">
                <Button variant="link" size="sm">
                  Documentation
                </Button>
                <Button variant="link" size="sm">
                  Contact Support
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="text-center text-sm text-muted-foreground">
        <p>
          We&apos;ve sent a confirmation email to your inbox with important
          information about your{" "}
          {isLifetime ? "lifetime access" : "subscription"}.
        </p>
      </div>
    </motion.div>
  );
}
