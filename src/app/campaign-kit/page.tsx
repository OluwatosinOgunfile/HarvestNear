"use client";
/* eslint-disable @next/next/no-img-element */

import { ArrowLeft, Check, Copy, Leaf, MapPin, Printer, ShoppingBag, Store, Truck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import "./campaign.css";

const captions = [
  { title: "Consumer launch", text: "The freshest food may be closer than you think. Discover available produce from verified farms, compare estimated walking times, order the quantity you need, and track every item from confirmation to receipt. Shop local at harvestnearu.com." },
  { title: "Farmer recruitment", text: "Your next customer could be nearby. Create one account for multiple farms, publish live stock with optional selling dates, manage each order item, and build trust through verified buyer ratings on HarvestNearU." },
  { title: "WhatsApp broadcast", text: "Fresh harvests are closer. Shop vegetables, tubers, grains, fruit, eggs and more from verified farms near you. Pay securely with Paystack and follow each item until receipt. Visit harvestnearu.com." },
];

export default function CampaignKit() {
  const [copied, setCopied] = useState<string | null>(null);
  async function copyText(title: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(title);
    window.setTimeout(() => setCopied(null), 1600);
  }
  return <main className="campaign-kit">
    <header className="kit-header">
      <div><Link href="/"><ArrowLeft size={16}/> Back to HarvestNearU</Link><p>HARVESTNEARU LAUNCH CAMPAIGN</p><h1>Promotional materials</h1><span>Campaign theme: <strong>Fresh Local Produce, Found Here.</strong></span></div>
      <button onClick={() => window.print()}><Printer size={17}/> Print campaign kit</button>
    </header>

    <section className="kit-section"><div className="section-label"><span>01</span><div><h2>Consumer campaign</h2><p>Awareness and marketplace launch</p></div></div>
      <div className="creative-row">
        <article className="creative social-square">
          <img className="creative-photo" src="/produce/vine-ripe-tomatoes.webp" alt="Fresh tomatoes"/>
          <div className="photo-shade"/><img className="creative-logo logo-light" style={{ background: "transparent" }} src="/brand/harvestnearu-opaque-seal-se2-lockup.png" alt="HarvestNearU"/>
          <div className="creative-copy"><small>FRESH FROM FARMS NEAR YOU</small><h3>Today&apos;s harvest.<br/><em>Closer than ever.</em></h3><p>Shop fresh produce from trusted local farmers.</p><button>Shop nearby harvests <ShoppingBag size={15}/></button></div>
          <div className="creative-foot"><span><MapPin size={13}/> Gudu, Abuja</span><b>harvestnearu.com</b></div>
        </article>
        <article className="creative story-poster">
          <div className="story-images"><img src="/produce/garden-fresh-spinach.webp" alt="Spinach"/><img src="/produce/fresh-sweet-corn.webp" alt="Sweet corn"/><img src="/produce/sweet-ripe-plantain.webp" alt="Plantain"/></div>
          <img className="story-logo" src="/brand/harvestnearu-approved-mark.png" alt="HarvestNearU mark"/>
          <div className="story-copy"><small>FROM FARM GATE TO YOUR PLATE</small><h3>Fresh starts<br/>near you.</h3><p>Verified farms. Live stock.<br/>Item-level order tracking.</p><span>HARVESTNEARU.COM <b>?</b></span></div>
        </article>
      </div>
    </section>

    <section className="kit-section"><div className="section-label"><span>02</span><div><h2>Farmer recruitment</h2><p>Supply-side onboarding campaign</p></div></div>
      <article className="creative farmer-banner">
        <img src="/produce/oyo-white-yam.webp" alt="Fresh yam harvest"/><div className="farmer-banner-shade"/>
        <div className="banner-logo" style={{ background: "transparent" }}><img src="/brand/harvestnearu-opaque-seal-se2-lockup.png" alt="HarvestNearU"/></div>
        <div className="farmer-message"><small>FOR FARMERS</small><h3>Your harvest already<br/>has buyers nearby.</h3><p>Manage multiple farms. Publish live stock.<br/>Fulfil each item and grow through verified ratings.</p><button><Store size={16}/> Start selling on HarvestNearU</button></div>
        <div className="banner-stats"><div><strong>Nearby</strong><span>customer discovery</span></div><div><strong>Live</strong><span>inventory control</span></div><div><strong>Verified</strong><span>buyer feedback</span></div></div>
      </article>
    </section>

    <section className="kit-section"><div className="section-label"><span>03</span><div><h2>Launch announcement</h2><p>Website, X, LinkedIn and digital display</p></div></div>
      <article className="creative launch-banner"><div className="launch-brand"><img src="/brand/harvestnearu-approved-mark.png" alt="HarvestNearU"/></div><div className="launch-copy"><small>NOW SERVING ABUJA</small><h3>Fresh local produce,<br/><em>found right here.</em></h3><p>Visit farm storefronts, order live stock, pay securely, and track every item.</p><div><span><Truck size={14}/> Flexible fulfilment</span><span><Check size={14}/> Verified farms</span></div></div><div className="launch-collage"><img src="/produce/golden-pineapple.webp" alt="Pineapple"/><img src="/produce/red-scotch-bonnet.webp" alt="Pepper"/><img src="/produce/creamy-avocados.webp" alt="Avocado"/></div></article>
    </section>

    <section className="kit-section copy-section"><div className="section-label"><span>04</span><div><h2>Campaign copy</h2><p>Ready for social and direct messaging</p></div></div>
      <div className="copy-grid">{captions.map(item=><article key={item.title}><div><Leaf size={17}/><strong>{item.title}</strong></div><p>{item.text}</p><button onClick={() => copyText(item.title,item.text)}>{copied===item.title?<><Check size={14}/> Copied</>:<><Copy size={14}/> Copy text</>}</button></article>)}</div>
    </section>

    <footer className="kit-footer"><img style={{ background: "transparent" }} src="/brand/harvestnearu-opaque-seal-se2-lockup.png" alt="HarvestNearU"/><span>Fresh Local Produce, Found Here.</span><p>Launch campaign · Abuja pilot · 2026</p></footer>
  </main>;
}
