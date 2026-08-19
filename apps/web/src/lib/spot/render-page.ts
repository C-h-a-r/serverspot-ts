import {
  buildCspHeader,
  buildCssVariables,
  loadThemePack,
  loadThemeTemplate,
  renderSpotPage,
  type SpotContext,
} from "@serverspot/spot";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getActiveThemeSlug,
  getMergedThemeConfig,
  getSiteContext,
} from "@/lib/theme/config";
import { getThemesDir } from "@/lib/paths";

export type SpotPageOptions = {
  template: string;
  extraContext?: SpotContext;
  requireAuth?: boolean;
};

export async function renderPublicSpotPage(options: SpotPageOptions) {
  if (options.requireAuth) {
    const session = await getSession();
    if (!session) {
      return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL));
    }
  }

  const themeSlug = await getActiveThemeSlug();
  const site = await getSiteContext();
  const configOverrides = await getMergedThemeConfig(themeSlug);
  const session = await getSession();

  const context: SpotContext = {
    site,
    user: session
      ? {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          avatar: session.user.image ?? "",
        }
      : null,
    ...options.extraContext,
  };

  const { html, cssVariables, config } = renderSpotPage({
    themesDir: getThemesDir(),
    themeSlug,
    template: options.template,
    context,
    configOverrides,
  });

  const theme = loadThemePack(getThemesDir(), themeSlug);
  const styles = loadThemeTemplate(theme, "styles.css");

  const fullHtml = injectAssets(html, styles, cssVariables, themeSlug);

  return new NextResponse(fullHtml, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": buildCspHeader(`/theme-runtime/${themeSlug}/scripts.js`),
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function injectAssets(
  html: string,
  styles: string,
  cssVariables: string,
  themeSlug: string,
): string {
  const styleBlock = `<style>${cssVariables}\n${styles}</style>`;
  const favicon = `<link rel="icon" href="/uploads/site-favicon">`;

  let result = html;
  if (result.includes("</head>")) {
    result = result.replace("</head>", `${favicon}\n${styleBlock}\n</head>`);
  } else {
    result = `${favicon}${styleBlock}${result}`;
  }

  if (!result.includes("/theme-runtime/")) {
    result = result.replace(
      "</body>",
      `<script src="/theme-runtime/${themeSlug}/scripts.js"></script></body>`,
    );
  }

  return result;
}
