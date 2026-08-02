"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { StatusBar, Style } from "@capacitor/status-bar";

export default function MobileRuntime() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    document.documentElement.dataset.nativeApp = Capacitor.getPlatform();

    const updateStatusBar = async () => {
      const dark = document.querySelector(".app-shell[data-theme='dark']") !== null;
      await StatusBar.setStyle({ style: dark ? Style.Light : Style.Dark });
      if (Capacitor.getPlatform() === "android") {
        await StatusBar.setBackgroundColor({ color: dark ? "#142019" : "#FFFFFF" });
      }
    };

    void updateStatusBar();
    const observer = new MutationObserver(() => void updateStatusBar());
    observer.observe(document.body, { attributes: true, subtree: true, attributeFilter: ["data-theme"] });

    const backListener = App.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack) window.history.back();
      else void App.minimizeApp();
    });

    return () => {
      observer.disconnect();
      void backListener.then((listener) => listener.remove());
      delete document.documentElement.dataset.nativeApp;
    };
  }, []);

  return null;
}
