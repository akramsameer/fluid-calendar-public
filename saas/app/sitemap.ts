import { MetadataRoute } from "next";

import { prisma } from "@/lib/prisma";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://fluidcalendar.com";

export const dynamic = "force-dynamic";
export const revalidate = 3600; // Revalidate every hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${BASE_URL}/learn`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/auth/signin`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  // Fetch all published articles
  const articles = await prisma.article.findMany({
    where: { published: true },
    select: {
      slug: true,
      updatedAt: true,
      cluster: {
        select: {
          clusterType: true,
          priorityScore: true,
        },
      },
    },
  });

  // Convert articles to sitemap entries
  const articleEntries: MetadataRoute.Sitemap = articles.map((article) => {
    // Higher priority for higher-priority clusters
    const priorityScore = article.cluster?.priorityScore || 50;
    const priority = Math.min(0.8, 0.5 + (priorityScore / 100) * 0.3);

    return {
      url: `${BASE_URL}/learn/${article.slug}`,
      lastModified: article.updatedAt,
      changeFrequency: "weekly" as const,
      priority: Number(priority.toFixed(1)),
    };
  });

  return [...staticPages, ...articleEntries];
}
