import type { MetadataRoute } from "next";

const baseUrl = "https://www.harvestnearu.com";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${baseUrl}/`, changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/produce`, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/help`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/delivery-areas`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/returns-refunds`, changeFrequency: "monthly", priority: 0.5 },
  ];
}
