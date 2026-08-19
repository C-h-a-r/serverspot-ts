import { env } from "@serverspot/config/env";
import { createDb } from "@serverspot/db";
import { formatPrice, getProductBySlug } from "@serverspot/store";
import { notFound } from "next/navigation";
import { requireModule } from "@/lib/modules";
import { renderPublicSpotPage } from "@/lib/spot/render-page";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  await requireModule("store");
  const { slug } = await params;
  const db = createDb(env.DATABASE_URL);
  const product = await getProductBySlug(db, slug);
  if (!product || !product.visible) notFound();

  return renderPublicSpotPage({
    template: "store/product.html",
    extraContext: {
      item: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: formatPrice(product.salePrice ?? product.price, product.currency),
        description: product.description ?? "",
        type: product.type,
      },
    },
  });
}
