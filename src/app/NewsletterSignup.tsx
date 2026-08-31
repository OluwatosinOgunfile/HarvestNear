"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, Check, LoaderCircle } from "lucide-react";

export function NewsletterSignup({ source = "website_footer" }: { source?: "website_footer" | "farm_store_footer" }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);

  async function subscribe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const email = String(new FormData(form).get("email") || "");
    setBusy(true); setMessage(""); setFailed(false);
    try {
      const response = await fetch("/api/newsletter", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, source }) });
      const result = await response.json().catch(() => null) as { message?: string; error?: string } | null;
      if (!response.ok) throw new Error(result?.error || "Subscription could not be saved");
      setMessage(result?.message || "You are subscribed to Harvest notes.");
      form.reset();
    } catch (error) {
      setFailed(true); setMessage((error as Error).message);
    } finally { setBusy(false); }
  }

  return <><form onSubmit={subscribe}><label><span className="sr-only">Email address</span><input name="email" type="email" required maxLength={254} autoComplete="email" inputMode="email" placeholder="Email address" disabled={busy}/></label><button aria-label="Subscribe to weekly Harvest notes" disabled={busy}>{busy ? <LoaderCircle className="spin" size={16}/> : <ArrowRight size={16}/>}</button></form>{message && <small className={`newsletter-status ${failed ? "error" : "success"}`} role={failed ? "alert" : "status"}>{!failed && <Check size={13}/>} {message}</small>}</>;
}
