import { describe, expect, it } from "vitest";
import { isValidMinecraftUsername, formatVoteRewardCommands } from "./commands";

describe("minecraft helpers", () => {
  it("validates usernames", () => {
    expect(isValidMinecraftUsername("Steve")).toBe(true);
    expect(isValidMinecraftUsername("ab")).toBe(false);
  });

  it("substitutes player in reward commands", () => {
    expect(formatVoteRewardCommands("Steve", ["give {player} diamond 1"])).toEqual([
      "give Steve diamond 1",
    ]);
  });
});
