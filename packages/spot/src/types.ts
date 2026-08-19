export type SpotValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | SpotValue[]
  | { [key: string]: SpotValue };

export type SpotContext = Record<string, SpotValue>;

export type ThemeSchemaOption = {
  id: string;
  type: "text" | "colour" | "image" | "link";
  label: string;
  default: string;
};

export type ThemeSchema = {
  options: ThemeSchemaOption[];
};

export const SPOT_LIMITS = {
  maxIncludeDepth: 16,
  maxForeachItems: 250,
  maxFileSizeBytes: 512 * 1024,
} as const;

export const REQUIRED_THEME_FILES = [
  "schema.json",
  "index.html",
  "styles.css",
  "scripts.js",
  "assets/header.html",
  "assets/footer.html",
] as const;
