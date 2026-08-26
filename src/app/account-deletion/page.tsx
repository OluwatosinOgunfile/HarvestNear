import type { Metadata } from "next";
import { LegalFooter, LegalHeader, LegalPageShell } from "../LegalChrome";
import styles from "../legal.module.css";
import { AccountDeletionForm } from "./AccountDeletionForm";

export const metadata: Metadata = { title: "Delete Your Account | HarvestNearU", description: "Securely confirm and delete a HarvestNearU account and its associated personal information." };

export default function AccountDeletion() {
  return <LegalPageShell><LegalHeader/><main className={styles.legalMain}><article className={styles.hero}><p className={styles.eyebrow}>Account and data controls</p><h1>Delete your HarvestNearU account.</h1><p className={styles.intro}>Confirm account ownership with a one-time code sent to your registered email. You can complete the same secure process here or from Privacy &amp; security in the mobile app.</p></article><div className={styles.content}><section><h2>What deletion removes</h2><p>Your sign-in credentials, contact details, saved delivery locations, profile image, preferences, favourites, notifications, and public farm contact and location information are removed or anonymized. Active listings are paused and access is revoked immediately.</p></section><section><h2>What may be retained</h2><p>Non-identifying order, payment, refund, payout, fraud-prevention, tax, accounting, and audit records may be retained where necessary to meet legal obligations, settle transactions, prevent abuse, or resolve disputes.</p></section><AccountDeletionForm/><section><h2>Before deleting</h2><p>Resolve outstanding orders, refunds, support cases, or farmer payouts where possible. Account deletion cannot be reversed, and the deleted email address is not used to restore the account.</p></section></div></main><LegalFooter/></LegalPageShell>;
}
