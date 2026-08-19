import { describe, expect, it } from "vitest";
import { validateCoupon } from "./products";

describe("store", () => {
  it("validateCoupon returns invalid for unknown code", () => {
    expect(validateCoupon("UNKNOWN", 100)).toEqual({ valid: false, discount: 0 });
  });
});
