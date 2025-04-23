import { Suspense } from "react";

import { Metadata } from "next";

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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
      <div className="container mx-auto max-w-7xl px-4 py-12">
        <BetaHero />

        <div className="mt-16 grid gap-12 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
              Join the Waitlist
            </h2>
            <p className="mt-4 text-gray-600 dark:text-gray-400">
              Sign up to get early access to FluidCalendar. We&apos;re inviting
              users in batches to ensure the best experience. The sooner you
              join, the sooner you&apos;ll get access!
            </p>
            <div className="mt-8">
              <Suspense
                fallback={
                  <div className="animate-pulse rounded border p-4">
                    <div className="mb-4 h-10 rounded bg-gray-200"></div>
                    <div className="mb-4 h-10 rounded bg-gray-200"></div>
                    <div className="h-10 rounded bg-gray-200"></div>
                  </div>
                }
              >
                <WaitlistForm />
              </Suspense>
            </div>

            <div className="mt-8">
              <Suspense
                fallback={
                  <div className="animate-pulse rounded border p-4">
                    <div className="mb-4 h-10 rounded bg-gray-200"></div>
                    <div className="mb-4 h-10 rounded bg-gray-200"></div>
                    <div className="h-10 rounded bg-gray-200"></div>
                  </div>
                }
              >
                <LifetimeOffer />
              </Suspense>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
              Why Join the Beta?
            </h2>
            <ul className="mt-4 space-y-4 text-gray-600 dark:text-gray-400">
              <li className="flex items-start">
                <svg
                  className="mr-2 h-5 w-5 text-blue-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span>Early access to all premium features</span>
              </li>
              <li className="flex items-start">
                <svg
                  className="mr-2 h-5 w-5 text-blue-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span>Direct influence on product development</span>
              </li>
              <li className="flex items-start">
                <svg
                  className="mr-2 h-5 w-5 text-blue-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span>Priority support from our team</span>
              </li>
              <li className="flex items-start">
                <svg
                  className="mr-2 h-5 w-5 text-blue-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span>Special perks for beta users after launch</span>
              </li>
            </ul>

            <div className="mt-8 rounded-lg border border-blue-100 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
              <h3 className="font-medium text-blue-800 dark:text-blue-300">
                Refer friends, move up the list!
              </h3>
              <p className="mt-2 text-sm text-blue-700 dark:text-blue-400">
                After signing up, you&apos;ll get a unique referral link. Each
                person who joins using your link helps you move up in the queue!
              </p>
            </div>
          </div>
        </div>

        <BetaFeatures />
      </div>
    </div>
  );
}
