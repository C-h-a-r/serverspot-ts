import { z } from "zod";

export const serverHelloSchema = z.object({
  type: z.literal("SERVER_HELLO"),
  apiKey: z.string().min(16),
  serverName: z.string().min(1),
  game: z.string().default("minecraft"),
  maxPlayers: z.number().int().optional(),
});

export const serverHeartbeatSchema = z.object({
  type: z.literal("SERVER_HEARTBEAT"),
  playerCount: z.number().int().default(0),
  maxPlayers: z.number().int().optional(),
});

export const playerVerifySchema = z.object({
  type: z.literal("PLAYER_VERIFY"),
  code: z.string().min(4).max(12),
  playerUuid: z.string().min(1),
  username: z.string().min(1),
});

export const commandResultSchema = z.object({
  type: z.literal("COMMAND_RESULT"),
  commandId: z.string().uuid(),
  success: z.boolean(),
  output: z.string().optional(),
  orderId: z.string().uuid().optional(),
});

export const statsPushSchema = z.object({
  type: z.literal("STATS_PUSH"),
  boardSlug: z.string(),
  entries: z.array(
    z.object({
      playerUuid: z.string().optional(),
      playerName: z.string(),
      value: z.number(),
    }),
  ),
});

export const playerOnlineSchema = z.object({
  type: z.literal("PLAYER_ONLINE"),
  count: z.number().int(),
  max: z.number().int().optional(),
});

export const commandExecuteSchema = z.object({
  type: z.literal("COMMAND_EXECUTE"),
  commandId: z.string().uuid(),
  commands: z.array(z.string()),
  playerUuid: z.string().optional(),
  username: z.string().optional(),
  orderId: z.string().uuid().optional(),
});

export const gatewayMessageSchema = z.discriminatedUnion("type", [
  serverHelloSchema,
  serverHeartbeatSchema,
  playerVerifySchema,
  commandResultSchema,
  statsPushSchema,
  playerOnlineSchema,
]);

export type GatewayInboundMessage = z.infer<typeof gatewayMessageSchema>;
export type GatewayOutboundMessage =
  | z.infer<typeof commandExecuteSchema>
  | { type: "SERVER_HELLO_ACK"; serverId: string; message: string }
  | { type: "LINK_CODE_ACK"; code: string; expiresAt: string }
  | { type: "ERROR"; message: string };

export function parseGatewayMessage(raw: unknown): GatewayInboundMessage {
  return gatewayMessageSchema.parse(raw);
}

export function serializeGatewayMessage(message: GatewayOutboundMessage): string {
  return JSON.stringify(message);
}
