import { renderPublicSpotPage } from "@/lib/spot/render-page";

export async function GET() {
  return renderPublicSpotPage({ template: "index.html" });
}
