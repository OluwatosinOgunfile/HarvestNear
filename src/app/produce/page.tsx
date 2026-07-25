import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fresh Produce Near You in Nigeria | HarvestNearU",
  description: "Browse fresh vegetables, fruits, tubers, grains and more from verified Nigerian farms, ranked by proximity with pickup and delivery options.",
  alternates: { canonical: "/produce" },
  openGraph: { title: "Shop Fresh Produce Near You | HarvestNearU", description: "Find available harvests from trusted nearby Nigerian farms.", url: "/produce", images: [{ url: "/og-harvestnearu.jpg", width: 1200, height: 630 }] },
  twitter: { card: "summary_large_image", title: "Shop Fresh Produce Near You | HarvestNearU", description: "Find available harvests from trusted nearby Nigerian farms.", images: ["/og-harvestnearu.jpg"] },
};

export { default } from "../page";
