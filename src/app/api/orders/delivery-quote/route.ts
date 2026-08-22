import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { doorstepDeliveryFeeKobo } from "@/lib/delivery";

type QuoteItem = { listingId?: string };

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || !["consumer", "farmer"].includes(user.role)) return NextResponse.json({ error: "Sign in to calculate delivery" }, { status: 401 });
  const body = await request.json().catch(() => null) as { items?: QuoteItem[] } | null;
  const listingIds = [...new Set((body?.items || []).map((item) => item.listingId).filter((id): id is string => Boolean(id && /^[0-9a-f-]{36}$/i.test(id))))];
  if (!listingIds.length) return NextResponse.json({ error: "Add produce before calculating delivery" }, { status: 400 });
  const sql = getDatabase();
  const [address] = await sql`SELECT line1, city, state, landmark, latitude, longitude FROM addresses WHERE user_id=${user.id} ORDER BY is_default DESC, created_at DESC LIMIT 1`;
  if (!address) return NextResponse.json({ error: "Add a saved delivery location to use doorstep delivery" }, { status: 409 });
  const farms = await sql`SELECT DISTINCT farm.id, farm.name, farm.delivery_radius_km,
    6371 * 2 * asin(sqrt(power(sin(radians(farm.latitude-${address.latitude})/2),2)+cos(radians(${address.latitude}))*cos(radians(farm.latitude))*power(sin(radians(farm.longitude-${address.longitude})/2),2))) AS distance_km
    FROM produce_listings listing JOIN farms farm ON farm.id=listing.farm_id WHERE listing.id=ANY(${listingIds}::uuid[])`;
  if (!farms.length) return NextResponse.json({ error: "Could not calculate delivery for these items" }, { status: 404 });
  const outside = farms.find((farm) => !farm.delivery_radius_km || Number(farm.distance_km) > Number(farm.delivery_radius_km));
  const distanceKm = Math.max(...farms.map((farm) => Number(farm.distance_km)));
  const outsideDistanceKm = outside ? Math.round(Number(outside.distance_km) * 10) / 10 : null;
  const outsideRadiusKm = outside?.delivery_radius_km ? Math.round(Number(outside.delivery_radius_km) * 10) / 10 : null;
  const unavailableReason = outside
    ? outsideRadiusKm
      ? `${outside.name} is ${outsideDistanceKm} km from your saved location, outside its ${outsideRadiusKm} km doorstep delivery radius.`
      : `${outside.name} has not configured a doorstep delivery radius.`
    : null;
  return NextResponse.json({
    doorstep: { available: !outside, feeKobo: outside ? null : doorstepDeliveryFeeKobo(distanceKm), distanceKm: Math.round(distanceKm * 10) / 10, radiusKm: outsideRadiusKm, unavailableReason },
    farmPickup: { available: true, feeKobo: 0 },
    farmerDelivery: { available: true, feeKobo: 0, note: "Delivery timing and any farmer delivery charge are agreed directly with the farmer." },
    address: { line1: address.line1, city: address.city, state: address.state, landmark: address.landmark },
  });
}
