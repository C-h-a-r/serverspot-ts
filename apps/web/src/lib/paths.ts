import { resolve } from "node:path";

export function getThemesDir(): string {
  return resolve(process.cwd(), "../../themes");
}

export function getUploadsDir(): string {
  return process.env.UPLOAD_DIR ?? resolve(process.cwd(), "../../uploads");
}

export const ACTIVE_THEME_SLUG = "default";
