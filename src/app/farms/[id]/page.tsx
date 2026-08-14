import type { Metadata } from "next";
import { ArrowRight, AtSign, BadgeCheck, ChevronDown, ChevronRight, ExternalLink, House, Leaf, Mail, MapPin, PackageCheck, Phone, ShoppingBag, Star, Store, Truck, UserRound } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getDatabase } from "@/lib/db";
import { DEFAULT_LISTING_IMAGE, listingImageUrl } from "@/lib/images";
import { FarmStoreTheme, FarmStoreThemeToggle } from "@/components/FarmStoreTheme";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ id: string }> };
type Row = Record<string, unknown>;
const money = (v: unknown) => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(Number(v) / 100);
const formatDate = (v: unknown) => new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Lagos" }).format(new Date(String(v)));

const loadFarm = cache(async function loadFarm(id: string) {
  const sql = getDatabase();
  const [farms, listings, reviews] = await Promise.all([
    sql`SELECT farm.id, farm.name, farm.description, farm.phone, farm.email, farm.address_text, farm.city, farm.state, farm.latitude, farm.longitude,
      farm.offers_pickup, farm.offers_delivery,
      coalesce((SELECT round(avg(review.rating)::numeric, 2) FROM reviews review WHERE review.farm_id=farm.id AND review.is_visible), 0) AS average_rating,
      (SELECT count(*)::int FROM reviews review WHERE review.farm_id=farm.id AND review.is_visible) AS review_count,
      farm.verified_at,
      owner.first_name, owner.last_name FROM farms farm JOIN users owner ON owner.id = farm.owner_id
      WHERE farm.id = ${id} AND farm.verification_status = 'verified' LIMIT 1`,
    sql`SELECT listing.id, listing.title, listing.unit, listing.unit_price_kobo,
      (listing.quantity_available-listing.quantity_reserved) AS stock, category.id AS category_id, category.name AS category,
      image.url AS image_url FROM produce_listings listing JOIN products product ON product.id=listing.product_id
      JOIN produce_categories category ON category.id=product.category_id
      LEFT JOIN LATERAL (SELECT url FROM listing_images WHERE listing_id=listing.id ORDER BY sort_order,created_at LIMIT 1) image ON true
      WHERE listing.farm_id=${id} AND listing.status='active' AND listing.quantity_available>listing.quantity_reserved
      AND (listing.available_from IS NULL OR listing.available_from<=now())
      AND (listing.available_until IS NULL OR listing.available_until>now())
      ORDER BY listing.created_at DESC`,
    sql`SELECT review.id,review.rating,review.comment,review.farmer_reply,review.created_at,customer.first_name,customer.last_name
      FROM reviews review JOIN users customer ON customer.id=review.customer_id
      WHERE review.farm_id=${id} AND review.is_visible ORDER BY review.created_at DESC LIMIT 30`,
  ]);
  if (!farms[0]) return null;
  const categoryIds = listings.map((x) => String(x.category_id));
  const recommendations = categoryIds.length ? await sql`SELECT listing.id,listing.title,listing.unit,listing.unit_price_kobo,
    farm.id AS farm_id,farm.name AS farm_name,category.name AS category,image.url AS image_url
    FROM produce_listings listing JOIN farms farm ON farm.id=listing.farm_id JOIN products product ON product.id=listing.product_id
    JOIN produce_categories category ON category.id=product.category_id
    LEFT JOIN LATERAL (SELECT url FROM listing_images WHERE listing_id=listing.id ORDER BY sort_order,created_at LIMIT 1) image ON true
    WHERE listing.farm_id<>${id} AND product.category_id=ANY(${categoryIds}::uuid[]) AND farm.verification_status='verified'
    AND listing.status='active' AND listing.quantity_available>listing.quantity_reserved
    AND (listing.available_from IS NULL OR listing.available_from<=now())
    AND (listing.available_until IS NULL OR listing.available_until>now())
    ORDER BY listing.created_at DESC LIMIT 8` : [];
  return { farm: farms[0] as Row, listings: listings as Row[], reviews: reviews as Row[], recommendations: recommendations as Row[] };
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await loadFarm((await params).id);
  if (!data) return { title: "Farm not found | HarvestNearU", robots: { index: false, follow: false } };
  const farm = data.farm;
  const title = `${farm.name} - Fresh Produce in ${farm.city} | HarvestNearU`;
  const description = `Shop ${data.listings.length} available ${data.listings.length === 1 ? "harvest" : "harvests"} from verified ${farm.name} in ${farm.city}, ${farm.state}. Read verified buyer ratings and view pickup or delivery options.`;
  const canonical = `/farms/${farm.id}`;
  const image = data.listings[0]?.image_url ? listingImageUrl(String(data.listings[0].id), data.listings[0].image_url) : "/og-harvestnearu.jpg";
  return {
    title,
    description,
    keywords: [String(farm.name), `fresh produce ${farm.city}`, `farm in ${farm.state}`, "verified Nigerian farm", "local produce delivery"],
    alternates: { canonical },
    openGraph: { type: "website", locale: "en_NG", siteName: "HarvestNearU", url: canonical, title, description, images: [{ url: image, alt: `Fresh produce from ${farm.name}` }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
    robots: { index: true, follow: true },
  };
}

function Stars({ rating }: { rating: number }) {
  return <span className="store-stars" aria-label={`${rating} out of 5 stars`}>{[1,2,3,4,5].map((n)=><Star key={n} size={17} fill={n<=Math.round(rating)?"currentColor":"none"}/>)}</span>;
}
function ProductCard({ item, showFarm=false }: { item: Row; showFarm?: boolean }) {
  return <article className="store-product-card"><Image src={item.image_url?listingImageUrl(String(item.id),item.image_url):DEFAULT_LISTING_IMAGE} alt={String(item.title)} width={560} height={415} sizes="(max-width: 620px) calc(100vw - 32px), (max-width: 900px) 50vw, 25vw"/><div><small>{String(item.category)}</small><h3>{String(item.title)}</h3>{showFarm&&<a href={`/farms/${item.farm_id}`}>{String(item.farm_name)} <ChevronRight size={14}/></a>}<p><strong>{money(item.unit_price_kobo)}</strong> / {String(item.unit)}</p></div></article>;
}

export default async function FarmStorePage({ params }: Props) {
  const data = await loadFarm((await params).id); if (!data) notFound();
  const { farm, listings, reviews, recommendations } = data; const rating=Number(farm.average_rating);
  const hero=listings[0]?.image_url?listingImageUrl(String(listings[0].id),listings[0].image_url):DEFAULT_LISTING_IMAGE;
  const farmUrl = `https://www.harvestnearu.com/farms/${farm.id}`;
  const latitude=Number(farm.latitude);const longitude=Number(farm.longitude);const hasMap=Number.isFinite(latitude)&&Number.isFinite(longitude);
  const mapDelta=.012;const mapEmbed=hasMap?`https://www.openstreetmap.org/export/embed.html?bbox=${longitude-mapDelta}%2C${latitude-mapDelta}%2C${longitude+mapDelta}%2C${latitude+mapDelta}&layer=mapnik&marker=${latitude}%2C${longitude}`:"";
  const mapUrl=hasMap?`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=15/${latitude}/${longitude}`:"";
  const farmStructuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "LocalBusiness",
        "@id": `${farmUrl}#farm`,
        additionalType: "https://schema.org/Farm",
        name: String(farm.name),
        description: String(farm.description || `${farm.name} supplies fresh, locally grown produce to HarvestNearU customers.`),
        url: farmUrl,
        telephone: String(farm.phone),
        email: farm.email ? String(farm.email) : undefined,
        image: `https://www.harvestnearu.com${hero}`,
        address: { "@type": "PostalAddress", streetAddress: String(farm.address_text), addressLocality: String(farm.city), addressRegion: String(farm.state), addressCountry: "NG" },
        aggregateRating: Number(farm.review_count) > 0 ? { "@type": "AggregateRating", ratingValue: rating, reviewCount: Number(farm.review_count), bestRating: 5, worstRating: 1 } : undefined,
        hasOfferCatalog: { "@type": "OfferCatalog", name: `Available produce from ${farm.name}`, itemListElement: listings.map((listing) => ({ "@type": "Offer", name: String(listing.title), price: Number(listing.unit_price_kobo) / 100, priceCurrency: "NGN", availability: "https://schema.org/InStock", url: farmUrl })) },
      },
      { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "HarvestNearU", item: "https://www.harvestnearu.com/" }, { "@type": "ListItem", position: 2, name: "Shop produce", item: "https://www.harvestnearu.com/produce" }, { "@type": "ListItem", position: 3, name: String(farm.name), item: farmUrl }] },
    ],
  };
  return <FarmStoreTheme>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(farmStructuredData) }}/>
    <header className="topbar store-app-header"><Link className="brand brand-image" href="/" aria-label="HarvestNearU home"><Image className="brand-lockup" src="/brand/harvestnearu-opaque-seal-se2-lockup.png" width={190} height={44} alt="HarvestNearU" priority/></Link><nav className="main-nav" aria-label="Main navigation"><Link href="/">Home</Link><Link className="active" href="/produce">Shop produce</Link><Link href="/orders">My orders</Link></nav><div className="header-actions"><FarmStoreThemeToggle/><Link className="cart-button store-header-icon" href="/produce" aria-label="Open shop"><ShoppingBag size={18}/></Link><Link className="account-menu-trigger" href="/profile" aria-label="Open account"><span className="account-avatar"><UserRound size={17}/></span><ChevronDown size={15}/></Link></div></header>
    <nav className="mobile-nav store-mobile-nav" aria-label="Mobile navigation"><Link href="/"><House size={17}/><span>Home</span></Link><Link className="active" href="/produce"><ShoppingBag size={17}/><span>Shop</span></Link><Link href="/orders"><PackageCheck size={17}/><span>Orders</span></Link></nav>
    <main>
    <section className="store-hero"><Image src={hero} alt="" fill priority sizes="100vw"/><span/><div><p>VERIFIED LOCAL FARM</p><h1>{String(farm.name)}</h1><div className="store-rating"><Stars rating={rating}/><strong>{rating.toFixed(1)}</strong><em>{Number(farm.review_count)} {Number(farm.review_count)===1?"review":"reviews"}</em><BadgeCheck size={20}/></div></div></section>
    <div className="store-content">
      <section className="store-about"><div><p className="store-kicker">ABOUT THE FARM</p><h2>Fresh food, grown closer.</h2><p>{String(farm.description||`${farm.name} supplies fresh, locally grown produce to HarvestNearU customers.`)}</p><dl><div><dt><MapPin size={18}/> Address</dt><dd>{String(farm.address_text)}, {String(farm.city)}, {String(farm.state)}</dd></div><div><dt><Store size={18}/> Farm owner</dt><dd>{String(farm.first_name)} {String(farm.last_name)}</dd></div><div><dt><Truck size={18}/> Fulfilment</dt><dd>{[farm.offers_pickup&&"Farm pickup",farm.offers_delivery&&"Delivery"].filter(Boolean).join(" and ")||"Contact farm"}</dd></div></dl></div><aside><h3>Contact the farm</h3><a href={`tel:${farm.phone}`}><Phone size={17}/>{String(farm.phone)}</a>{Boolean(farm.email)&&<a href={`mailto:${farm.email}`}><Mail size={17}/>{String(farm.email)}</a>}<small>Verified on HarvestNearU {farm.verified_at?`since ${formatDate(farm.verified_at)}`:""}</small></aside></section>
      {hasMap&&<section className="store-map-section"><header><div><p className="store-kicker">FARM LOCATION</p><h2>Find {String(farm.name)}</h2><p>{String(farm.address_text)}, {String(farm.city)}, {String(farm.state)}</p></div><a href={mapUrl} target="_blank" rel="noreferrer">Open directions <ExternalLink size={16}/></a></header><iframe title={`Map showing ${String(farm.name)}`} src={mapEmbed} loading="lazy" referrerPolicy="no-referrer-when-downgrade"/><small>Map data © OpenStreetMap contributors</small></section>}
      <StoreSection kicker="AVAILABLE NOW" title={`Produce from ${farm.name}`} count={`${listings.length} active ${listings.length===1?"listing":"listings"}`}>{listings.length?<div className="store-product-grid">{listings.map(x=><ProductCard key={String(x.id)} item={x}/>)}</div>:<Empty icon={<Leaf/>} title="No produce available today" text="This farm has no active listings right now. Please check again soon."/>}</StoreSection>
      <StoreSection kicker="VERIFIED BUYER FEEDBACK" title="What customers say" count={<div className="store-rating-summary"><strong>{rating.toFixed(1)}</strong><Stars rating={rating}/><span>Based on {reviews.length} verified {reviews.length===1?"review":"reviews"}</span></div>}>{reviews.length?<div className="review-grid">{reviews.map(r=><article key={String(r.id)}><Stars rating={Number(r.rating)}/><blockquote>{r.comment?`\"${String(r.comment)}\"`:"Rating submitted without a written comment."}</blockquote><footer><strong>{String(r.first_name)} {String(r.last_name).slice(0,1)}.</strong><span>Verified buyer - {formatDate(r.created_at)}</span></footer>{Boolean(r.farmer_reply)&&<div className="farm-reply"><strong>{String(farm.name)} replied</strong><p>{String(r.farmer_reply)}</p></div>}</article>)}</div>:<Empty icon={<Star/>} title="No buyer feedback yet" text="The first verified review for this farm will appear here."/>}</StoreSection>
      {recommendations.length>0&&<StoreSection kicker="YOU MAY ALSO NEED" title="More from the same categories" count={<a className="store-all-link" href="/produce">Browse all <ChevronRight size={16}/></a>}><div className="store-product-grid">{recommendations.map(x=><ProductCard key={String(x.id)} item={x} showFarm/>)}</div></StoreSection>}
    </div></main><StoreFooter/>
  </FarmStoreTheme>;
}
function StoreSection({kicker,title,count,children}:{kicker:string;title:string;count:React.ReactNode;children:React.ReactNode}){return <section className="store-section"><header><div><p className="store-kicker">{kicker}</p><h2>{title}</h2></div>{count}</header>{children}</section>}
function Empty({icon,title,text}:{icon:React.ReactNode;title:string;text:string}){return <div className="store-empty">{icon}<h3>{title}</h3><p>{text}</p></div>}
function StoreFooter(){return <footer className="site-footer"><div className="footer-main"><div className="footer-brand"><Link className="footer-logo" href="/" aria-label="HarvestNearU home"><Image src="/brand/harvestnearu-opaque-seal-se2-lockup.png" width={190} height={44} alt="HarvestNearU"/></Link><p>Fresh Nigerian produce, fair prices, and stronger local farming communities.</p><div className="footer-contact"><a href="mailto:hello@harvestnearu.com"><Mail size={15}/> hello@harvestnearu.com</a><a href="#" aria-label="HarvestNearU social profile"><AtSign size={16}/></a></div></div><nav className="footer-links" aria-label="Marketplace links"><strong>Marketplace</strong><Link href="/">About HarvestNearU</Link><Link href="/produce">Shop produce</Link><Link href="/orders">My orders</Link><Link href="/farmer">Farmer workspace</Link></nav><nav className="footer-links" aria-label="Support links"><strong>Account &amp; support</strong><Link href="/profile">My profile</Link><Link href="/help">Help centre</Link><Link href="/delivery-areas">Delivery areas</Link><Link href="/returns-refunds">Returns &amp; refunds</Link></nav><div className="footer-newsletter"><strong>Harvest notes</strong><p>Weekly produce updates and seasonal picks from farms near you.</p><form><label><span className="sr-only">Email address</span><input type="email" placeholder="Email address"/></label><button type="button" aria-label="Subscribe"><ArrowRight size={16}/></button></form></div></div><div className="footer-bottom"><span>© 2026 HarvestNearU Nigeria</span><div><button>Privacy</button><button>Terms</button><button>Cookies</button></div><span className="footer-local"><MapPin size={12}/> Fresh Local Produce, Found Here</span></div></footer>}
