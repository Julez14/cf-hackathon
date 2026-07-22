import { DurableObject } from "cloudflare:workers";

interface Env {}

const MAX_PLAYERS = 4;
const ROOM_CODE_PATTERN = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;
const PLAYER_ID_PATTERN = /^[a-zA-Z0-9_-]{8,100}$/;
const OPEN = 1;

type RoomPhase = "lobby";

interface Player {
  id: string;
  name: string;
  joinedAt: string;
}

interface SavedRoom {
  code: string;
  createdAt: string;
  leaderId: string | null;
  phase: RoomPhase;
  players: Record<string, Player>;
}

interface SocketAttachment {
  playerId: string;
}

interface RoomSnapshot {
  type: "room_state";
  code: string;
  phase: RoomPhase;
  capacity: number;
  leader: Pick<Player, "id" | "name"> | null;
  players: Array<Player & { isLeader: boolean; online: boolean }>;
}

export class Room extends DurableObject<Env> {
  private room: SavedRoom | undefined;
  private readonly initialized: Promise<void>;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.initialized = this.ctx.blockConcurrencyWhile(async () => {
      this.room = await this.ctx.storage.get<SavedRoom>("room");
    });
  }

  async fetch(request: Request): Promise<Response> {
    await this.initialized;

    const url = new URL(request.url);
    if (request.method === "POST" && url.pathname === "/create") {
      return this.create(request);
    }

    if (request.method === "GET" && url.pathname.endsWith("/state")) {
      return this.stateResponse();
    }

    if (request.method === "GET" && url.pathname.endsWith("/live")) {
      return this.connectWebSocket(request, url);
    }

    return text("Not found.", 404);
  }

  async webSocketClose(socket: WebSocket): Promise<void> {
    await this.initialized;

    const attachment = socketAttachment(socket);
    const room = this.room;
    if (!attachment || !room) {
      return;
    }

    if (!this.activePlayerIds().has(attachment.playerId)) {
      delete room.players[attachment.playerId];

      if (room.leaderId === attachment.playerId) {
        room.leaderId = firstPlayerId(room);
      }

      await this.persist(room);
    }

    this.broadcast(room);
  }

  private async create(request: Request): Promise<Response> {
    const payload = await request.json<unknown>().catch(() => undefined);
    const code = isRecord(payload) && typeof payload.code === "string" ? payload.code : "";

    if (!isRoomCode(code)) {
      return text("Invalid room code.", 400);
    }

    if (this.room) {
      return text("Room code already exists.", 409);
    }

    this.room = {
      code,
      createdAt: new Date().toISOString(),
      leaderId: null,
      phase: "lobby",
      players: {}
    };
    await this.persist(this.room);

    return json({ code }, 201);
  }

  private async stateResponse(): Promise<Response> {
    const room = this.room;
    if (!room) {
      return text("Room not found.", 404);
    }

    return json(this.snapshot(room));
  }

  private async connectWebSocket(request: Request, url: URL): Promise<Response> {
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return text("Expected a WebSocket upgrade.", 426);
    }

    const room = this.room;
    if (!room) {
      return text("Room not found.", 404);
    }

    const playerId = url.searchParams.get("playerId") ?? "";
    const name = normalizeName(url.searchParams.get("name"));
    if (!PLAYER_ID_PATTERN.test(playerId) || !name) {
      return text("A valid player identity is required.", 400);
    }

    const existingPlayer = room.players[playerId];
    if (!existingPlayer && Object.keys(room.players).length >= MAX_PLAYERS) {
      return text("This room is full.", 409);
    }

    if (existingPlayer) {
      existingPlayer.name = name;
    } else {
      room.players[playerId] = {
        id: playerId,
        name,
        joinedAt: new Date().toISOString()
      };
    }

    if (!room.leaderId) {
      room.leaderId = playerId;
    }

    await this.persist(room);

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    server.serializeAttachment({ playerId } satisfies SocketAttachment);
    this.ctx.acceptWebSocket(server);
    this.broadcast(room);

    return new Response(null, { status: 101, webSocket: client });
  }

  private activePlayerIds(): Set<string> {
    const playerIds = new Set<string>();

    for (const socket of this.ctx.getWebSockets()) {
      if (socket.readyState !== OPEN) {
        continue;
      }

      const attachment = socketAttachment(socket);
      if (attachment) {
        playerIds.add(attachment.playerId);
      }
    }

    return playerIds;
  }

  private snapshot(room: SavedRoom): RoomSnapshot {
    const activePlayerIds = this.activePlayerIds();
    const players = Object.values(room.players)
      .sort((left, right) => left.joinedAt.localeCompare(right.joinedAt))
      .map((player) => ({
        ...player,
        isLeader: player.id === room.leaderId,
        online: activePlayerIds.has(player.id)
      }));
    const leader = room.leaderId ? room.players[room.leaderId] : undefined;

    return {
      type: "room_state",
      code: room.code,
      phase: room.phase,
      capacity: MAX_PLAYERS,
      leader: leader ? { id: leader.id, name: leader.name } : null,
      players
    };
  }

  private async persist(room: SavedRoom): Promise<void> {
    await this.ctx.storage.put("room", room);
  }

  private broadcast(room: SavedRoom): void {
    const message = JSON.stringify(this.snapshot(room));

    for (const socket of this.ctx.getWebSockets()) {
      if (socket.readyState !== OPEN) {
        continue;
      }

      try {
        socket.send(message);
      } catch {
        socket.close(1011, "Unable to update room state.");
      }
    }
  }
}

export default {
  fetch(): Response {
    return text("Not found.", 404);
  }
} satisfies ExportedHandler<Env>;

export function isRoomCode(value: string): boolean {
  return ROOM_CODE_PATTERN.test(value);
}

function firstPlayerId(room: SavedRoom): string | null {
  return Object.values(room.players).sort((left, right) => left.joinedAt.localeCompare(right.joinedAt))[0]?.id ?? null;
}

function normalizeName(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length >= 2 && normalized.length <= 24 ? normalized : null;
}

function socketAttachment(socket: WebSocket): SocketAttachment | null {
  const attachment = socket.deserializeAttachment();

  if (!isRecord(attachment) || typeof attachment.playerId !== "string") {
    return null;
  }

  return { playerId: attachment.playerId };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json; charset=UTF-8" }
  });
}

function text(body: string, status: number): Response {
  return new Response(body, {
    status,
    headers: { "content-type": "text/plain; charset=UTF-8" }
  });
}
