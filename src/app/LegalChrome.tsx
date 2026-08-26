"use client";

import { ArrowRight, Mail, MapPin, Moon, PackageCheck, ShoppingBag, Store, Sun, UserRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { useSyncExternalStore } from "react";
import styles from "./legal.module.css";

function getThemeSnapshot() {
  return localStorage.getItem("harvest-near-theme") === "dark" ? "dark" : "light";
}

function subscribeToTheme(onChange: () => void) {
  const handleChange = () => onChange();
  window.addEventListener("storage", handleChange);
  window.addEventListener("harvest-near-theme-change", handleChange);
  return () => {
    window.removeEventListener("storage", handleChange);
    window.removeEventListener("harvest-near-theme-change", handleChange);
  };
}

function useLegalTheme() {
  return useSyncExternalStore(subscribeToTheme, getThemeSnapshot, () => "light");
}

export function LegalPageShell({ children }: { children: ReactNode }) {
  const theme = useLegalTheme();
  return <div className={styles.page} data-theme={theme}>{children}</div>;
}

export function LegalHeader() {
  const theme = useLegalTheme();
  function toggleTheme() {
    localStorage.setItem("harvest-near-theme", theme === "light" ? "dark" : "light");
    window.dispatchEvent(new Event("harvest-near-theme-change"));
  }
  return <header className={styles.siteHeader}><div className={styles.headerInner}><Link className={styles.headerBrand} href="/"><Image src="/brand/harvestnearu-opaque-seal-se2-lockup.png" width={380} height={96} alt="HarvestNearU" priority/></Link><nav aria-label="Main navigation"><Link href="/">Home</Link><Link href="/produce"><ShoppingBag size={17}/> <span>Shop produce</span></Link><Link href="/orders"><PackageCheck size={17}/> <span>My orders</span></Link></nav><div className={styles.headerActions}><button className={styles.themeButton} onClick={toggleTheme} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`} title={`Switch to ${theme === "light" ? "dark" : "light"} theme`}>{theme === "light" ? <Moon size={18}/> : <Sun size={18}/>}</button><Link className={styles.accountLink} href="/profile"><UserRound size={19}/><span>Account</span></Link></div></div></header>;
}

export function LegalFooter() {
  return <footer className={styles.siteFooter}><div className={styles.footerMain}><div className={styles.footerBrand}><Link href="/"><Image src="/brand/harvestnearu-opaque-seal-se2-lockup.png" width={380} height={96} alt="HarvestNearU"/></Link><p>Fresh Nigerian produce, fair prices, and stronger local farming communities.</p><a href="mailto:hello@harvestnearu.com"><Mail size={15}/> hello@harvestnearu.com</a></div><nav><strong>Marketplace</strong><Link href="/">About HarvestNearU</Link><Link href="/produce">Shop produce</Link><Link href="/orders">My orders</Link><Link href="/farmer"><Store size={14}/> Farmer workspace</Link></nav><nav><strong>Account &amp; support</strong><Link href="/profile">My profile</Link><Link href="/help">Help centre</Link><Link href="/delivery-areas">Delivery areas</Link><Link href="/returns-refunds">Returns &amp; refunds</Link></nav><div className={styles.footerNotes}><strong>Account controls</strong><p>Review how your information is handled or permanently delete your account.</p><Link href="/privacy">Privacy policy <ArrowRight size={14}/></Link><Link href="/account-deletion">Delete account <ArrowRight size={14}/></Link></div></div><div className={styles.footerBottom}><span>&copy; 2026 HarvestNearU Nigeria</span><div><Link href="/privacy">Privacy</Link><Link href="/account-deletion">Delete account</Link></div><span><MapPin size={12}/> Fresh Local Produce, Found Here</span></div></footer>;
}
