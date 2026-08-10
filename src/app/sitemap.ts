import type { MetadataRoute } from "next";
import { getDatabase } from "@/lib/db";

const baseUrl = "https://www.harvestnearu.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/produce`, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/help`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/delivery-areas`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/returns-refunds`, changeFrequency: "monthly", priority: 0.5 },
  ];

  try {
    const sql = getDatabase();
    const farms = await sql`
      SELECT id, updated_at
      FROM farms
      WHERE verification_status = 'verified'
      ORDER BY updated_at DESC
    `;
    return [...staticRoutes, ...farms.map((farm) => ({
      url: `${baseUrl}/farms/${farm.id}`,
      lastModified: new Date(String(farm.updated_at)),
      changeFrequency: "daily" as const,
      priority: 0.8,
    }))];
  } catch {
    return staticRoutes;
  }
}
