import type { WebSocket } from "ws";

export type ConnectedServer = {
  serverId: string;
  name: string;
  game: string;
  socket: WebSocket;
  connectedAt: Date;
};

const connections = new Map<string, ConnectedServer>();

export function registerConnection(server: ConnectedServer) {
  const existing = connections.get(server.serverId);
  if (existing && existing.socket !== server.socket) {
    try {
      existing.socket.close();
    } catch {
      // ignore
    }
  }
  connections.set(server.serverId, server);
}

export function unregisterConnection(serverId: string) {
  connections.delete(serverId);
}

export function getConnection(serverId: string): ConnectedServer | undefined {
  return connections.get(serverId);
}

export function getAnyConnection(): ConnectedServer | undefined {
  return connections.values().next().value;
}

export function listConnections(): ConnectedServer[] {
  return [...connections.values()];
}

export function sendToServer(serverId: string, message: unknown): boolean {
  const conn = connections.get(serverId);
  if (!conn || conn.socket.readyState !== conn.socket.OPEN) return false;
  conn.socket.send(JSON.stringify(message));
  return true;
}

export function broadcast(message: unknown) {
  const payload = JSON.stringify(message);
  for (const conn of connections.values()) {
    if (conn.socket.readyState === conn.socket.OPEN) {
      conn.socket.send(payload);
    }
  }
}

export function connectionCount(): number {
  return connections.size;
}
