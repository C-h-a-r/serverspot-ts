# ServerSpot Minecraft Plugin SDK

TypeScript reference client for connecting a Minecraft server (or proxy) to the ServerSpot game gateway.

## Protocol

1. Connect via WebSocket to `ws://localhost:3001`
2. Send `SERVER_HELLO` with your API key
3. Handle inbound `COMMAND_EXECUTE` messages (order fulfilment, vote rewards)
4. Send `PLAYER_VERIFY` when a player runs `/link`
5. Push leaderboard stats with `STATS_PUSH`

## Usage (Node test client)

```typescript
import { GameGatewayClient } from "@serverspot/plugin-minecraft";

const client = new GameGatewayClient({
  url: "ws://localhost:3001",
  apiKey: process.env.GAME_SERVER_API_KEY!,
  serverName: "Survival",
  onCommand: async (commandId, commands) => {
    // Execute commands on your Minecraft server
    console.log("Run:", commands);
    client.sendCommandResult(commandId, true, "OK");
  },
});

client.connect();
```

For Paper/Spigot, implement the same JSON message protocol in Java using a WebSocket library.

## Account linking

When a player runs `/link` in-game, call:

```typescript
client.sendPlayerVerify("ABC123", playerUuid, playerName);
```

The player then enters the code at `/profile` on the website.
