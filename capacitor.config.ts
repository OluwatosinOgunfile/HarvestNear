import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.harvestnearu.marketplace",
  appName: "HarvestNearU",
  webDir: "mobile-shell",
  server: {
    url: process.env.CAPACITOR_SERVER_URL || "https://www.harvestnearu.com",
    cleartext: false,
    allowNavigation: ["www.harvestnearu.com", "harvestnearu.com", "checkout.paystack.com", "accounts.google.com"],
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1800,
      launchAutoHide: true,
      backgroundColor: "#F7F9F5",
      androidScaleType: "CENTER_INSIDE",
      showSpinner: false,
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#0E2A1C",
      overlaysWebView: false,
    },
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
  },
  ios: {
    contentInset: "automatic",
    scrollEnabled: true,
  },
};

export default config;
