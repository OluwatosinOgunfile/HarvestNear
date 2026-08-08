"use client";

import { Moon, Sun } from "lucide-react";
import { ReactNode, useSyncExternalStore } from "react";

type Theme = "light" | "dark";

function getTheme(): Theme {
  return localStorage.getItem("harvest-near-theme") === "dark" ? "dark" : "light";
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener("harvest-near-theme-change", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener("harvest-near-theme-change", onChange);
  };
}

function useTheme() {
  return useSyncExternalStore(subscribe, getTheme, () => "light" as Theme);
}

export function FarmStoreTheme({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return <div className="store-page app-shell" data-theme={theme}>{children}</div>;
}

export function FarmStoreThemeToggle() {
  const theme = useTheme();
  function toggle() {
    const next = theme === "light" ? "dark" : "light";
    localStorage.setItem("harvest-near-theme", next);
    window.dispatchEvent(new Event("harvest-near-theme-change"));
  }
  return <button className="notification-button store-theme-toggle" onClick={toggle} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`} title={`Switch to ${theme === "light" ? "dark" : "light"} theme`}>{theme === "light" ? <Moon size={18}/> : <Sun size={18}/>}</button>;
}
