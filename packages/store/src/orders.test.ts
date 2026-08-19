import { describe, expect, it } from "vitest";
import { priceToCents } from "./orders";

describe("store orders", () => {
  it("converts price strings to cents", () => {
    expect(priceToCents("9.99")).toBe(999);
    expect(priceToCents("10.00")).toBe(1000);
    expect(priceToCents("0.50")).toBe(50);
  });
});
