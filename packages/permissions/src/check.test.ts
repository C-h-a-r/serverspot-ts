import { describe, expect, it } from "vitest";
import {
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  requirePermission,
  PermissionError,
} from "./check";

describe("permissions", () => {
  const perms = new Set(["admin.access", "store.manage"]);

  it("hasPermission returns true for granted permission", () => {
    expect(hasPermission(perms, "admin.access")).toBe(true);
  });

  it("hasPermission returns false for missing permission", () => {
    expect(hasPermission(perms, "theme.edit")).toBe(false);
  });

  it("hasAnyPermission checks multiple", () => {
    expect(hasAnyPermission(perms, ["theme.edit", "store.manage"])).toBe(true);
    expect(hasAnyPermission(perms, ["theme.edit", "users.manage"])).toBe(false);
  });

  it("hasAllPermissions checks all required", () => {
    expect(hasAllPermissions(perms, ["admin.access", "store.manage"])).toBe(true);
    expect(hasAllPermissions(perms, ["admin.access", "theme.edit"])).toBe(false);
  });

  it("requirePermission throws on missing", () => {
    expect(() => requirePermission(perms, "admin.access")).not.toThrow();
    expect(() => requirePermission(perms, "theme.edit")).toThrow(PermissionError);
  });
});
