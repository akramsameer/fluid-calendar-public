import { MetadataRoute } from "next";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://fluidcalendar.com";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

/**
 * Open-source sitemap with core pages only.
 * When SaaS submodule is present, this is replaced via symlink
 * with a version that includes articles and other SaaS pages.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${BASE_URL}/auth/signin`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];
}
