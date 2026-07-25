import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Campaign Kit | HarvestNearU",
  robots: { index: false, follow: false },
};

export default function CampaignKitLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
