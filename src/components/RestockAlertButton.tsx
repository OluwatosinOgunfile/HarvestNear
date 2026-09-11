"use client";

import { Bell, BellRing, LoaderCircle } from "lucide-react";
import { useState } from "react";

type Props = { listingId: string; listingTitle: string; signedIn: boolean; initiallyWatching: boolean };

export function RestockAlertButton({ listingId, listingTitle, signedIn, initiallyWatching }: Props) {
  const [watching, setWatching] = useState(initiallyWatching);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function toggle() {
    if (!signedIn) { window.location.href = "/?auth=signin"; return; }
    const next = !watching;
    setBusy(true); setError("");
    setWatching(next);
    try {
      const response = await fetch("/api/restock-alerts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, watching: next }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(body?.error || "Could not update the alert");
      }
    } catch (reason) {
      setWatching(!next);
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return <div className="restock-alert">
    <button type="button" onClick={toggle} disabled={busy} className={watching ? "watching" : ""}
      aria-pressed={watching}
      aria-label={watching ? `Stop watching ${listingTitle}` : `Tell me when ${listingTitle} is back in stock`}>
      {busy ? <LoaderCircle size={15} className="restock-spin"/> : watching ? <BellRing size={15}/> : <Bell size={15}/>}
      {watching ? "Watching" : "Notify me"}
    </button>
    {error && <small role="alert">{error}</small>}
  </div>;
}
