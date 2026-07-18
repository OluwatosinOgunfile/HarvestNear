import { ArrowLeft, Check, Leaf } from "lucide-react";
import Link from "next/link";
import "./preview.css";

const options = [
  { name: "Fraunces", className: "font-fraunces", note: "Organic · warm · distinctive", recommended: true },
  { name: "Bricolage Grotesque", className: "font-bricolage", note: "Modern · expressive · capable" },
  { name: "Young Serif", className: "font-young-serif", note: "Friendly · confident · artisanal" },
  { name: "DM Serif Display", className: "font-dm-serif", note: "Premium · approachable · editorial" },
  { name: "Sora", className: "font-sora", note: "Clean · geometric · contemporary" },
  { name: "Unbounded", className: "font-unbounded", note: "Bold · unconventional · digital" },
  { name: "Bodoni Moda", className: "font-bodoni", note: "Elegant · refined · premium" },
  { name: "Anybody", className: "font-anybody", note: "Flexible · playful · memorable" },
];

export default function BrandPreview() {
  return <main className="type-preview">
    <header className="preview-header">
      <Link href="/"><ArrowLeft size={16}/> Back to marketplace</Link>
      <p>HARVESTNEAR BRAND EXPLORATION</p>
      <h1>Wordmark directions</h1>
      <span>Eight type personalities applied to the same brand lockup and color system.</span>
    </header>
    <section className="specimen-grid">
      {options.map((option,index)=><article className={`type-card ${option.recommended ? "recommended" : ""}`} key={option.name}>
        <div className="type-meta"><span>{String(index+1).padStart(2,"0")}</span><div><strong>{option.name}</strong><small>{option.note}</small></div>{option.recommended&&<b><Check size={11}/> Recommended</b>}</div>
        <div className="wordmark-stage">
          <span className="preview-mark"><Leaf size={26} strokeWidth={2.5}/></span>
          <div><div className={`sample-wordmark ${option.className}`}><span>Harvest</span><em>Near</em></div><p>Today&apos;s harvest, closer.</p></div>
        </div>
        <div className="small-test"><span>SMALL FORMAT</span><strong className={option.className}>Harvest<em>Near</em></strong><small>Clear at navigation size</small></div>
      </article>)}
    </section>
    <footer className="preview-note"><Leaf size={18}/><p><strong>Selection guidance</strong>Compare the lowercase shapes, the connection between “Harvest” and “Near,” and readability in the small-format row.</p></footer>
  </main>;
}
