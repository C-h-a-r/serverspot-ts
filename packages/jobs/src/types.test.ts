import { describe, expect, it } from "vitest";
import { getRetryDelay } from "./types";

describe("jobs retry policy", () => {
  it("uses exponential backoff delays", () => {
    expect(getRetryDelay(0)).toBe(60_000);
    expect(getRetryDelay(1)).toBe(300_000);
    expect(getRetryDelay(4)).toBe(14_400_000);
  });
});
