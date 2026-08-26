"use client";

import { CheckCircle2, LoaderCircle, MailCheck, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";
import styles from "../legal.module.css";

async function readResponse(response: Response) {
  const text = await response.text();
  try { return text ? JSON.parse(text) as { error?: string; maskedEmail?: string } : {}; }
  catch { return { error: "The server returned an unreadable response." }; }
}

export function AccountDeletionForm() {
  const [sentTo, setSentTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function requestCode() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/account", { method: "POST" });
      const data = await readResponse(response);
      if (!response.ok) throw new Error(data.error || "Could not send the deletion code");
      setSentTo(data.maskedEmail || "your registered email");
    } catch (reason) { setError((reason as Error).message); }
    finally { setBusy(false); }
  }

  async function confirmDeletion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch("/api/account", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
      const data = await readResponse(response);
      if (!response.ok) throw new Error(data.error || "Could not delete the account");
      window.location.assign("/?accountDeleted=1");
    } catch (reason) { setError((reason as Error).message); }
    finally { setBusy(false); }
  }

  return <section className={styles.deletePanel}><div className={styles.deletePanelIcon}>{sentTo ? <MailCheck size={25}/> : <ShieldAlert size={25}/>}</div><div className={styles.deletePanelCopy}><p className={styles.eyebrow}>Identity confirmation</p><h2>{sentTo ? "Enter the code from your email" : "Confirm with your registered email"}</h2><p>{sentTo ? `A six-digit code was sent to ${sentTo}. It expires in 15 minutes.` : "Sign in to HarvestNearU, then request a one-time code. This prevents someone with temporary access to your device from deleting your account."}</p></div>{!sentTo ? <><button className={styles.action} type="button" onClick={() => void requestCode()} disabled={busy}>{busy ? <LoaderCircle className={styles.spin} size={17}/> : <MailCheck size={17}/>} {busy ? "Sending code..." : "Email my deletion code"}</button>{error && <div className={styles.formError}>{error} {error.toLowerCase().includes("sign in") && <Link href="/">Return home to sign in</Link>}</div>}</> : <form className={styles.deleteForm} onSubmit={confirmDeletion}><label>Six-digit code<input name="code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" required/></label><label>Current password <small>Leave blank if you use Google sign-in</small><input name="password" type="password" autoComplete="current-password"/></label><label>Type DELETE to confirm<input name="confirmation" pattern="DELETE" required/></label>{error && <div className={styles.formError}>{error}</div>}<div className={styles.formActions}><button type="button" className={styles.secondaryAction} onClick={() => { setSentTo(""); setError(""); }}>Cancel</button><button className={styles.dangerAction} disabled={busy}>{busy ? <LoaderCircle className={styles.spin} size={17}/> : <CheckCircle2 size={17}/>} {busy ? "Deleting..." : "Delete permanently"}</button></div></form>}</section>;
}
