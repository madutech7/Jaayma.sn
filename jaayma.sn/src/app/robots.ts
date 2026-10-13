import type { MetadataRoute } from "next";
import { getRequestOrigin } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const baseUrl = await getRequestOrigin();

  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/explorer", "/*"],
      disallow: ["/espace/", "/admin/", "/api/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
