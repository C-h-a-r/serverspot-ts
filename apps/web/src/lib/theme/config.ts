import { env } from "@serverspot/config/env";
import { createDb } from "@serverspot/db";
import { globalSettings, themeConfigValues, themePacks } from "@serverspot/db/schema";
import { getDefaultConfig, loadThemePack, mergeConfig } from "@serverspot/spot";
import { eq } from "drizzle-orm";
import { ACTIVE_THEME_SLUG, getThemesDir } from "@/lib/paths";

export type SiteContext = {
  name: string;
  tagline: string;
  logoUrl: string;
  faviconUrl: string;
};

export async function getActiveThemeSlug(): Promise<string> {
  const db = createDb(env.DATABASE_URL);
  const active = await db.query.themePacks.findFirst({
    where: eq(themePacks.isActive, true),
  });
  return active?.slug ?? ACTIVE_THEME_SLUG;
}

export async function getThemeConfigOverrides(
  themeSlug: string,
): Promise<Record<string, string>> {
  const db = createDb(env.DATABASE_URL);
  const pack = await db.query.themePacks.findFirst({
    where: eq(themePacks.slug, themeSlug),
  });
  if (!pack) return {};

  const rows = await db
    .select()
    .from(themeConfigValues)
    .where(eq(themeConfigValues.themePackId, pack.id));

  const overrides: Record<string, string> = {};
  for (const row of rows) {
    overrides[row.optionId] = row.value;
  }
  return overrides;
}

export async function getSiteContext(): Promise<SiteContext> {
  const db = createDb(env.DATABASE_URL);
  const row = await db.query.globalSettings.findFirst({
    where: eq(globalSettings.key, "site"),
  });
  const value = (row?.value ?? {}) as Record<string, string>;

  return {
    name: value.name ?? "ServerSpot",
    tagline: value.tagline ?? "Everything you need to run your game server website",
    logoUrl: value.logoUrl ?? "/uploads/site-logo",
    faviconUrl: value.faviconUrl ?? "/uploads/site-favicon",
  };
}

export async function loadThemeDefaults(themeSlug: string): Promise<Record<string, string>> {
  const theme = loadThemePack(getThemesDir(), themeSlug);
  return getDefaultConfig(theme.schema);
}

export async function getMergedThemeConfig(
  themeSlug: string,
): Promise<Record<string, string>> {
  const defaults = await loadThemeDefaults(themeSlug);
  const overrides = await getThemeConfigOverrides(themeSlug);
  return mergeConfig(defaults, overrides);
}

export async function saveThemeConfigValue(
  themeSlug: string,
  optionId: string,
  value: string,
): Promise<void> {
  const db = createDb(env.DATABASE_URL);
  const pack = await db.query.themePacks.findFirst({
    where: eq(themePacks.slug, themeSlug),
  });
  if (!pack) throw new Error("Theme pack not found");

  await db
    .insert(themeConfigValues)
    .values({ themePackId: pack.id, optionId, value })
    .onConflictDoUpdate({
      target: [themeConfigValues.themePackId, themeConfigValues.optionId],
      set: { value, updatedAt: new Date() },
    });
}
