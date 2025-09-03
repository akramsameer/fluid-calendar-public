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
  };
}

interface LifetimeSuccessClientProps {
  paymentResult: PaymentResult;
  isExistingUser?: boolean;
  isLoggedIn?: boolean;
}

export default function LifetimeSuccessClient({
  paymentResult,
  isExistingUser = false,
  isLoggedIn = false,
}: LifetimeSuccessClientProps) {
  console.log("Payment result:", paymentResult);

  // Track signup conversion when component mounts
  useEffect(() => {
    const email = paymentResult.metadata?.email;
    if (email) {
      trackUserSignup(email, "lifetime");
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
          <PageHeaderHeading>Welcome to the Lifetime Club!</PageHeaderHeading>
          <PageHeaderDescription>
            Thank you for your purchase. You now have lifetime access to all
            premium features.
          </PageHeaderDescription>
        </PageHeader>
      </div>

      <Card className="max-w-2xl w-full p-6">
        <div className="space-y-6">
          <div className="space-y-2 text-center">
            <h2 className="text-xl font-semibold">Next Steps</h2>
            <p className="text-muted-foreground">
              Let&apos;s get your account set up so you can start using
              FluidCalendar
            </p>
          </div>

          <div className="grid gap-4">
            {!isExistingUser && (
              <Button
                size="lg"
                className="w-full"
                onClick={() => {
                  const params = new URLSearchParams();
                  if (paymentResult?.metadata?.name)
                    params.append("name", paymentResult.metadata.name);
                  if (paymentResult?.metadata?.email)
                    params.append("email", paymentResult.metadata.email);
                  window.location.href = `/subscription/lifetime/setup-password${params.toString() ? `?${params.toString()}` : ""}`;
                }}
              >
                Set Up Your Account
              </Button>
            )}
            {isExistingUser && (
              <Button
                size="lg"
                className="w-full"
                onClick={() => {
                  window.location.href = isLoggedIn
                    ? "/calendar"
                    : "/auth/signin";
                }}
              >
                {isLoggedIn ? "Go to Calendar" : "Go to Login"}
              </Button>
            )}
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
          information about your lifetime subscription.
        </p>
      </div>
    </motion.div>
  );
}
