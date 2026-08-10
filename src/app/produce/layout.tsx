import { getDatabase } from "@/lib/db";
import { DEFAULT_LISTING_IMAGE, listingImageUrl } from "@/lib/images";

export const dynamic = "force-dynamic";

export default async function ProduceLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  let listings: Record<string, unknown>[] = [];
  try {
    const sql = getDatabase();
    listings = await sql`
      SELECT listing.id, listing.title, listing.unit, listing.unit_price_kobo, farm.id AS farm_id, farm.name AS farm_name,
        coalesce((SELECT round(avg(review.rating)::numeric, 2) FROM reviews review WHERE review.farm_id = farm.id AND review.is_visible), 0) AS rating,
        (SELECT count(*)::int FROM reviews review WHERE review.farm_id = farm.id AND review.is_visible) AS review_count,
        image.url AS image_url
      FROM produce_listings listing
      JOIN farms farm ON farm.id = listing.farm_id
      LEFT JOIN LATERAL (SELECT url FROM listing_images WHERE listing_id = listing.id ORDER BY sort_order, created_at LIMIT 1) image ON true
      WHERE listing.status = 'active'
        AND listing.quantity_available > listing.quantity_reserved
        AND (listing.available_from IS NULL OR listing.available_from <= now())
        AND (listing.available_until IS NULL OR listing.available_until > now())
        AND farm.verification_status = 'verified'
      ORDER BY listing.created_at DESC
      LIMIT 40
    `;
  } catch {
    // The marketplace API remains the source of truth when optional SEO data is unavailable.
  }
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Fresh produce available on HarvestNearU",
    numberOfItems: listings.length,
    itemListElement: listings.map((listing, index) => {
      const image = listing.image_url ? listingImageUrl(String(listing.id), listing.image_url) : DEFAULT_LISTING_IMAGE;
      const reviewCount = Number(listing.review_count);
      return {
        "@type": "ListItem",
        position: index + 1,
        url: `https://www.harvestnearu.com/farms/${listing.farm_id}`,
        item: {
          "@type": "Product",
          name: String(listing.title),
          image: `https://www.harvestnearu.com${image}`,
          brand: { "@type": "Brand", name: String(listing.farm_name) },
          offers: { "@type": "Offer", price: Number(listing.unit_price_kobo) / 100, priceCurrency: "NGN", availability: "https://schema.org/InStock", url: `https://www.harvestnearu.com/farms/${listing.farm_id}` },
          aggregateRating: reviewCount > 0 ? { "@type": "AggregateRating", ratingValue: Number(listing.rating), reviewCount, bestRating: 5, worstRating: 1 } : undefined,
        },
      };
    }),
  };
  return <>{children}<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }}/></>;
}
