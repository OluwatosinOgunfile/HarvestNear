import { NextRequest, NextResponse } from "next/server";

const LOCAL_MOBILE_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1):(8081|8082|19006)$/;

function isAllowed(origin: string) {
  const configured = (process.env.MOBILE_WEB_ORIGINS || "").split(",").map((value) => value.trim()).filter(Boolean);
  return LOCAL_MOBILE_ORIGIN.test(origin) || configured.includes(origin);
}

export function proxy(request: NextRequest) {
  const origin = request.headers.get("origin") || "";
  if (!isAllowed(origin)) return NextResponse.next();

  const response = request.method === "OPTIONS" ? new NextResponse(null, { status: 204 }) : NextResponse.next();
  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, DELETE, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Accept, Authorization, Content-Type, X-HarvestNearU-Client");
  response.headers.set("Vary", "Origin");
  return response;
}

export const config = { matcher: "/api/:path*" };
