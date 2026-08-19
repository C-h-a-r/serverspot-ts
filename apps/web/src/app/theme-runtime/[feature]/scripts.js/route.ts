import { join } from "node:path";
import { readThemeFile, resolveThemeRoot } from "@serverspot/spot";
import { NextResponse } from "next/server";
import { getThemesDir } from "@/lib/paths";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ feature: string }> },
) {
  const { feature } = await params;
  const themeSlug = feature === "default" ? "default" : feature;
  const rootDir = resolveThemeRoot(getThemesDir(), themeSlug);

  try {
    const scriptPath = "scripts.js";
    const content = readThemeFile(join(rootDir, scriptPath), rootDir);

    return new NextResponse(content, {
      headers: {
        "Content-Type": "application/javascript; charset=utf-8",
        "Content-Security-Policy": "default-src 'none'",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch {
    return new NextResponse("// script not found", {
      status: 404,
      headers: { "Content-Type": "application/javascript; charset=utf-8" },
    });
  }
}
