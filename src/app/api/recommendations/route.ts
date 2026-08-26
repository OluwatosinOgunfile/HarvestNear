import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { listingImageUrl } from "@/lib/images";
import { mobileCorsHeaders, mobileOptions } from "@/lib/mobile-cors";

export const OPTIONS=mobileOptions;

export async function GET(request:NextRequest){
  const headers=mobileCorsHeaders(request); const user=await getSessionUser();
  if(!user||!["consumer","farmer"].includes(user.role))return NextResponse.json({recommendations:[]},{headers});
  const sql=getDatabase();
  const rows=await sql`
    WITH category_interest AS (
      SELECT product.category_id,
        count(*) FILTER (WHERE source='order')*3 + count(*) FILTER (WHERE source='favourite')*2 AS weight
      FROM (
        SELECT listing.product_id,'order'::text source FROM order_items item JOIN farm_orders fo ON fo.id=item.farm_order_id JOIN orders o ON o.id=fo.order_id JOIN produce_listings listing ON listing.id=item.listing_id WHERE o.customer_id=${user.id} AND item.status NOT IN('cancelled','refunded')
        UNION ALL
        SELECT listing.product_id,'favourite' FROM favourites fav JOIN produce_listings listing ON listing.id=fav.listing_id WHERE fav.user_id=${user.id}
      ) interest JOIN products product ON product.id=interest.product_id GROUP BY product.category_id
    ), home AS (
      SELECT latitude,longitude FROM addresses WHERE user_id=${user.id} ORDER BY is_default DESC,updated_at DESC LIMIT 1
    )
    SELECT listing.id,listing.title AS name,listing.unit,listing.unit_price_kobo,listing.quantity_available-listing.quantity_reserved AS stock,
      farm.id AS farm_id,farm.name AS farmer,category.name AS category,coalesce(ci.weight,0) AS interest_score,
      coalesce(distance_km(home.latitude,home.longitude,farm.latitude,farm.longitude),9999) AS distance,
      image.url AS image
    FROM produce_listings listing JOIN farms farm ON farm.id=listing.farm_id JOIN products product ON product.id=listing.product_id
    JOIN produce_categories category ON category.id=product.category_id LEFT JOIN category_interest ci ON ci.category_id=product.category_id LEFT JOIN home ON true
    LEFT JOIN LATERAL(SELECT url FROM listing_images WHERE listing_id=listing.id ORDER BY sort_order,created_at LIMIT 1)image ON true
    WHERE listing.status='active' AND listing.quantity_available>listing.quantity_reserved AND farm.verification_status='verified'
      AND(listing.available_from IS NULL OR listing.available_from<=now()) AND(listing.available_until IS NULL OR listing.available_until>now())
      AND NOT EXISTS(SELECT 1 FROM order_items oi JOIN farm_orders fo ON fo.id=oi.farm_order_id JOIN orders o ON o.id=fo.order_id WHERE o.customer_id=${user.id} AND oi.listing_id=listing.id AND oi.status NOT IN('cancelled','refunded'))
    ORDER BY coalesce(ci.weight,0) DESC,distance,listing.quantity_sold DESC,listing.created_at DESC LIMIT 12`;
  return NextResponse.json({recommendations:rows.map(row=>({...row,image:listingImageUrl(String(row.id),row.image?String(row.image):null)})),basis:rows.some(row=>Number(row.interest_score)>0)?"your purchases and favourites":"availability near you"},{headers});
}
