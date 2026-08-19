import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, normalize, relative, resolve } from "node:path";
import type { ThemeSchema } from "./types";
import { REQUIRED_THEME_FILES, SPOT_LIMITS } from "./types";

export type ThemePack = {
  slug: string;
  rootDir: string;
  schema: ThemeSchema;
};

export function resolveThemeRoot(themesDir: string, slug: string): string {
  const root = resolve(themesDir, slug);
  const normalized = normalize(root);
  if (!normalized.startsWith(normalize(resolve(themesDir)))) {
    throw new Error("Invalid theme path");
  }
  return normalized;
}

export function loadThemePack(themesDir: string, slug: string): ThemePack {
  const rootDir = resolveThemeRoot(themesDir, slug);
  if (!existsSync(rootDir)) {
    throw new Error(`Theme pack not found: ${slug}`);
  }

  const schemaPath = join(rootDir, "schema.json");
  const schemaRaw = readThemeFile(schemaPath, rootDir);
  const schema = JSON.parse(schemaRaw) as ThemeSchema;

  return { slug, rootDir, schema };
}

export function readThemeFile(filePath: string, themeRoot: string): string {
  const normalized = normalize(resolve(filePath));
  const rel = relative(themeRoot, normalized);
  if (rel.startsWith("..") || rel.includes("..")) {
    throw new Error("Path traversal detected");
  }

  if (!existsSync(normalized)) {
    throw new Error(`Theme file not found: ${rel}`);
  }

  const stat = statSync(normalized);
  if (stat.size > SPOT_LIMITS.maxFileSizeBytes) {
    throw new Error(`Theme file exceeds max size: ${rel}`);
  }

  return readFileSync(normalized, "utf-8");
}

export function loadThemeTemplate(theme: ThemePack, templatePath: string): string {
  const fullPath = join(theme.rootDir, templatePath);
  return readThemeFile(fullPath, theme.rootDir);
}

export function listThemeFiles(themeRoot: string, subPath = ""): string[] {
  const dir = join(themeRoot, subPath);
  const normalized = normalize(dir);
  if (!normalized.startsWith(normalize(themeRoot))) {
    throw new Error("Path traversal detected");
  }

  if (!existsSync(normalized)) return [];

  const entries = readdirSync(normalized, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const rel = subPath ? `${subPath}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...listThemeFiles(themeRoot, rel));
    } else {
      files.push(rel.replace(/\\/g, "/"));
    }
  }

  return files.sort();
}

export function isRequiredThemeFile(path: string): boolean {
  return (REQUIRED_THEME_FILES as readonly string[]).includes(path);
}

export function resolvePartialPath(theme: ThemePack, partialPath: string): string {
  const normalized = partialPath.replace(/^\//, "").replace(/\.html$/, "") + ".html";
  const candidates = [
    normalized,
    join("assets", normalized).replace(/\\/g, "/"),
    join("assets/partials", normalized).replace(/\\/g, "/"),
  ];

  for (const candidate of candidates) {
    const full = join(theme.rootDir, candidate);
    if (existsSync(full)) return candidate.replace(/\\/g, "/");
  }

  throw new Error(`Partial not found: ${partialPath}`);
}

export function getDefaultConfig(schema: ThemeSchema): Record<string, string> {
  const config: Record<string, string> = {};
  for (const option of schema.options) {
    config[option.id] = option.default;
  }
  return config;
}

export function mergeConfig(
  defaults: Record<string, string>,
  overrides: Record<string, string>,
): Record<string, string> {
  return { ...defaults, ...overrides };
}
