import { describe, expect, it } from "vitest";
import { parseGatewayMessage, serverHelloSchema } from "./protocol";

describe("game protocol", () => {
  it("parses SERVER_HELLO", () => {
    const msg = parseGatewayMessage({
      type: "SERVER_HELLO",
      apiKey: "ssg_" + "a".repeat(48),
      serverName: "Survival",
    });
    expect(msg.type).toBe("SERVER_HELLO");
    expect(serverHelloSchema.parse(msg).serverName).toBe("Survival");
  });

  it("parses STATS_PUSH", () => {
    const msg = parseGatewayMessage({
      type: "STATS_PUSH",
      boardSlug: "top-players",
      entries: [{ playerName: "Steve", value: 100 }],
    });
    expect(msg.type).toBe("STATS_PUSH");
    if (msg.type === "STATS_PUSH") {
      expect(msg.entries[0]?.playerName).toBe("Steve");
    }
  });
});
