import WebSocket from "ws";
import { z } from "zod";

const inboundSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("SERVER_HELLO_ACK"), serverId: z.string(), message: z.string() }),
  z.object({ type: z.literal("LINK_CODE_ACK"), code: z.string(), expiresAt: z.string() }),
  z.object({ type: z.literal("COMMAND_EXECUTE"), commandId: z.string(), commands: z.array(z.string()) }),
  z.object({ type: z.literal("ERROR"), message: z.string() }),
]);

export type GatewayClientOptions = {
  url: string;
  apiKey: string;
  serverName: string;
  game?: string;
  maxPlayers?: number;
  onCommand?: (commandId: string, commands: string[]) => void | Promise<void>;
  onLinkCode?: (code: string, expiresAt: string) => void;
};

export class GameGatewayClient {
  private ws: WebSocket | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private opts: GatewayClientOptions) {}

  connect() {
    this.ws = new WebSocket(this.opts.url);

    this.ws.on("open", () => {
      this.send({
        type: "SERVER_HELLO",
        apiKey: this.opts.apiKey,
        serverName: this.opts.serverName,
        game: this.opts.game ?? "minecraft",
        maxPlayers: this.opts.maxPlayers,
      });

      this.heartbeatTimer = setInterval(() => {
        this.send({ type: "SERVER_HEARTBEAT", playerCount: 0 });
      }, 30_000);
    });

    this.ws.on("message", async (data) => {
      const parsed = inboundSchema.parse(JSON.parse(data.toString()));

      if (parsed.type === "COMMAND_EXECUTE") {
        await this.opts.onCommand?.(parsed.commandId, parsed.commands);
      }

      if (parsed.type === "LINK_CODE_ACK") {
        this.opts.onLinkCode?.(parsed.code, parsed.expiresAt);
      }
    });

    this.ws.on("close", () => {
      if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    });
  }

  sendPlayerVerify(code: string, playerUuid: string, username: string) {
    this.send({ type: "PLAYER_VERIFY", code, playerUuid, username });
  }

  sendStatsPush(boardSlug: string, entries: { playerName: string; value: number; playerUuid?: string }[]) {
    this.send({ type: "STATS_PUSH", boardSlug, entries });
  }

  sendCommandResult(commandId: string, success: boolean, output?: string) {
    this.send({ type: "COMMAND_RESULT", commandId, success, output });
  }

  private send(payload: Record<string, unknown>) {
    this.ws?.send(JSON.stringify(payload));
  }

  disconnect() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.ws?.close();
  }
}

export { GameGatewayClient as default };
