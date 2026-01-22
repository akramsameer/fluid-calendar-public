import { Metadata } from "next";
import Link from "next/link";

import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Learn - FluidCalendar",
  description:
    "Learn about calendar management, time blocking, productivity tips, and how to make the most of FluidCalendar.",
  openGraph: {
    title: "Learn - FluidCalendar",
    description:
      "Learn about calendar management, time blocking, productivity tips, and how to make the most of FluidCalendar.",
    type: "website",
  },
};

export default async function LearnPage() {
  // Get published articles grouped by cluster type
  const articles = await prisma.article.findMany({
    where: { published: true },
    select: {
      slug: true,
      title: true,
      excerpt: true,
      createdAt: true,
      cluster: {
        select: {
          clusterType: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // Group articles by cluster type
  const articlesByType = articles.reduce(
    (acc, article) => {
      const type = article.cluster?.clusterType || "other";
      if (!acc[type]) acc[type] = [];
      acc[type].push(article);
      return acc;
    },
    {} as Record<string, typeof articles>
  );

  const clusterTypeLabels: Record<string, string> = {
    use_case: "Use Cases",
    productivity_tip: "Productivity Tips",
    feature_guide: "Feature Guides",
    comparison: "Comparisons",
    integration: "Integrations",
    industry: "Industry Guides",
    role: "Role-Based Guides",
    problem_solution: "Problem Solutions",
    best_practice: "Best Practices",
    seasonal: "Seasonal Content",
    template: "Templates",
    long_tail: "More Articles",
  };

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="border-b bg-white dark:bg-gray-800">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link
            href="/"
            className="text-xl font-bold text-blue-600 dark:text-blue-400"
          >
            FluidCalendar
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              href="/learn"
              className="font-semibold text-gray-900 dark:text-white"
            >
              Articles
            </Link>
            <Link
              href="/auth/signin"
              className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-b from-blue-50 to-white py-16 dark:from-gray-800 dark:to-gray-900">
        <div className="container mx-auto px-4 text-center">
          <h1 className="mb-4 text-4xl font-bold text-gray-900 dark:text-white md:text-5xl">
            Learn About Smart Calendar Management
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-gray-600 dark:text-gray-300">
            Discover tips, guides, and best practices for managing your time
            effectively with FluidCalendar.
          </p>
        </div>
      </section>

      {/* Articles by Category */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          {Object.entries(articlesByType).map(([type, typeArticles]) => (
            <div key={type} className="mb-12">
              <h2 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">
                {clusterTypeLabels[type] || type.replace("_", " ")}
              </h2>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {typeArticles.slice(0, 6).map((article) => (
                  <Link
                    key={article.slug}
                    href={`/learn/${article.slug}`}
                    className="group rounded-xl border bg-white p-6 shadow-sm transition-all hover:shadow-lg dark:border-gray-700 dark:bg-gray-800"
                  >
                    <h3 className="mb-2 text-lg font-semibold text-gray-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
                      {article.title}
                    </h3>
                    <p className="mb-4 text-sm text-gray-500 line-clamp-2 dark:text-gray-400">
                      {article.excerpt}
                    </p>
                    <time
                      className="text-xs text-gray-400"
                      dateTime={article.createdAt.toISOString()}
                    >
                      {article.createdAt.toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </time>
                  </Link>
                ))}
              </div>
            </div>
          ))}

          {articles.length === 0 && (
            <div className="py-20 text-center">
              <h2 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">
                No articles yet
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Check back soon for helpful guides and tips.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blue-600 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="mb-4 text-3xl font-bold text-white">
            Ready to take control of your schedule?
          </h2>
          <p className="mb-8 text-lg text-blue-100">
            FluidCalendar uses intelligent scheduling to help you manage your
            time effectively.
          </p>
          <Link
            href="/auth/signin"
            className="inline-block rounded-lg bg-white px-8 py-4 font-semibold text-blue-600 hover:bg-gray-100"
          >
            Get Started for Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-gray-100 py-8 dark:bg-gray-900">
        <div className="container mx-auto px-4 text-center text-gray-600 dark:text-gray-400">
          <p>&copy; {new Date().getFullYear()} FluidCalendar. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
