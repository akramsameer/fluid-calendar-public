"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, CheckCircle } from "lucide-react";

export function LifetimeOffer() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/waitlist/lifetime-interest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          name: name || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to record your interest");
      }

      setIsSuccess(true);
      toast.success("Thanks for your interest! We'll be in touch soon.");
    } catch (error) {
      console.error("Error submitting interest:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to record your interest"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 rounded-lg border border-green-100 dark:border-green-800">
        <div className="flex flex-col items-center text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
          <h3 className="text-xl font-bold text-green-800 dark:text-green-300">
            Thank You for Your Interest!
          </h3>
          <p className="mt-2 text-green-700 dark:text-green-400">
            We&apos;ve recorded your interest in the lifetime subscription. We&apos;ll
            contact you soon with more details about this exclusive offer.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-lg border border-blue-100 dark:border-blue-800">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-blue-800 dark:text-blue-300">
          Exclusive Lifetime Offer
        </h3>
        <span className="px-3 py-1 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 rounded-full">
          Limited to 50 users
        </span>
      </div>

      <p className="text-blue-700 dark:text-blue-400 mb-4">
        Support our open source development and get{" "}
        <strong>immediate access</strong> to the beta with a lifetime
        subscription.
      </p>

      <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-blue-200 dark:border-blue-700 mb-4">
        <div className="flex justify-between items-center">
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white">
              Lifetime Subscription
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              One-time payment, forever access
            </p>
            <div className="mt-1 flex items-center">
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                $200
              </span>
              <span className="ml-2 text-sm text-gray-500 dark:text-gray-400 line-through">
                $400
              </span>
              <span className="ml-2 text-xs px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 rounded-full">
                50% OFF
              </span>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="lifetime-email">Email address</Label>
          <Input
            id="lifetime-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <Label htmlFor="lifetime-name">Name (optional)</Label>
          <Input
            id="lifetime-name"
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <Button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            "I'm Interested - Tell Me More"
          )}
        </Button>

        <p className="text-xs text-center text-gray-500 dark:text-gray-400">
          By expressing interest, you&apos;ll be contacted with details about
          this exclusive offer. No payment is required at this stage.
        </p>
      </form>
    </div>
  );
}
