"use client";

import { Suspense } from "react";

import Image from "next/image";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

import {
  BoltIcon,
  CalendarDaysIcon,
  ClockIcon,
  CloudIcon,
  LockClosedIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { Toaster } from "sonner";

import { PublicNav } from "@/components/navigation/PublicNav";
import PublicPricingCards from "@/components/pricing/PublicPricingCards";

const features = [
  {
    icon: SparklesIcon,
    title: "AI-Powered Scheduling",
    description:
      "FluidCalendar's intelligent AI adapts to your work style, automatically scheduling tasks for optimal productivity.",
  },
  {
    icon: CalendarDaysIcon,
    title: "Seamless Integration",
    description:
      "Sync with Google Calendar, Outlook, and other popular calendar services without missing a beat.",
  },
  {
    icon: ClockIcon,
    title: "Smart Time Management",
    description:
      "Let FluidCalendar optimize your schedule, finding the perfect time slots for your tasks and meetings.",
  },
  {
    icon: BoltIcon,
    title: "Instant Task Scheduling",
    description:
      "Add tasks naturally, and watch as FluidCalendar instantly finds the best time in your schedule.",
  },
  {
    icon: CloudIcon,
    title: "Hosted & Managed",
    description:
      "No setup required - we handle all the infrastructure, updates, and maintenance for you.",
  },
  {
    icon: LockClosedIcon,
    title: "Privacy-First Design",
    description:
      "Your schedule stays private and secure, with enterprise-grade security and regular backups.",
  },
];

export default function Home() {
  const { data: session } = useSession();
  const router = useRouter();

  const handleStartTrial = () => {
    if (session) {
      router.push("/calendar");
    } else {
      router.push("/auth/signin");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <PublicNav />
      <main>
        <Toaster position="top-right" />

        {/* Hero Section */}
        <section className="relative px-4 pb-16 pt-20 text-center overflow-hidden">
          {/* Decorative background elements */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-0 left-0 w-72 h-72 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-indigo-400/20 to-pink-400/20 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 left-1/2 w-80 h-80 bg-gradient-to-t from-purple-400/20 to-blue-400/20 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2"></div>
          </div>

          <div className="mb-6">
            <span className="inline-block rounded-full bg-gradient-to-r from-blue-500 to-purple-500 px-4 py-2 text-sm font-medium text-white shadow-lg">
              🎉 Now Available - Start Your 14-Day Free Trial
            </span>
          </div>
          <h1 className="mb-6 text-5xl font-bold text-gray-900">
            Welcome to{" "}
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              FluidCalendar
            </span>
          </h1>
          <p className="mx-auto mb-8 max-w-3xl text-xl text-gray-600">
            The intelligent calendar that adapts to your workflow. Experience
            seamless task scheduling powered by AI, designed to make your time
            management effortless. Try all features free for 14 days.
          </p>

          {/* Product Hunt Badge */}
          <div className="mb-8 flex justify-center">
            <a 
              href="https://www.producthunt.com/products/fluidcalendar?embed=true&utm_source=badge-featured&utm_medium=badge&utm_source=badge-fluidcalendar-2" 
              target="_blank"
              rel="noopener noreferrer"
              className="transition-transform duration-200 hover:scale-105"
            >
              <Image 
                src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=995295&theme=light&t=1753020464257" 
                alt="FluidCalendar - Smarter task scheduling for your day | Product Hunt" 
                className="w-[250px] h-[54px]" 
                width={250} 
                height={54}
                unoptimized
              />
            </a>
          </div>

          <div className="mb-12 space-y-3 text-gray-500">
            <div className="text-lg">
              <strong>Free 14-day trial</strong> • No credit card required •
              Cancel anytime
            </div>
            <div className="flex flex-col items-center space-y-2 sm:flex-row sm:justify-center sm:space-x-4 sm:space-y-0">
              <span>Your intelligent alternative to Motion</span>
              <span className="hidden sm:inline">•</span>
              <a
                href="https://github.com/dotnetfactory/fluid-calendar"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-medium"
              >
                <svg
                  className="mr-2 h-5 w-5 text-blue-600"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                    clipRule="evenodd"
                  />
                </svg>
                Open Source Version Available
              </a>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button
              onClick={handleStartTrial}
              className="inline-block rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-3 font-semibold text-white shadow-lg transition-all duration-200 hover:from-blue-700 hover:to-purple-700 hover:shadow-xl hover:scale-105"
            >
              {session ? "Go to App" : "Start Your Free Trial"}
            </button>
            <a
              href="#pricing"
              className="inline-block rounded-lg border border-blue-600 bg-white/80 backdrop-blur-sm px-8 py-3 font-semibold text-blue-600 shadow-md transition-all duration-200 hover:bg-blue-50 hover:shadow-lg hover:scale-105"
            >
              View Pricing
            </a>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="bg-white px-4 py-16">
          <div className="mx-auto max-w-6xl">
            <h2 className="mb-4 text-center text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Why Choose FluidCalendar?
            </h2>
            <p className="mx-auto mb-12 max-w-2xl text-center text-gray-600">
              Experience a calendar that thinks ahead, adapts to your needs, and
              helps you make the most of your time. Try all features free for 14
              days.
            </p>

            <div className="grid gap-8 md:grid-cols-3">
              {features.map((feature, index) => {
                const colors = [
                  "from-blue-500 to-purple-500",
                  "from-purple-500 to-pink-500",
                  "from-pink-500 to-red-500",
                  "from-red-500 to-orange-500",
                  "from-orange-500 to-yellow-500",
                  "from-green-500 to-teal-500",
                ];
                const bgColors = [
                  "bg-gradient-to-br from-blue-50 to-purple-50",
                  "bg-gradient-to-br from-purple-50 to-pink-50",
                  "bg-gradient-to-br from-pink-50 to-red-50",
                  "bg-gradient-to-br from-red-50 to-orange-50",
                  "bg-gradient-to-br from-orange-50 to-yellow-50",
                  "bg-gradient-to-br from-green-50 to-teal-50",
                ];
                return (
                  <div
                    key={feature.title}
                    className={`rounded-xl ${bgColors[index]} p-6 transition-all duration-300 hover:shadow-lg hover:scale-105 border border-white/50`}
                  >
                    <div
                      className={`inline-flex p-3 rounded-lg bg-gradient-to-r ${colors[index]} shadow-lg mb-4`}
                    >
                      <feature.icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="mb-2 text-xl font-semibold text-gray-900">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600">{feature.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section
          id="pricing"
          className="bg-gradient-to-br from-gray-50 to-blue-50 px-4 py-16"
        >
          <div className="mx-auto max-w-7xl">
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Choose Your Plan
              </h2>
              <p className="mx-auto max-w-2xl text-xl text-gray-600">
                Start your 14-day free trial today. No credit card required.
                Upgrade, downgrade, or cancel anytime.
              </p>
            </div>

            <Suspense
              fallback={
                <div className="flex justify-center items-center py-12">
                  <div className="text-lg text-gray-600">
                    Loading pricing...
                  </div>
                </div>
              }
            >
              <PublicPricingCards />
            </Suspense>
          </div>
        </section>

        {/* Call to Action Section */}
        <section className="relative bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 px-4 py-16 text-white overflow-hidden">
          {/* Decorative background elements */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl transform translate-x-1/2 translate-y-1/2"></div>
          </div>

          <div className="mx-auto max-w-4xl text-center relative">
            <h2 className="mb-4 text-3xl font-bold">
              Ready to Transform Your Calendar?
            </h2>
            <p className="mb-8 text-lg opacity-90">
              Join thousands using FluidCalendar to take control of their time.
              Start your 14-day free trial today - no credit card required.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <button
                onClick={handleStartTrial}
                className="inline-block rounded-lg bg-white px-8 py-3 font-semibold text-purple-600 shadow-lg transition-all duration-200 hover:bg-gray-100 hover:scale-105"
              >
                {session ? "Go to App" : "Start Your Free Trial"}
              </button>
              <div className="text-sm opacity-75">
                No credit card required • Cancel anytime
              </div>
            </div>
          </div>
        </section>

        {/* Open Source Section */}
        <section className="bg-gradient-to-br from-gray-50 to-slate-100 px-4 py-16">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="mb-4 text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Prefer Self-Hosting?
            </h2>
            <p className="mb-8 text-lg text-gray-600">
              FluidCalendar is open source! Host it yourself for free with full
              control over your data. Perfect for teams, enterprises, or anyone
              who prefers complete ownership.
            </p>
            <a
              href="https://github.com/dotnetfactory/fluid-calendar"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-8 py-3 font-semibold text-gray-700 shadow-md transition-all duration-200 hover:bg-gray-50 hover:shadow-lg hover:scale-105"
            >
              <svg
                className="mr-2 h-5 w-5"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  clipRule="evenodd"
                />
              </svg>
              Get the Open Source Version
            </a>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-gray-200 bg-gradient-to-r from-gray-50 to-slate-50 px-4 py-8 text-center text-gray-600">
          <p>
            Built by{" "}
            <a
              href="https://www.elitecoders.co"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-purple-600 transition-colors"
            >
              EliteCoders
            </a>
          </p>
          <div className="mt-4 flex justify-center space-x-6">
            <a
              href="/terms"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Terms of Service
            </a>
            <a
              href="/privacy"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Privacy Policy
            </a>
          </div>
        </footer>
      </main>
    </div>
  );
}
