import { env } from "@serverspot/config/env";
import { createDb } from "@serverspot/db";
import { listForms } from "@serverspot/applications";
import { requireModule } from "@/lib/modules";
import { renderPublicSpotPage } from "@/lib/spot/render-page";

export async function GET(request: Request) {
  await requireModule("applications");
  const url = new URL(request.url);
  const db = createDb(env.DATABASE_URL);
  const forms = await listForms(db, true);

  return renderPublicSpotPage({
    template: "applications/index.html",
    extraContext: {
      submitted: url.searchParams.get("submitted") === "1",
      forms: forms.map((f) => ({
        name: f.name,
        slug: f.slug,
        description: f.description ?? "",
        status: f.status,
      })),
    },
  });
}
