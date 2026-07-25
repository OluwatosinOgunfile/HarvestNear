import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Returns and Refunds | HarvestNearU",
  description: "Learn how HarvestNearU handles cancellations, produce issues, account credit and bank refunds.",
  alternates: { canonical: "/returns-refunds" },
  openGraph: { title: "Returns and Refunds | HarvestNearU", description: "Understand cancellations, produce issues, account credit and bank refunds.", url: "/returns-refunds", images: [{ url: "/og-harvestnearu.jpg", width: 1200, height: 630 }] },
  twitter: { card: "summary_large_image", title: "Returns and Refunds | HarvestNearU", description: "Understand cancellations, produce issues, account credit and bank refunds.", images: ["/og-harvestnearu.jpg"] },
};

export { default } from "../page";
