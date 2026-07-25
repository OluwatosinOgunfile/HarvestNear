import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/admin", "/profile", "/orders", "/farmer", "/brand-preview", "/campaign-kit"],
    },
    sitemap: "https://www.harvestnearu.com/sitemap.xml",
    host: "https://www.harvestnearu.com",
  };
}
