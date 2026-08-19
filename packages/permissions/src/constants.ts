export const PERMISSION_SLUGS = [
  "forums.create",
  "forums.moderate",
  "forums.delete",
  "tickets.view",
  "tickets.manage",
  "tickets.assign",
  "news.publish",
  "news.edit",
  "news.delete",
  "store.manage",
  "store.orders",
  "store.refund",
  "settings.manage",
  "theme.edit",
  "users.manage",
  "analytics.view",
  "applications.review",
  "votes.manage",
  "developer.api",
  "developer.webhooks",
  "admin.access",
] as const;

export type PermissionSlug = (typeof PERMISSION_SLUGS)[number];

export const ROLE_SLUGS = ["owner", "admin", "moderator", "support", "user"] as const;
export type RoleSlug = (typeof ROLE_SLUGS)[number];

export const STAFF_ROLES: RoleSlug[] = ["owner", "admin", "moderator", "support"];
