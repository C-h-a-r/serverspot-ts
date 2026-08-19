import { env } from "@serverspot/config/env";
import { createDb } from "@serverspot/db";
import { formatPrice, listProducts } from "@serverspot/store";
import { requireModule } from "@/lib/modules";
import { renderPublicSpotPage } from "@/lib/spot/render-page";

export async function GET() {
  await requireModule("store");
  const db = createDb(env.DATABASE_URL);
  const products = await listProducts(db, { visibleOnly: true });

  return renderPublicSpotPage({
    template: "store/index.html",
    extraContext: {
      products: products.map((p) => ({
        name: p.name,
        slug: p.slug,
        price: formatPrice(p.salePrice ?? p.price, p.currency),
        description: p.description ?? "",
        featured: p.featured,
      })),
    },
  });
}
