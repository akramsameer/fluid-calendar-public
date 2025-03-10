import {
  CalendarDays,
  Clock,
  Zap,
  Calendar,
  BarChart3,
} from "lucide-react";

export function BetaFeatures() {
  const features = [
    {
      name: "Calendar Integration",
      description:
        "Seamlessly sync with Google Calendar, Outlook, and CalDAV calendars.",
      icon: CalendarDays,
    },
    {
      name: "Smart Task Management",
      description:
        "Organize tasks with projects, tags, and automatic scheduling.",
      icon: Clock,
    },
    {
      name: "Focus Mode",
      description: "Eliminate distractions and focus on what matters most.",
      icon: Zap,
    },
    {
      name: "Multiple Views",
      description: "Day, week, month, and custom views to fit your workflow.",
      icon: Calendar,
    },
    {
      name: "Advanced Analytics",
      description: "Gain insights into how you spend your time (SAAS only).",
      icon: BarChart3,
    },
  ];

  return (
    <div className="py-16">
      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            Features You&apos;ll Get Access To
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-xl text-gray-500 dark:text-gray-400 sm:mt-4">
            Fluid Calendar combines the best of calendar and task management in
            one seamless experience.
          </p>
        </div>

        <div className="mt-12">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.name} className="pt-6">
                <div className="flow-root rounded-lg bg-gray-50 dark:bg-gray-800 px-6 pb-8">
                  <div className="-mt-6">
                    <div>
                      <span className="inline-flex items-center justify-center rounded-md bg-blue-500 p-3 shadow-lg">
                        <feature.icon
                          className="h-6 w-6 text-white"
                          aria-hidden="true"
                        />
                      </span>
                    </div>
                    <h3 className="mt-8 text-lg font-medium tracking-tight text-gray-900 dark:text-white">
                      {feature.name}
                    </h3>
                    <p className="mt-5 text-base text-gray-500 dark:text-gray-400">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
