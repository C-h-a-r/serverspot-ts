import type { Database } from "@serverspot/db";
import { permissions, rolePermissions, userRoles } from "@serverspot/db/schema";
import { eq, inArray } from "drizzle-orm";
import type { PermissionSlug } from "./constants";

export async function getUserPermissions(
  db: Database,
  userId: string,
): Promise<Set<string>> {
  const userRoleRows = await db
    .select({ roleId: userRoles.roleId })
    .from(userRoles)
    .where(eq(userRoles.userId, userId));

  if (userRoleRows.length === 0) {
    return new Set();
  }

  const roleIds = userRoleRows.map((r) => r.roleId);
  const permRows = await db
    .select({ slug: permissions.slug })
    .from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(inArray(rolePermissions.roleId, roleIds));

  return new Set(permRows.map((p) => p.slug));
}

export function hasPermission(
  userPermissions: Set<string>,
  permission: PermissionSlug,
): boolean {
  return userPermissions.has(permission);
}

export function hasAnyPermission(
  userPermissions: Set<string>,
  required: PermissionSlug[],
): boolean {
  return required.some((p) => userPermissions.has(p));
}

export function hasAllPermissions(
  userPermissions: Set<string>,
  required: PermissionSlug[],
): boolean {
  return required.every((p) => userPermissions.has(p));
}

export class PermissionError extends Error {
  constructor(message = "Insufficient permissions") {
    super(message);
    this.name = "PermissionError";
  }
}

export function requirePermission(
  userPermissions: Set<string>,
  permission: PermissionSlug,
): void {
  if (!hasPermission(userPermissions, permission)) {
    throw new PermissionError(`Missing permission: ${permission}`);
  }
}

export function requireAnyPermission(
  userPermissions: Set<string>,
  required: PermissionSlug[],
): void {
  if (!hasAnyPermission(userPermissions, required)) {
    throw new PermissionError(`Missing one of: ${required.join(", ")}`);
  }
}
