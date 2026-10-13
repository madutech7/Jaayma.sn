import type { MetadataRoute } from "next";
import { getRequestOrigin } from "@/lib/site-url";
import { api } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = await getRequestOrigin();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/explorer`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.9,
    },
  ];

  try {
    const publishedShops = await api.getShops();

    const shopRoutes: MetadataRoute.Sitemap = publishedShops.map((shop) => ({
      url: `${baseUrl}/${shop.slug}`,
      lastModified: shop.createdAt ? new Date(shop.createdAt) : new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    }));

    return [...staticRoutes, ...shopRoutes];
  } catch (error) {
    console.error("Error generating sitemap:", error);
    return staticRoutes;
  }
}
