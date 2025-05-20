"use client";

import { useState } from "react";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useLifetimeSubscription } from "@/lib/hooks/useSubscription";

export function LifetimeOffer() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  const { mutate: createLifetimeCheckout, isPending } =
    useLifetimeSubscription();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    createLifetimeCheckout(
      { email, name: name || undefined },
      {
        onSuccess: (data) => {
          // Redirect to Stripe Checkout
          window.location.href = data.url;
        },
      }
    );
  };

  return (
    <div className="rounded-lg border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 dark:border-blue-800 dark:from-blue-900/30 dark:to-indigo-900/30">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xl font-bold text-blue-800 dark:text-blue-300">
          Exclusive Lifetime Offer
        </h3>
        <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-800 dark:bg-red-900/50 dark:text-red-300">
          Limited to 100 users
        </span>
      </div>

      <p className="mb-4 text-blue-700 dark:text-blue-400">
        Support our open source development and get{" "}
        <strong>immediate access</strong> to the beta with a lifetime
        subscription.
      </p>

      <div className="mb-4 rounded-md border border-blue-200 bg-white p-4 dark:border-blue-700 dark:bg-gray-800">
        <div className="flex items-center justify-between">
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
              <span className="ml-2 text-sm text-gray-500 line-through dark:text-gray-400">
                $400
              </span>
              <span className="ml-2 rounded-full bg-green-100 px-2 py-1 text-xs text-green-800 dark:bg-green-900 dark:text-green-300">
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
          disabled={isPending}
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            "Get Lifetime Access - $200"
          )}
        </Button>

        <p className="text-center text-xs text-gray-500 dark:text-gray-400">
          Secure payment powered by Stripe. Your information is protected.
        </p>
      </form>
    </div>
  );
}
