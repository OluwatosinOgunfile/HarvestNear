import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
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
import "./consistency.css";
import "./readability.css";
import "./farm-store.css";
import "./receipt.css";

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.harvestnearu.com"),
  applicationName: "HarvestNearU",
  title: "HarvestNearU | Fresh Local Produce, Found Here",
  description: "Shop fresh produce from trusted farmers near you, with local pickup and doorstep delivery.",
  keywords: ["fresh produce Nigeria", "farmers market Nigeria", "local farmers", "farm produce delivery", "fresh food Abuja", "HarvestNearU"],
  category: "marketplace",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_NG",
    url: "/",
    siteName: "HarvestNearU",
    title: "HarvestNearU | Fresh Local Produce, Found Here",
    description: "Shop fresh produce from trusted farmers near you, with local pickup and doorstep delivery.",
    images: [{ url: "/og-harvestnearu.jpg", width: 1200, height: 630, alt: "HarvestNearU fresh local produce marketplace" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "HarvestNearU | Fresh Local Produce, Found Here",
    description: "Shop fresh produce from trusted farmers near you, with local pickup and doorstep delivery.",
    images: ["/og-harvestnearu.jpg"],
  },
  icons: {
    icon: [
      { url: "/favicon-48.png", type: "image/png", sizes: "48x48" },
      { url: "/favicon-192.png", type: "image/png", sizes: "192x192" },
    ],
    apple: [{ url: "/favicon-192.png", type: "image/png", sizes: "192x192" }],
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#142019" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://www.harvestnearu.com/#organization",
        name: "HarvestNearU",
        url: "https://www.harvestnearu.com/",
        logo: "https://www.harvestnearu.com/favicon-192.png",
        description: "A Nigerian marketplace connecting consumers with fresh produce from trusted nearby farmers.",
        email: "hello@harvestnearu.com",
      },
      {
        "@type": "WebSite",
        "@id": "https://www.harvestnearu.com/#website",
        url: "https://www.harvestnearu.com/",
        name: "HarvestNearU",
        publisher: { "@id": "https://www.harvestnearu.com/#organization" },
        inLanguage: "en-NG",
      },
    ],
  };
  return <html lang="en-NG"><body className={manrope.variable}>{children}<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}/></body></html>;
}
