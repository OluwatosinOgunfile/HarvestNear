import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fresh Produce Delivery Areas | HarvestNearU",
  description: "See where verified HarvestNearU farms may offer farm pickup or doorstep delivery for fresh local produce across Abuja.",
  alternates: { canonical: "/delivery-areas" },
  openGraph: { title: "Fresh Produce Delivery Areas | HarvestNearU", description: "Explore farm-dependent pickup and doorstep delivery options across Abuja.", url: "/delivery-areas", images: [{ url: "/og-harvestnearu.jpg", width: 1200, height: 630 }] },
  twitter: { card: "summary_large_image", title: "Fresh Produce Delivery Areas | HarvestNearU", description: "Explore farm-dependent pickup and doorstep delivery options across Abuja.", images: ["/og-harvestnearu.jpg"] },
};

export { default } from "../page";
