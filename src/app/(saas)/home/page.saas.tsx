import {
  CalendarDaysIcon,
  ClockIcon,
  SparklesIcon,
  BoltIcon,
  CloudIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";
import { Toaster } from "sonner";
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
    title: "Open Source & Self-Hostable",
    description:
      "Take control of your data with our fully open-source solution that you can host on your own servers.",
  },
  {
    icon: LockClosedIcon,
    title: "Privacy-First Design",
    description:
      "Your schedule stays private and secure, with full control over your data and hosting options.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Toaster position="top-right" />

      {/* Hero Section */}
      <section className="pt-20 pb-16 px-4 text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          Welcome to{" "}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
            FluidCalendar
          </span>
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
          The open-source intelligent calendar that adapts to your workflow.
          Experience seamless task scheduling powered by AI, designed to make
          your time management effortless.
        </p>
        <div className="mb-12 space-y-2 text-gray-500">
          <div>Your open-source alternative to Motion</div>
          <div>
            <a
              href="https://github.com/dotnetfactory/fluid-calendar"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-blue-600 hover:text-blue-700"
            >
              <svg
                className="w-5 h-5 mr-2"
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
              View on GitHub
            </a>
          </div>
        </div>

        <div className="flex justify-center">
          <a
            href="/beta"
            className="inline-block bg-blue-600 text-white py-3 px-8 rounded-lg font-semibold hover:bg-blue-700 transition-colors duration-200"
          >
            Join the Beta
          </a>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">
            Why Choose FluidCalendar?
          </h2>
          <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
            Experience a calendar that thinks ahead, adapts to your needs, and
            helps you make the most of your time.
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="p-6 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors duration-200"
              >
                <feature.icon className="h-12 w-12 text-blue-600 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-16 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">
            Be Among the First to Experience FluidCalendar
          </h2>
          <p className="mb-8 text-lg opacity-90">
            Join our beta waitlist today and be part of the future of
            intelligent calendar management.
          </p>
          <a
            href="/beta"
            className="inline-block bg-white text-blue-600 py-3 px-8 rounded-lg font-semibold hover:bg-gray-100 transition-colors duration-200"
          >
            Join the Beta
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 text-center text-gray-600 border-t">
        <p>
          Built by{" "}
          <a
            href="https://www.elitecoders.co"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-700"
          >
            EliteCoders
          </a>
        </p>
        <div className="flex justify-center mt-4 space-x-6">
          <a
            href="/terms"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Terms of Service
          </a>
          <a
            href="/privacy"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Privacy Policy
          </a>
        </div>
      </footer>
    </main>
  );
}
