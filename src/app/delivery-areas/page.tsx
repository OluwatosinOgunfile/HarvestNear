import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fresh Produce Delivery Areas | HarvestNearU",
  description: "See where HarvestNearU offers nearby farm pickup, collection and doorstep delivery for fresh local produce in Nigeria.",
  alternates: { canonical: "/delivery-areas" },
  openGraph: { title: "Fresh Produce Delivery Areas | HarvestNearU", description: "Explore farm pickup, collection and doorstep delivery options.", url: "/delivery-areas", images: [{ url: "/og-harvestnearu.jpg", width: 1200, height: 630 }] },
  twitter: { card: "summary_large_image", title: "Fresh Produce Delivery Areas | HarvestNearU", description: "Explore farm pickup, collection and doorstep delivery options.", images: ["/og-harvestnearu.jpg"] },
};

export { default } from "../page";
