export function BetaHero() {
  return (
    <div className="relative overflow-hidden">
      <div className="pb-16 pt-8">
        <div className="relative">
          <div className="lg:grid lg:grid-cols-12 lg:gap-8">
            <div className="px-4 sm:px-6 sm:text-center md:mx-auto md:max-w-2xl lg:col-span-12 lg:flex lg:items-center lg:text-left">
              <div>
                <h1 className="mt-4 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl md:text-6xl dark:text-white">
                  <span className="block">FluidCalendar</span>
                  <span className="block text-blue-600 dark:text-blue-400">
                    Beta Program
                  </span>
                </h1>
                <p className="mt-3 text-base text-gray-500 sm:mt-5 sm:text-xl lg:text-lg xl:text-xl dark:text-gray-300">
                  Get early access to the most intuitive calendar and task
                  management app. Seamlessly integrate with Google Calendar,
                  Outlook, and CalDAV.
                </p>
                <div className="mt-8 sm:mt-12">
                  <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20 dark:bg-blue-900/30 dark:text-blue-300 dark:ring-blue-500/20">
                    Limited Spots Available
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
