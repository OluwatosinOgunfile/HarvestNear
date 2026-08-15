import { NextResponse } from "next/server";

const LOCAL_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1):(8081|8082|19006)$/;

export function mobileCorsHeaders(request: Request) {
  const origin = request.headers.get("origin") || "";
  const configured = (process.env.MOBILE_WEB_ORIGINS || "").split(",").map((value) => value.trim()).filter(Boolean);
  const headers = new Headers();
  if (!LOCAL_ORIGIN.test(origin) && !configured.includes(origin)) return headers;
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Credentials", "true");
  headers.set("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, DELETE, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Accept, Authorization, Content-Type, X-HarvestNearU-Client");
  headers.set("Vary", "Origin");
  return headers;
}

export function isMobileClient(request: Request) {
  return request.headers.get("x-harvestnearu-client") === "mobile";
}

export function mobileOptions(request: Request) {
  return new NextResponse(null, { status: 204, headers: mobileCorsHeaders(request) });
}
