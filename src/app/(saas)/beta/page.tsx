import { Suspense } from "react";

import { Metadata } from "next";

import { Check } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import { BetaFeatures } from "./beta-features";
import { BetaHero } from "./beta-hero";
import { LifetimeOffer } from "./lifetime-offer";
import WaitlistForm from "./waitlist-form";

export const metadata: Metadata = {
  title: "Join the FluidCalendar Beta",
  description:
    "Sign up for early access to FluidCalendar, the modern calendar and task management app.",
};

export default function BetaPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background/50 to-background">
      <div className="container mx-auto max-w-7xl px-4 py-12">
        {/* Hero Section with Exclusive Lifetime Offer side by side */}
        <div className="relative mb-16">
          <div className="absolute -right-28 -top-28 -z-10 aspect-video h-72 w-96 opacity-40 [background-size:12px_12px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_20%,transparent_100%)] sm:bg-[radial-gradient(hsl(var(--muted-foreground))_1px,transparent_1px)]"></div>
          <div className="absolute -left-28 -top-28 -z-10 aspect-video h-72 w-96 opacity-40 [background-size:12px_12px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_20%,transparent_100%)] sm:bg-[radial-gradient(hsl(var(--muted-foreground))_1px,transparent_1px)]"></div>
          <div className="grid gap-8 md:grid-cols-2 items-center">
            <div className="order-1">
              <BetaHero />
            </div>
            <div className="order-2 flex flex-col items-center justify-center">
              <Card className="w-full max-w-md mx-auto shadow-xl border border-yellow-200 dark:border-yellow-700">
                <div className="p-8 flex flex-col items-center justify-center">
                  <h2 className="text-2xl font-bold text-yellow-700 dark:text-yellow-300 mb-4 text-center">
                    Exclusive Lifetime Offer
                  </h2>
                  <Suspense
                    fallback={
                      <div className="animate-pulse rounded-lg border border-border p-6 space-y-4 w-full">
                        <div className="h-10 rounded-md bg-muted"></div>
                        <div className="h-10 rounded-md bg-muted"></div>
                        <div className="h-10 rounded-md bg-muted"></div>
                      </div>
                    }
                  >
                    <LifetimeOffer />
                  </Suspense>
                </div>
              </Card>
            </div>
          </div>
        </div>
        <Separator className="my-12" />
        {/* Waitlist and Lifetime Offer Section */}
        <div className="grid gap-12 md:grid-cols-2 items-start">
          <div className="space-y-8 flex flex-col justify-start min-h-[420px]">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground mb-4">
                Join the Waitlist
              </h2>
              <p className="text-muted-foreground">
                Sign up to get early access to FluidCalendar. We&apos;re
                inviting users in batches to ensure the best experience. The
                sooner you join, the sooner you&apos;ll get access!
              </p>
            </div>
            <div className="relative">
              <Suspense
                fallback={
                  <div className="animate-pulse rounded-lg border border-border p-6 space-y-4">
                    <div className="h-10 rounded-md bg-muted"></div>
                    <div className="h-10 rounded-md bg-muted"></div>
                    <div className="h-10 rounded-md bg-muted"></div>
                  </div>
                }
              >
                <WaitlistForm />
              </Suspense>
            </div>
            <div className="relative">
              <Suspense
                fallback={
                  <div className="animate-pulse rounded-lg border border-border p-6 space-y-4">
                    <div className="h-10 rounded-md bg-muted"></div>
                    <div className="h-10 rounded-md bg-muted"></div>
                    <div className="h-10 rounded-md bg-muted"></div>
                  </div>
                }
              >
                {/* LifetimeOffer removed from here */}
              </Suspense>
            </div>
          </div>
          <div className="relative flex flex-col items-center justify-center min-h-[420px] space-y-8">
            {/* Why Join the Beta at the top */}
            <Card className="w-full bg-background/60 backdrop-blur-sm border border-border/50">
              <div className="p-6">
                <Badge variant="outline" className="mb-4">
                  Early Access
                </Badge>
                <h2 className="text-2xl font-bold tracking-tight text-foreground mb-6">
                  Why Join the Beta?
                </h2>
                <ul className="space-y-4 text-muted-foreground">
                  <li className="flex items-start">
                    <div className="mr-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary/10">
                      <Check className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span>Early access to all premium features</span>
                  </li>
                  <li className="flex items-start">
                    <div className="mr-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary/10">
                      <Check className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span>Direct influence on product development</span>
                  </li>
                  <li className="flex items-start">
                    <div className="mr-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary/10">
                      <Check className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span>Priority support from our team</span>
                  </li>
                  <li className="flex items-start">
                    <div className="mr-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary/10">
                      <Check className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span>Special perks for beta users after launch</span>
                  </li>
                </ul>
                <div className="mt-6 rounded-lg border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-900/50 dark:bg-blue-950/50">
                  <h3 className="font-medium text-blue-800 dark:text-blue-300">
                    Refer friends, move up the list!
                  </h3>
                  <p className="mt-2 text-sm text-blue-700 dark:text-blue-400">
                    After signing up, you&apos;ll get a unique referral link.
                    Each person who joins using your link helps you move up in
                    the queue!
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
        <BetaFeatures />
      </div>
    </div>
  );
}
