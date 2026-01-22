import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;

  const article = await prisma.article.findUnique({
    where: { slug, published: true },
    include: {
      cluster: {
        select: {
          metaDescription: true,
          keywords: true,
        },
      },
    },
  });

  if (!article) {
    return {
      title: "Article Not Found - FluidCalendar",
    };
  }

  const keywords = article.cluster?.keywords
    ? JSON.parse(article.cluster.keywords)
    : [];

  return {
    title: `${article.title} - FluidCalendar`,
    description: article.cluster?.metaDescription || article.excerpt,
    keywords: keywords.join(", "),
    openGraph: {
      title: article.title,
      description: article.cluster?.metaDescription || article.excerpt,
      type: "article",
      publishedTime: article.createdAt.toISOString(),
      modifiedTime: article.updatedAt.toISOString(),
      url: `/learn/${article.slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.cluster?.metaDescription || article.excerpt,
    },
    alternates: {
      canonical: `/learn/${article.slug}`,
    },
  };
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params;

  const article = await prisma.article.findUnique({
    where: { slug, published: true },
    include: {
      cluster: {
        select: {
          title: true,
          metaDescription: true,
          clusterType: true,
          keywords: true,
        },
      },
    },
  });

  if (!article) {
    notFound();
  }

  // Get related articles
  const relatedArticles = await prisma.article.findMany({
    where: {
      published: true,
      slug: { not: slug },
      cluster: {
        clusterType: article.cluster?.clusterType,
      },
    },
    select: {
      slug: true,
      title: true,
      excerpt: true,
    },
    take: 4,
    orderBy: { createdAt: "desc" },
  });

  // Generate JSON-LD structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.cluster?.metaDescription || article.excerpt,
    datePublished: article.createdAt.toISOString(),
    dateModified: article.updatedAt.toISOString(),
    author: {
      "@type": "Organization",
      name: "FluidCalendar",
      url: "https://fluidcalendar.com",
    },
    publisher: {
      "@type": "Organization",
      name: "FluidCalendar",
      url: "https://fluidcalendar.com",
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://fluidcalendar.com/learn/${article.slug}`,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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
                className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
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

        {/* Article */}
        <article className="container mx-auto px-4 py-8">
          <div className="mx-auto max-w-3xl">
            {/* Breadcrumb */}
            <nav className="mb-6 text-sm text-gray-500">
              <Link href="/" className="hover:text-gray-700">
                Home
              </Link>
              {" / "}
              <Link href="/learn" className="hover:text-gray-700">
                Learn
              </Link>
              {" / "}
              <span className="text-gray-700 dark:text-gray-300">
                {article.cluster?.clusterType.replace("_", " ")}
              </span>
            </nav>

            {/* Title */}
            <h1 className="mb-4 text-4xl font-bold text-gray-900 dark:text-white">
              {article.title}
            </h1>

            {/* Meta */}
            <div className="mb-8 flex items-center gap-4 text-sm text-gray-500">
              <time dateTime={article.createdAt.toISOString()}>
                {article.createdAt.toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
              <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                {article.cluster?.clusterType.replace("_", " ")}
              </span>
            </div>

            {/* Content */}
            <div
              className="prose prose-lg max-w-none dark:prose-invert prose-headings:text-gray-900 prose-a:text-blue-600 prose-strong:text-gray-900 dark:prose-headings:text-white dark:prose-strong:text-white"
              dangerouslySetInnerHTML={{ __html: article.content }}
            />

            {/* CTA */}
            <div className="mt-12 rounded-xl bg-blue-50 p-8 dark:bg-blue-900/20">
              <h2 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">
                Ready to take control of your schedule?
              </h2>
              <p className="mb-6 text-gray-600 dark:text-gray-300">
                FluidCalendar uses intelligent scheduling to find the optimal
                times for your tasks. Try it free today.
              </p>
              <Link
                href="/auth/signin"
                className="inline-block rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
              >
                Get Started for Free
              </Link>
            </div>
          </div>
        </article>

        {/* Related Articles */}
        {relatedArticles.length > 0 && (
          <section className="border-t bg-white py-12 dark:bg-gray-800">
            <div className="container mx-auto px-4">
              <h2 className="mb-8 text-2xl font-bold text-gray-900 dark:text-white">
                Related Articles
              </h2>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {relatedArticles.map((related) => (
                  <Link
                    key={related.slug}
                    href={`/learn/${related.slug}`}
                    className="group rounded-lg border p-6 transition-shadow hover:shadow-lg dark:border-gray-700"
                  >
                    <h3 className="mb-2 font-semibold text-gray-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
                      {related.title}
                    </h3>
                    <p className="text-sm text-gray-500 line-clamp-2">
                      {related.excerpt}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="border-t bg-gray-100 py-8 dark:bg-gray-900">
          <div className="container mx-auto px-4 text-center text-gray-600 dark:text-gray-400">
            <p>&copy; {new Date().getFullYear()} FluidCalendar. All rights reserved.</p>
          </div>
        </footer>
      </main>
    </>
  );
}

// Generate pages on-demand (SSR) since we can't access DB during Docker build
// and articles change frequently anyway
export const dynamicParams = true;

export async function generateStaticParams() {
  // Return empty array - pages will be generated on first request
  // This avoids requiring database access during build time
  return [];
}
