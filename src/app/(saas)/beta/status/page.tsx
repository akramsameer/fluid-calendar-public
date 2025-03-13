import { Metadata } from "next";
import { Suspense } from "react";
import StatusForm from "./status-form";

export const metadata: Metadata = {
  title: "Check Your Waitlist Status | FluidCalendar Beta",
  description:
    "Check your position in the FluidCalendar beta waitlist and see how to move up the queue.",
};

export default function StatusPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
      <div className="container px-4 py-12 mx-auto max-w-3xl">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            Check Your Waitlist Status
          </h1>
          <p className="mt-3 text-lg text-gray-600 dark:text-gray-400">
            Enter your email address to see your current position in the
            waitlist and track your referrals.
          </p>
        </div>

        <div className="mt-12">
          <Suspense
            fallback={
              <div className="text-center py-4">Loading status form...</div>
            }
          >
            <StatusForm />
          </Suspense>
        </div>

        <div className="mt-16 space-y-8">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              How to Improve Your Position
            </h2>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              The more friends you refer, the faster you&apos;ll get access to
              FluidCalendar. Each successful referral moves you up in the queue!
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              What Happens Next?
            </h2>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              When it&apos;s your turn, we&apos;ll send you an email with
              instructions to create your account. Make sure to check your inbox
              (and spam folder) regularly.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Need Help?
            </h2>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              If you have any questions or need assistance, please contact us at{" "}
              <a
                href="mailto:support@fluidcalendar.com"
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                support@fluidcalendar.com
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
