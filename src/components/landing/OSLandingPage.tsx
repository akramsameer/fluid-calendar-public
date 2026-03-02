"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Calendar,
  Clock,
  RefreshCw,
  Github,
  ArrowRight,
  Zap,
} from "lucide-react";

import { PublicNav } from "@/components/navigation/PublicNav";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Calendar,
    title: "Multi-Calendar Sync",
    description:
      "Connect Google Calendar, Outlook, and CalDAV. See all your events in one place.",
  },
  {
    icon: Zap,
    title: "Intelligent Auto-Scheduling",
    description:
      "Automatically find the best time slots for your tasks based on your calendar availability.",
  },
  {
    icon: Clock,
    title: "Smart Task Management",
    description:
      "Manage tasks with energy levels, deadlines, and priorities. Let the scheduler do the rest.",
  },
  {
    icon: RefreshCw,
    title: "Real-Time Sync",
    description:
      "Changes sync instantly across all your connected calendars with incremental updates.",
  },
];

export default function OSLandingPage() {
  const { data: session } = useSession();
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicNav />

      <main className="flex-1">
        {/* Hero */}
        <section className="flex flex-col items-center justify-center px-4 py-24 text-center">
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Your Calendar,{" "}
            <span className="text-primary">Intelligently Scheduled</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            FluidCalendar is an open-source intelligent calendar and task
            scheduler. Auto-schedule tasks, sync multiple calendars, and take
            control of your time.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Button
              size="lg"
              onClick={() =>
                router.push(session ? "/calendar" : "/auth/signin")
              }
            >
              {session ? "Go to App" : "Sign In"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a
                href="https://github.com/fluid-calendar/fluid-calendar"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="mr-2 h-4 w-4" />
                View on GitHub
              </a>
            </Button>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="px-4 py-16">
          <div className="mx-auto max-w-5xl">
            <h2 className="mb-12 text-center text-3xl font-bold">Features</h2>
            <div className="grid gap-8 sm:grid-cols-2">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-lg border border-border bg-card p-6"
                >
                  <feature.icon className="mb-3 h-8 w-8 text-primary" />
                  <h3 className="mb-2 text-lg font-semibold">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Self-Host CTA */}
        <section className="px-4 py-16 text-center">
          <div className="mx-auto max-w-2xl">
            <h2 className="text-2xl font-bold">Self-Host with Full Control</h2>
            <p className="mt-4 text-muted-foreground">
              FluidCalendar is fully open-source and self-hostable. Run it on
              your own infrastructure with complete data ownership.
            </p>
            <Button variant="outline" className="mt-6" asChild>
              <a
                href="https://github.com/fluid-calendar/fluid-calendar"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="mr-2 h-4 w-4" />
                Get Started on GitHub
              </a>
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-4 py-6 text-center text-sm text-muted-foreground">
        <p>
          FluidCalendar &mdash; Open-source intelligent calendar and task
          scheduling.
        </p>
      </footer>
    </div>
  );
}
