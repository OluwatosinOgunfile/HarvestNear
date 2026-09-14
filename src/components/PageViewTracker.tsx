"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Records a page view whenever the route changes. It sits in the root layout so the single-page
 * marketplace and the server-rendered farm pages are both counted, and it never blocks or reports
 * anything to the reader: a failed beacon is simply a view that is not counted.
 */
export function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastSent = useRef("");

  useEffect(() => {
    const view = `${pathname}?${searchParams.get("view") || ""}`;
    if (view === lastSent.current) return;
    lastSent.current = view;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void fetch("/api/analytics/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: pathname, referrer: document.referrer || undefined }),
        signal: controller.signal,
        keepalive: true,
      }).catch(() => undefined);
    }, 400);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [pathname, searchParams]);

  return null;
}
