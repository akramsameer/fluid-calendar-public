import { Metadata } from "next";
import { Suspense } from "react";
import WaitlistForm from "./waitlist-form";
import { BetaHero } from "./beta-hero";
import { BetaFeatures } from "./beta-features";

export const metadata: Metadata = {
  title: "Join the FluidCalendar Beta",
  description:
    "Sign up for early access to FluidCalendar, the modern calendar and task management app.",
};

export default function BetaPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
      <div className="container px-4 py-12 mx-auto max-w-7xl">
        <BetaHero />

        <div className="grid gap-12 mt-16 md:grid-cols-2">
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
                  <div className="p-4 border rounded animate-pulse">
                    <div className="h-10 bg-gray-200 rounded mb-4"></div>
                    <div className="h-10 bg-gray-200 rounded mb-4"></div>
                    <div className="h-10 bg-gray-200 rounded"></div>
                  </div>
                }
              >
                <WaitlistForm />
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
                  className="w-5 h-5 mr-2 text-blue-500"
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
                  className="w-5 h-5 mr-2 text-blue-500"
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
                  className="w-5 h-5 mr-2 text-blue-500"
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
                  className="w-5 h-5 mr-2 text-blue-500"
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

            <div className="p-4 mt-8 border rounded-lg bg-blue-50 border-blue-100 dark:bg-blue-950 dark:border-blue-900">
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
