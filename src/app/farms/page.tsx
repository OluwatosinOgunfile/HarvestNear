import type { Metadata } from "next";
import { BadgeCheck, ChevronRight, MapPin, PackageOpen, Star, Store, Truck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { getSessionUser } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { DEFAULT_LISTING_IMAGE, listingImageUrl } from "@/lib/images";
import { FarmStoreTheme, FarmStoreThemeToggle } from "@/components/FarmStoreTheme";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "All Verified Farms | HarvestNearU",
  description: "Browse every verified farm on HarvestNearU, see what each has ready today and what is sold out, and ask to be told when produce comes back in stock.",
  alternates: { canonical: "https://www.harvestnearu.com/farms" },
};

const DEFAULT_LATITUDE = 9.0019;
const DEFAULT_LONGITUDE = 7.4534;

function proximityLabel(distanceKm: number) {
  const distance = Math.max(0, Number(distanceKm) || 0);
  if (distance < 0.35) return "Under 5 min walk";
  const minutes = Math.max(5, Math.round((distance * 12) / 5) * 5);
  if (minutes <= 45) return `About ${minutes} min walk`;
  return `${distance < 10 ? distance.toFixed(1) : Math.round(distance)} km away`;
}

export default async function FarmDirectoryPage() {
  const sql = getDatabase();
  const session = await getSessionUser();
  let latitude = DEFAULT_LATITUDE;
  let longitude = DEFAULT_LONGITUDE;
  if (session) {
    const [address] = await sql`SELECT latitude, longitude FROM addresses WHERE user_id=${session.id} AND latitude IS NOT NULL AND longitude IS NOT NULL ORDER BY is_default DESC, updated_at DESC LIMIT 1`;
    if (address) { latitude = Number(address.latitude); longitude = Number(address.longitude); }
  }

  const farms = await sql`
    SELECT farm.id, farm.name, farm.city || ', ' || farm.state AS location, farm.offers_pickup, farm.offers_delivery,
      round(distance_km(${latitude}, ${longitude}, farm.latitude, farm.longitude)::numeric, 1) AS distance,
      coalesce((SELECT round(avg(review.rating)::numeric, 2) FROM reviews review WHERE review.farm_id=farm.id AND review.is_visible), 0) AS rating,
      (SELECT count(*)::int FROM reviews review WHERE review.farm_id=farm.id AND review.is_visible) AS review_count,
      stock.in_stock, stock.out_of_stock, stock.categories, featured.listing_id, featured.image_url
    FROM farms farm
    JOIN LATERAL (
      SELECT
        count(*) FILTER (WHERE listing.status='active' AND listing.quantity_available>listing.quantity_reserved
          AND (listing.available_from IS NULL OR listing.available_from<=now())
          AND (listing.available_until IS NULL OR listing.available_until>now()))::int AS in_stock,
        count(*) FILTER (WHERE listing.status IN ('active','sold_out') AND listing.quantity_available<=listing.quantity_reserved)::int AS out_of_stock,
        coalesce(array_agg(DISTINCT category.name) FILTER (WHERE category.name IS NOT NULL), '{}') AS categories
      FROM produce_listings listing
      JOIN products product ON product.id=listing.product_id
      JOIN produce_categories category ON category.id=product.category_id
      WHERE listing.farm_id=farm.id AND listing.status IN ('active','sold_out')
    ) stock ON true
    LEFT JOIN LATERAL (
      SELECT listing.id AS listing_id, image.url AS image_url FROM produce_listings listing
      LEFT JOIN LATERAL (SELECT url FROM listing_images WHERE listing_id=listing.id ORDER BY sort_order,created_at LIMIT 1) image ON true
      WHERE listing.farm_id=farm.id AND image.url IS NOT NULL
      ORDER BY (listing.status='active' AND listing.quantity_available>listing.quantity_reserved) DESC, listing.quantity_sold DESC, listing.created_at DESC
      LIMIT 1
    ) featured ON true
    WHERE farm.verification_status='verified'
    ORDER BY distance_km(${latitude}, ${longitude}, farm.latitude, farm.longitude), farm.name
  `;

  const stocked = farms.filter((farm) => Number(farm.in_stock) > 0).length;

  return <FarmStoreTheme>
    <div className="farm-directory">
      <header className="farm-directory-head">
        <div>
          <p className="store-kicker">EVERY VERIFIED FARM</p>
          <h1>Explore farms near you</h1>
          <p className="farm-directory-lead">{farms.length} verified {farms.length === 1 ? "farm" : "farms"}, {stocked} with produce ready today. Open a farm to buy what is in stock, or ask to be told when a sold-out harvest returns.</p>
        </div>
        <div className="farm-directory-actions"><FarmStoreThemeToggle/><Link className="farm-directory-shop" href="/produce">Shop all produce <ChevronRight size={15}/></Link></div>
      </header>

      <ol className="farm-directory-list">
        {farms.map((farm) => <li key={String(farm.id)}>
          <Link href={`/farms/${farm.id}`} className="farm-directory-card">
            <Image src={farm.image_url ? listingImageUrl(String(farm.listing_id), farm.image_url) : DEFAULT_LISTING_IMAGE} alt={`Produce from ${String(farm.name)}`} width={320} height={240} sizes="(max-width: 620px) 120px, 200px"/>
            <div>
              <h2><Store size={15}/> {String(farm.name)} <BadgeCheck size={15} aria-label="Verified farm"/></h2>
              <p className="farm-directory-meta"><MapPin size={13}/> {String(farm.location)} · {proximityLabel(Number(farm.distance))}</p>
              <p className="farm-directory-meta">
                {Number(farm.review_count) > 0
                  ? <><Star size={13} fill="currentColor"/> <strong>{Number(farm.rating).toFixed(1)}</strong> ({Number(farm.review_count)})</>
                  : <span className="farm-directory-new">NEW FARM</span>}
                {farm.offers_delivery ? <span className="farm-directory-delivers"><Truck size={13}/> Delivers</span> : null}
              </p>
              <p className="farm-directory-stock">
                <span className={Number(farm.in_stock) ? "in" : "none"}>{Number(farm.in_stock)} in stock</span>
                {Number(farm.out_of_stock) > 0 && <span className="out"><PackageOpen size={12}/> {Number(farm.out_of_stock)} out of stock</span>}
              </p>
              {Array.isArray(farm.categories) && farm.categories.length > 0 && <p className="farm-directory-categories">{farm.categories.slice(0, 4).map(String).join(" · ")}</p>}
            </div>
            <ChevronRight size={18} className="farm-directory-chevron"/>
          </Link>
        </li>)}
      </ol>
    </div>
  </FarmStoreTheme>;
}
