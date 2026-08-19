export const MODULES = [
  "store",
  "forum",
  "support",
  "blog",
  "players",
  "leaderboards",
  "votes",
  "applications",
  "analytics",
] as const;

export type ModuleSlug = (typeof MODULES)[number];

export const DEFAULT_MODULE_STATE: Record<ModuleSlug, boolean> = {
  store: true,
  forum: true,
  support: true,
  blog: true,
  players: true,
  leaderboards: true,
  votes: true,
  applications: true,
  analytics: true,
};

export const MODULE_LABELS: Record<ModuleSlug, string> = {
  store: "Store",
  forum: "Forum",
  support: "Support",
  blog: "Blog",
  players: "Players",
  leaderboards: "Leaderboards",
  votes: "Vote Rewards",
  applications: "Applications",
  analytics: "Analytics",
};
