import { unlinkSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  isRequiredThemeFile,
  listThemeFiles,
  loadThemePack,
  readThemeFile,
  resolveThemeRoot,
} from "@serverspot/spot";
import { getThemesDir } from "@/lib/paths";

export function getThemeEditorState(themeSlug: string) {
  const rootDir = resolveThemeRoot(getThemesDir(), themeSlug);
  const theme = loadThemePack(getThemesDir(), themeSlug);
  const files = listThemeFiles(rootDir);

  return {
    slug: themeSlug,
    schema: theme.schema,
    files,
    requiredFiles: files.filter(isRequiredThemeFile),
  };
}

export function readThemeEditorFile(themeSlug: string, filePath: string): string {
  const rootDir = resolveThemeRoot(getThemesDir(), themeSlug);
  return readThemeFile(join(rootDir, filePath), rootDir);
}

export function writeThemeEditorFile(
  themeSlug: string,
  filePath: string,
  content: string,
): void {
  const rootDir = resolveThemeRoot(getThemesDir(), themeSlug);
  const normalized = filePath.replace(/\\/g, "/").replace(/^\//, "");

  if (normalized.includes("..")) {
    throw new Error("Invalid file path");
  }

  if (isRequiredThemeFile(normalized) && content.trim().length === 0) {
    throw new Error("Required files cannot be empty");
  }

  const fullPath = join(rootDir, normalized);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf-8");
}

export function deleteThemeEditorFile(themeSlug: string, filePath: string): void {
  const normalized = filePath.replace(/\\/g, "/").replace(/^\//, "");
  if (isRequiredThemeFile(normalized)) {
    throw new Error("Required files cannot be deleted");
  }
  const rootDir = resolveThemeRoot(getThemesDir(), themeSlug);
  const fullPath = join(rootDir, normalized);
  if (existsSync(fullPath)) {
    unlinkSync(fullPath);
  }
}
