export {
  buildCspHeader,
  buildCssVariables,
  renderSpotTemplate,
  type RenderOptions,
} from "./renderer";
export { parseSpotTemplate, stripSpotDirectives } from "./parser";
export {
  evaluateExpression,
  escapeHtml,
  isTruthy,
  sanitizeUrl,
} from "./expressions";
export {
  getDefaultConfig,
  isRequiredThemeFile,
  listThemeFiles,
  loadThemePack,
  loadThemeTemplate,
  mergeConfig,
  readThemeFile,
  resolvePartialPath,
  resolveThemeRoot,
  type ThemePack,
} from "./loader";
export type { SpotContext, SpotValue, ThemeSchema, ThemeSchemaOption } from "./types";
export { REQUIRED_THEME_FILES, SPOT_LIMITS } from "./types";
export type { SpotDocument, SpotNode } from "./ast";

import { getDefaultConfig, loadThemePack, loadThemeTemplate, mergeConfig, resolvePartialPath } from "./loader";
import { buildCssVariables, renderSpotTemplate } from "./renderer";
import type { SpotContext } from "./types";

export type RenderPageOptions = {
  themesDir: string;
  themeSlug: string;
  template: string;
  context: SpotContext;
  configOverrides?: Record<string, string>;
};

export type RenderPageResult = {
  html: string;
  cssVariables: string;
  config: Record<string, string>;
};

export function renderSpotPage(options: RenderPageOptions): RenderPageResult {
  const theme = loadThemePack(options.themesDir, options.themeSlug);
  const defaults = getDefaultConfig(theme.schema);
  const config = mergeConfig(defaults, options.configOverrides ?? {});

  const context: SpotContext = {
    ...options.context,
    config,
  };

  const source = loadThemeTemplate(theme, options.template);
  const html = renderSpotTemplate(source, {
    context,
    loadPartial: (path) => {
      const resolved = resolvePartialPath(theme, path);
      return loadThemeTemplate(theme, resolved);
    },
  });

  return {
    html,
    cssVariables: buildCssVariables(config),
    config,
  };
}
