import { NextRequest, NextResponse } from "next/server";

import { confirmPaystackPayment, verifyPaystackTransaction } from "@/lib/paystack";

export async function GET(request: NextRequest) {
  const reference = request.nextUrl.searchParams.get("reference") || request.nextUrl.searchParams.get("trxref");
  const destination = new URL("/orders", process.env.APP_URL || request.nextUrl.origin);
  if (!reference) {
    destination.searchParams.set("payment", "invalid");
    return NextResponse.redirect(destination);
  }
  try {
    const transaction = await verifyPaystackTransaction(reference);
    const result = await confirmPaystackPayment(transaction);
    destination.searchParams.set("payment", "success");
    destination.searchParams.set("order", result.orderNumber);
  } catch (error) {
    console.error("Paystack callback verification failed", error);
    destination.searchParams.set("payment", "failed");
  }
  return NextResponse.redirect(destination);
}
