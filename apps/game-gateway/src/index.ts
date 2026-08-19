import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { env } from "@serverspot/config/env";
import { createDb } from "@serverspot/db";
import {
  authenticateServer,
  completeCommand,
  createLinkCodeFromGame,
  enqueueGameCommand,
  getAnyConnection,
  getPendingCommands,
  markCommandSent,
  markServerOffline,
  parseGatewayMessage,
  registerConnection,
  sendToServer,
  syncBoardEntries,
  unregisterConnection,
  updateServerHeartbeat,
} from "@serverspot/game";
import { createLogger } from "@serverspot/observability";
import { WebSocketServer, type WebSocket } from "ws";

const log = createLogger("game-gateway");
const port = Number(process.env.GAME_GATEWAY_PORT ?? 3001);
const internalSecret = process.env.GAME_GATEWAY_SECRET ?? "";

type ClientContext = { serverId: string; name: string; game: string };

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

async function handleHttpCommand(req: IncomingMessage, res: ServerResponse) {
  if (internalSecret) {
    const auth = req.headers.authorization?.replace("Bearer ", "");
    if (auth !== internalSecret) {
      return json(res, 401, { error: "Unauthorized" });
    }
  }

  const body = await readBody(req);
  const payload = JSON.parse(body) as {
    type?: string;
    orderId?: string;
    fulfillmentId?: string;
    commands?: string[];
    username?: string;
    playerUuid?: string;
    serverId?: string;
  };

  const db = createDb(env.DATABASE_URL);
  const conn = payload.serverId
    ? undefined
    : getAnyConnection();

  const serverId = payload.serverId ?? conn?.serverId;
  if (!serverId) {
    return json(res, 503, { error: "No game server connected" });
  }

  const command = await enqueueGameCommand(db, {
    serverId,
    type: payload.type ?? "DELIVER_ORDER",
    payload: {
      commands: payload.commands ?? [`say Order ${payload.orderId} fulfilled`],
      username: payload.username,
      playerUuid: payload.playerUuid,
      orderId: payload.orderId,
      fulfillmentId: payload.fulfillmentId,
    },
    orderId: payload.orderId,
    fulfillmentId: payload.fulfillmentId,
  });

  const sent = sendToServer(serverId, {
    type: "COMMAND_EXECUTE",
    commandId: command.id,
    commands: (command.payload as { commands: string[] }).commands,
    playerUuid: payload.playerUuid,
    username: payload.username,
    orderId: payload.orderId,
  });

  if (sent) await markCommandSent(db, command.id);

  return json(res, 200, { commandId: command.id, sent });
}

async function handleMessage(ws: WebSocket, ctx: ClientContext, raw: string) {
  const db = createDb(env.DATABASE_URL);
  let message: ReturnType<typeof parseGatewayMessage>;

  try {
    message = parseGatewayMessage(JSON.parse(raw));
  } catch (err) {
    ws.send(JSON.stringify({ type: "ERROR", message: "Invalid message format" }));
    return;
  }

  switch (message.type) {
    case "SERVER_HEARTBEAT":
      await updateServerHeartbeat(db, ctx.serverId, {
        playerCount: message.playerCount,
        maxPlayers: message.maxPlayers,
      });
      break;

    case "PLAYER_VERIFY": {
      const record = await createLinkCodeFromGame(db, {
        serverId: ctx.serverId,
        playerUuid: message.playerUuid,
        username: message.username,
        code: message.code,
      });
      ws.send(
        JSON.stringify({
          type: "LINK_CODE_ACK",
          code: record.code,
          expiresAt: record.expiresAt.toISOString(),
        }),
      );
      break;
    }

    case "COMMAND_RESULT":
      await completeCommand(db, message.commandId, {
        success: message.success,
        output: message.output,
      });
      break;

    case "STATS_PUSH":
      await syncBoardEntries(db, message.boardSlug, message.entries);
      log.info({ board: message.boardSlug, count: message.entries.length }, "Stats synced");
      break;

    case "PLAYER_ONLINE":
      await updateServerHeartbeat(db, ctx.serverId, {
        playerCount: message.count,
        maxPlayers: message.max,
      });
      break;
  }
}

async function handleConnection(ws: WebSocket) {
  let ctx: ClientContext | null = null;
  let authed = false;

  ws.on("message", async (data) => {
    const raw = data.toString();

    if (!authed) {
      try {
        const hello = parseGatewayMessage(JSON.parse(raw));
        if (hello.type !== "SERVER_HELLO") {
          ws.send(JSON.stringify({ type: "ERROR", message: "Expected SERVER_HELLO" }));
          ws.close();
          return;
        }

        const db = createDb(env.DATABASE_URL);
        const server = await authenticateServer(db, hello.apiKey);
        if (!server) {
          ws.send(JSON.stringify({ type: "ERROR", message: "Invalid API key" }));
          ws.close();
          return;
        }

        ctx = { serverId: server.id, name: server.name, game: server.game };
        authed = true;

        registerConnection({
          serverId: server.id,
          name: server.name,
          game: server.game,
          socket: ws,
          connectedAt: new Date(),
        });

        await updateServerHeartbeat(db, server.id, {
          playerCount: 0,
          maxPlayers: hello.maxPlayers,
        });

        ws.send(
          JSON.stringify({
            type: "SERVER_HELLO_ACK",
            serverId: server.id,
            message: "Connected to ServerSpot gateway",
          }),
        );

        const pending = await getPendingCommands(db, server.id);
        for (const command of pending) {
          const payload = command.payload as { commands: string[]; playerUuid?: string; username?: string };
          sendToServer(server.id, {
            type: "COMMAND_EXECUTE",
            commandId: command.id,
            commands: payload.commands,
            playerUuid: payload.playerUuid,
            username: payload.username,
            orderId: command.orderId ?? undefined,
          });
          await markCommandSent(db, command.id);
        }

        log.info({ serverId: server.id, name: server.name }, "Game server connected");
      } catch (err) {
        log.error({ err }, "Auth failed");
        ws.close();
      }
      return;
    }

    if (ctx) await handleMessage(ws, ctx, raw);
  });

  ws.on("close", async () => {
    if (ctx) {
      unregisterConnection(ctx.serverId);
      const db = createDb(env.DATABASE_URL);
      await markServerOffline(db, ctx.serverId);
      log.info({ serverId: ctx.serverId }, "Game server disconnected");
    }
  });
}

const server = createServer(async (req, res) => {
  if (req.url === "/health") {
    return json(res, 200, { ok: true });
  }

  if (req.url === "/commands" && req.method === "POST") {
    try {
      await handleHttpCommand(req, res);
    } catch (err) {
      log.error({ err }, "Command dispatch failed");
      json(res, 500, { error: "Internal error" });
    }
    return;
  }

  json(res, 404, { error: "Not found" });
});

const wss = new WebSocketServer({ server });

wss.on("connection", handleConnection);

server.listen(port, () => {
  log.info({ port }, "Game gateway listening (HTTP + WebSocket)");
});
