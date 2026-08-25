import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import styles from "../legal.module.css";

export const metadata: Metadata = { title: "Delete Your Account | HarvestNearU", description: "Delete a HarvestNearU account and its associated personal information." };

export default function AccountDeletion() {
  return <main className={styles.page}><div className={styles.shell}>
    <Link className={styles.brand} href="/"><Image src="/brand/harvestnearu-header-lockup.png" width={380} height={96} alt="HarvestNearU" priority/></Link>
    <article className={styles.hero}><p className={styles.eyebrow}>Account and data controls</p><h1>Delete your HarvestNearU account.</h1><p className={styles.intro}>You can permanently remove your account from the mobile app. Open Account, select Privacy &amp; security, then choose Delete account.</p></article>
    <div className={styles.content}>
      <section><h2>What deletion removes</h2><p>Your sign-in credentials, contact details, saved delivery locations, profile image, preferences, favourites, notifications, and public farm contact and location information are removed or anonymized. Active listings are paused and access is revoked immediately.</p></section>
      <section><h2>What may be retained</h2><p>Non-identifying order, payment, refund, payout, fraud-prevention, tax, accounting, and audit records may be retained where necessary to meet legal obligations, settle transactions, prevent abuse, or resolve disputes.</p></section>
      <section className={styles.note}><h2>Cannot access the app?</h2><p>Email <a href="mailto:hello@harvestnearu.com?subject=HarvestNearU%20account%20deletion%20request">hello@harvestnearu.com</a> from the address registered to your account with the subject “Account deletion request”. Support will verify ownership before processing the request.</p><a className={styles.action} href="mailto:hello@harvestnearu.com?subject=HarvestNearU%20account%20deletion%20request">Request account deletion</a></section>
      <section><h2>Before deleting</h2><p>Resolve outstanding orders, refunds, support cases, or farmer payouts where possible. Account deletion cannot be reversed, and the deleted email address is not used to restore the account.</p></section>
    </div><p className={styles.footer}><Link href="/privacy">Read the privacy policy</Link> · <Link href="/">Return to marketplace</Link></p>
  </div></main>;
}
