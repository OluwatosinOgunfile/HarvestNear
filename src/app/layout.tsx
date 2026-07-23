import type { Metadata } from "next";
import "./globals.css";
import "./theme.css";
import "./orders.css";
import "./farm-management.css";
import "./catalog.css";
import "./footer.css";
import "./landing.css";
import "./profile.css";
import "./notifications.css";
import "./brand-header.css";
import "./steps.css";
import "./support.css";
import "./admin.css";
import "./spinner.css";
import "./polish.css";
import "./modern.css";

export const metadata: Metadata = {
  title: "HarvestNearU | Fresh Local Produce, Found Here",
  description: "Shop fresh produce from trusted farmers near you, with local pickup and doorstep delivery.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
