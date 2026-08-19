import { env } from "@serverspot/config/env";
import { createDb } from "@serverspot/db";
import { logApiKeyUsage, verifyApiKey } from "@serverspot/developer";
import { listOrders, listProducts } from "@serverspot/store";
import { NextResponse } from "next/server";

async function authenticateApiRequest(request: Request) {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing API key" }, { status: 401 });
  }

  const key = auth.slice(7);
  const db = createDb(env.DATABASE_URL);
  const apiKey = await verifyApiKey(db, key);

  if (!apiKey) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  return { db, apiKey };
}

export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request);
  if (auth instanceof NextResponse) return auth;

  const { db, apiKey } = auth;
  const url = new URL(request.url);
  const resource = url.pathname.replace(/^\/api\/v1\/?/, "").split("/")[0];

  if (resource === "products") {
    const products = await listProducts(db);
    await logApiKeyUsage(db, apiKey.id, url.pathname, "GET", 200);
    return NextResponse.json({ data: products });
  }

  if (resource === "orders") {
    const orders = await listOrders(db);
    await logApiKeyUsage(db, apiKey.id, url.pathname, "GET", 200);
    return NextResponse.json({ data: orders });
  }

  return NextResponse.json(
    { error: "Not found", endpoints: ["GET /api/v1/products", "GET /api/v1/orders"] },
    { status: 404 },
  );
}
