import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Help Centre | HarvestNearU",
  description: "Get help with HarvestNearU orders, payments, delivery choices, farm maps, payouts, notifications, account credit, refunds and marketplace support.",
  alternates: { canonical: "/help" },
  openGraph: { title: "Help Centre | HarvestNearU", description: "Help with orders, payments, delivery choices, farm maps, payouts, notifications, credit and refunds.", url: "/help", images: [{ url: "/og-harvestnearu.jpg", width: 1200, height: 630 }] },
  twitter: { card: "summary_large_image", title: "Help Centre | HarvestNearU", description: "Help with orders, payments, delivery choices, farm maps, payouts, notifications, credit and refunds.", images: ["/og-harvestnearu.jpg"] },
};

export { default } from "../page";
