import { DurableObject } from "cloudflare:workers";

interface Env {}

const MAX_PLAYERS = 4;
const MIN_PLAYERS = 2;
const DEFAULT_ROUND_DURATION_MS = 90_000;
const MIN_ROUND_DURATION_SECONDS = 20;
const MAX_ROUND_DURATION_SECONDS = 300;
const MAX_CUMULATIVE_PROMPT_LENGTH = 3_000;
const PROMPT_WINDOW_MS = 20_000;
const GENERATION_GRACE_MS = 60_000;
const VOTING_WINDOW_MS = 30_000;
const ROOM_CODE_PATTERN = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;
const PLAYER_ID_PATTERN = /^[a-zA-Z0-9_-]{8,100}$/;
const SESSION_TOKEN_PATTERN = /^[a-zA-Z0-9_-]{32,200}$/;
const OPEN = 1;

export type RoomPhase = "lobby" | "countdown" | "prompting" | "generating" | "voting" | "results";
export type EntryStatus = "listening" | "transcribing" | "generating" | "ready" | "failed";
export type RoomEvent =
  | "room.updated"
  | "countdown.started"
  | "prompting.started"
  | "entry.updated"
  | "generating.started"
  | "voting.started"
  | "game.finished";

export interface Player {
  id: string;
  name: string;
  joinedAt: string;
}

export interface Entry {
  playerId: string;
  status: EntryStatus;
  revision: number;
  imageRevision: number;
  promptHistory: string[];
  activePrompt: string | null;
  transcript: string | null;
  finalPrompt: string | null;
  originalImageKey: string | null;
  imageUrl: string | null;
  error: string | null;
}

export interface SavedRoom {
  schemaVersion: 2;
  code: string;
  createdAt: string;
  leaderId: string | null;
  phase: RoomPhase;
  players: Record<string, Player>;
  sessionTokenHashes: Record<string, string>;
  creativeBrief: string | null;
  roundDurationMs: number;
  countdownEndsAt: number | null;
  promptEndsAt: number | null;
  generationEndsAt: number | null;
  votingEndsAt: number | null;
  entries: Record<string, Entry>;
  votes: Record<string, string>;
  winnerPlayerId: string | null;
  tieBreakApplied: boolean;
  completedAt: string | null;
}

interface SocketAttachment {
  playerId: string | null;
}

export interface RoomSnapshot {
  type: "room_state";
  event: RoomEvent;
  code: string;
  phase: RoomPhase;
  capacity: number;
  leader: Pick<Player, "id" | "name"> | null;
  players: Array<Player & { isLeader: boolean; online: boolean }>;
  creativeBrief: string | null;
  roundDurationMs: number;
  countdownEndsAt: number | null;
  promptEndsAt: number | null;
  generationEndsAt: number | null;
  votingEndsAt: number | null;
  entries: Record<string, Entry & { voteCount: number }>;
  votes: Record<string, string>;
  votedPlayerIds: string[];
  winnerPlayerId: string | null;
  tieBreakApplied: boolean;
  tieBreakRule: string | null;
  completedAt: string | null;
}

export class Room extends DurableObject<Env> {
  private room: SavedRoom | undefined;
  private readonly initialized: Promise<void>;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.initialized = this.ctx.blockConcurrencyWhile(async () => {
      const saved = await this.ctx.storage.get<Partial<SavedRoom>>("room");
      if (saved) {
        this.room = restoreRoom(saved);
        if (this.room.phase === "prompting" && this.room.promptEndsAt === null) {
          this.room.promptEndsAt = Date.now() + this.room.roundDurationMs;
          await this.ctx.storage.put("room", this.room);
          await this.ctx.storage.setAlarm(this.room.promptEndsAt);
        }
      }
    });
  }

  async fetch(request: Request): Promise<Response> {
    await this.initialized;
    await this.advanceForTime(Date.now());

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

    if (request.method === "POST") {
      const action = actionFromPath(url.pathname);
      if (action) {
        return this.handleAction(action, request);
      }
    }

    return problem("Not found.", 404);
  }

  async alarm(): Promise<void> {
    await this.initialized;
    await this.advanceForTime(Date.now());
  }

  async webSocketClose(socket: WebSocket): Promise<void> {
    await this.initialized;

    const attachment = socketAttachment(socket);
    const room = this.room;
    if (!attachment?.playerId || !room) {
      return;
    }

    if (room.phase === "lobby" && !this.activePlayerIds().has(attachment.playerId)) {
      delete room.players[attachment.playerId];
      delete room.sessionTokenHashes[attachment.playerId];

      if (room.leaderId === attachment.playerId) {
        room.leaderId = firstPlayerId(room);
      }

      await this.persist(room);
    }

    this.broadcast(room, "room.updated");
  }

  private async create(request: Request): Promise<Response> {
    const payload = await request.json<unknown>().catch(() => undefined);
    const code = isRecord(payload) && typeof payload.code === "string" ? payload.code : "";

    if (!isRoomCode(code)) {
      return problem("Invalid room code.", 400);
    }

    if (this.room) {
      return problem("Room code already exists.", 409);
    }

    this.room = {
      schemaVersion: 2,
      code,
      createdAt: new Date().toISOString(),
      leaderId: null,
      phase: "lobby",
      players: {},
      sessionTokenHashes: {},
      creativeBrief: null,
      roundDurationMs: DEFAULT_ROUND_DURATION_MS,
      countdownEndsAt: null,
      promptEndsAt: null,
      generationEndsAt: null,
      votingEndsAt: null,
      entries: {},
      votes: {},
      winnerPlayerId: null,
      tieBreakApplied: false,
      completedAt: null
    };
    await this.persist(this.room);

    return json({ code }, 201);
  }

  private stateResponse(): Response {
    const room = this.room;
    if (!room) {
      return problem("Room not found.", 404);
    }

    return json(this.snapshot(room, "room.updated"));
  }

  private async connectWebSocket(request: Request, url: URL): Promise<Response> {
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return problem("Expected a WebSocket upgrade.", 426);
    }

    const room = this.room;
    if (!room) {
      return problem("Room not found.", 404);
    }

    const isSpectator = url.searchParams.get("spectator") === "true";
    const playerId = url.searchParams.get("playerId") ?? "";
    const sessionToken = url.searchParams.get("sessionToken") ?? "";
    const name = normalizeName(url.searchParams.get("name"));

    if (isSpectator) {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      server.serializeAttachment({ playerId: null } satisfies SocketAttachment);
      this.ctx.acceptWebSocket(server);
      server.send(JSON.stringify(this.snapshot(room, "room.updated")));
      return new Response(null, { status: 101, webSocket: client });
    }

    if (!PLAYER_ID_PATTERN.test(playerId) || !SESSION_TOKEN_PATTERN.test(sessionToken) || !name) {
      return problem("A valid player identity is required.", 400);
    }

    const existingPlayer = room.players[playerId];
    const sessionTokenHash = await hashSessionToken(sessionToken);
    if (existingPlayer && room.sessionTokenHashes[playerId] && room.sessionTokenHashes[playerId] !== sessionTokenHash) {
      return problem("This player identity belongs to another session.", 403);
    }

    if (!existingPlayer && room.phase !== "lobby") {
      return problem("The game has already started.", 409);
    }

    if (!existingPlayer && Object.keys(room.players).length >= MAX_PLAYERS) {
      return problem("This room is full.", 409);
    }

    if (existingPlayer && room.phase === "lobby") {
      existingPlayer.name = name;
    } else if (!existingPlayer) {
      room.players[playerId] = {
        id: playerId,
        name,
        joinedAt: new Date().toISOString()
      };
    }
    room.sessionTokenHashes[playerId] = sessionTokenHash;

    if (!room.leaderId) {
      room.leaderId = playerId;
    }

    await this.persist(room);

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    server.serializeAttachment({ playerId } satisfies SocketAttachment);
    this.ctx.acceptWebSocket(server);
    this.broadcast(room, "room.updated");

    return new Response(null, { status: 101, webSocket: client });
  }

  private async handleAction(action: string, request: Request): Promise<Response> {
    const room = this.room;
    if (!room) {
      return problem("Room not found.", 404);
    }

    const payload = await request.json<unknown>().catch(() => undefined);
    if (!isRecord(payload)) {
      return problem("Expected a JSON object.", 400);
    }

    switch (action) {
      case "start":
        return this.start(room, payload);
      case "reserve-entry":
        return this.reserveEntry(room, payload);
      case "entry-generating":
        return this.entryGenerating(room, payload);
      case "entry-ready":
        return this.entryReady(room, payload);
      case "entry-failed":
        return this.entryFailed(room, payload);
      case "vote":
        return this.vote(room, payload);
      default:
        return problem("Not found.", 404);
    }
  }

  private async start(room: SavedRoom, payload: Record<string, unknown>): Promise<Response> {
    const playerId = readPlayerId(payload);
    const authenticated = playerId ? await hasValidSession(room, playerId, payload.sessionToken) : false;
    const creativeBrief = normalizeText(payload.creativeBrief, 3, 240);
    const roundDurationSeconds = readRoundDurationSeconds(payload.roundDurationSeconds);

    if (!playerId || !readSessionToken(payload) || !creativeBrief || roundDurationSeconds === null) {
      return problem("A valid player session, creative brief, and round timer are required.", 400);
    }

    if (!authenticated) {
      return problem("Player session is not authorized.", 403);
    }

    if (room.phase !== "lobby") {
      return problem("The game has already started.", 409);
    }

    if (room.leaderId !== playerId) {
      return problem("Only the group leader can start the game.", 403);
    }

    const players = orderedPlayers(room);
    if (players.length < MIN_PLAYERS) {
      return problem("At least two players are required.", 409);
    }

    room.phase = "prompting";
    room.creativeBrief = creativeBrief;
    room.roundDurationMs = roundDurationSeconds * 1_000;
    room.countdownEndsAt = null;
    room.promptEndsAt = Date.now() + room.roundDurationMs;
    room.generationEndsAt = null;
    room.votingEndsAt = null;
    room.entries = Object.fromEntries(players.map((player) => [player.id, emptyEntry(player.id)]));
    room.votes = {};
    room.winnerPlayerId = null;
    room.tieBreakApplied = false;
    room.completedAt = null;

    await this.persistAndBroadcast(room, "prompting.started");
    return json(this.snapshot(room, "prompting.started"));
  }

  private async reserveEntry(room: SavedRoom, payload: Record<string, unknown>): Promise<Response> {
    const playerId = readPlayerId(payload);
    const authenticated = playerId ? await hasValidSession(room, playerId, payload.sessionToken) : false;
    if (!playerId || !readSessionToken(payload)) {
      return problem("A valid player session is required.", 400);
    }

    if (!authenticated) {
      return problem("Player session is not authorized.", 403);
    }

    if (room.phase !== "prompting" || (room.promptEndsAt !== null && Date.now() >= room.promptEndsAt)) {
      return problem("The prompt window is closed.", 409);
    }

    const entry = room.entries[playerId];
    if (!entry) {
      return problem("Player not found in this game.", 404);
    }

    if (entry.status === "transcribing" || entry.status === "generating") {
      return problem("This player's previous prompt is still being generated.", 409);
    }

    entry.revision += 1;
    entry.status = "transcribing";
    entry.activePrompt = null;
    entry.error = null;
    await this.persistAndBroadcast(room, "entry.updated");
    return json(this.snapshot(room, "entry.updated"));
  }

  private async entryGenerating(room: SavedRoom, payload: Record<string, unknown>): Promise<Response> {
    const playerId = readPlayerId(payload);
    const transcript = normalizeText(payload.transcript, 1, 500);
    const revision = readRevision(payload.revision);
    if (!playerId || !transcript || revision === null) {
      return problem("A valid player ID, revision, and transcript are required.", 400);
    }

    if (room.phase !== "prompting" && room.phase !== "generating") {
      return problem("The room is not accepting generation updates.", 409);
    }

    const entry = room.entries[playerId];
    if (!entry || entry.status !== "transcribing" || entry.revision !== revision) {
      return problem("This entry is not awaiting a transcript.", 409);
    }

    const promptHistory = [...entry.promptHistory, transcript];
    if (promptHistory.join(" ").length > MAX_CUMULATIVE_PROMPT_LENGTH) {
      return problem("This player's combined prompts are too long.", 400);
    }

    entry.status = "generating";
    entry.promptHistory = promptHistory;
    entry.activePrompt = cumulativePrompt(room.creativeBrief ?? "", promptHistory);
    await this.persistAndBroadcast(room, "entry.updated");
    return json(this.snapshot(room, "entry.updated"));
  }

  private async entryReady(room: SavedRoom, payload: Record<string, unknown>): Promise<Response> {
    const playerId = readPlayerId(payload);
    const revision = readRevision(payload.revision);
    const originalImageKey = normalizeText(payload.originalImageKey, 1, 1024);
    const imageUrl = normalizeHttpUrl(payload.imageUrl);
    if (!playerId || revision === null || !originalImageKey || !imageUrl) {
      return problem("A valid player ID, revision, image key, and image URL are required.", 400);
    }

    if (room.phase !== "prompting" && room.phase !== "generating") {
      return problem("The room is not accepting generation updates.", 409);
    }

    const entry = room.entries[playerId];
    if (!entry || entry.status !== "generating" || entry.revision !== revision || !entry.activePrompt) {
      return problem("This entry is not generating.", 409);
    }

    entry.status = "ready";
    entry.imageRevision = revision;
    entry.transcript = entry.promptHistory.join(" + ");
    entry.finalPrompt = entry.activePrompt;
    entry.activePrompt = null;
    entry.originalImageKey = originalImageKey;
    entry.imageUrl = imageUrl;
    await this.persistAndBroadcast(room, "entry.updated");
    return json(this.snapshot(room, "entry.updated"));
  }

  private async entryFailed(room: SavedRoom, payload: Record<string, unknown>): Promise<Response> {
    const playerId = readPlayerId(payload);
    const revision = readRevision(payload.revision);
    const error = normalizeText(payload.error, 1, 160) ?? "This entry could not be generated.";
    if (!playerId || revision === null) {
      return problem("A valid player ID and revision are required.", 400);
    }

    if (room.phase !== "prompting" && room.phase !== "generating") {
      return problem("The room is not accepting generation updates.", 409);
    }

    const entry = room.entries[playerId];
    if (!entry || entry.revision !== revision || (entry.status !== "transcribing" && entry.status !== "generating")) {
      return problem("This entry is not in progress.", 409);
    }

    entry.status = entry.imageUrl ? "ready" : "failed";
    entry.activePrompt = null;
    entry.error = error;
    await this.persistAndBroadcast(room, "entry.updated");
    return json(this.snapshot(room, "entry.updated"));
  }

  private async vote(room: SavedRoom, payload: Record<string, unknown>): Promise<Response> {
    const playerId = readPlayerId(payload);
    const authenticated = playerId ? await hasValidSession(room, playerId, payload.sessionToken) : false;
    const candidatePlayerId = typeof payload.candidatePlayerId === "string" ? payload.candidatePlayerId : "";
    if (!playerId || !readSessionToken(payload) || !PLAYER_ID_PATTERN.test(candidatePlayerId)) {
      return problem("A valid voter session and candidate are required.", 400);
    }

    if (!authenticated) {
      return problem("Player session is not authorized.", 403);
    }

    if (room.phase !== "voting") {
      return problem("Voting is not open.", 409);
    }

    if (!room.players[playerId]) {
      return problem("Voter not found in this game.", 404);
    }

    if (playerId === candidatePlayerId) {
      return problem("Players cannot vote for their own entry.", 409);
    }

    if (room.votes[playerId]) {
      return problem("This player has already voted.", 409);
    }

    if (room.entries[candidatePlayerId]?.status !== "ready") {
      return problem("Votes can only be cast for ready entries.", 409);
    }

    if (!eligibleVoterIds(room).includes(playerId)) {
      return problem("This player has no eligible entry to vote for.", 409);
    }

    room.votes[playerId] = candidatePlayerId;
    const event = eligibleVoterIds(room).every((id) => room.votes[id]) ? this.finishGame(room) : "room.updated";
    await this.persistAndBroadcast(room, event);
    return json(this.snapshot(room, event));
  }

  private openVoting(room: SavedRoom, now: number): RoomEvent {
    if (!Object.values(room.entries).some((entry) => entry.status === "ready")) {
      return this.finishGame(room);
    }

    room.phase = "voting";
    room.countdownEndsAt = null;
    room.promptEndsAt = null;
    room.generationEndsAt = null;
    room.votingEndsAt = now + VOTING_WINDOW_MS;
    return "voting.started";
  }

  private finishGame(room: SavedRoom): RoomEvent {
    const readyPlayerIds = orderedPlayers(room)
      .map((player) => player.id)
      .filter((playerId) => room.entries[playerId]?.status === "ready");

    if (readyPlayerIds.length > 0) {
      const counts = voteCounts(room);
      const highestCount = Math.max(...readyPlayerIds.map((playerId) => counts[playerId] ?? 0));
      const tiedPlayerIds = readyPlayerIds.filter((playerId) => (counts[playerId] ?? 0) === highestCount);
      room.winnerPlayerId = tiedPlayerIds[0] ?? null;
      room.tieBreakApplied = tiedPlayerIds.length > 1;
    }

    room.phase = "results";
    room.countdownEndsAt = null;
    room.promptEndsAt = null;
    room.generationEndsAt = null;
    room.votingEndsAt = null;
    room.completedAt = new Date().toISOString();
    return "game.finished";
  }

  private async advanceForTime(now: number): Promise<void> {
    const room = this.room;
    if (!room) {
      return;
    }

    let event: RoomEvent | null = null;

    if (room.phase === "countdown" && room.countdownEndsAt !== null && now >= room.countdownEndsAt) {
      room.phase = "prompting";
      room.promptEndsAt = room.countdownEndsAt + PROMPT_WINDOW_MS;
      room.generationEndsAt = room.promptEndsAt + GENERATION_GRACE_MS;
      room.countdownEndsAt = null;
      event = "prompting.started";
    }

    if (room.phase === "prompting" && room.promptEndsAt !== null && now >= room.promptEndsAt) {
      for (const entry of Object.values(room.entries)) {
        entry.status = entry.imageUrl ? "ready" : "failed";
        entry.activePrompt = null;
        if (!entry.imageUrl) entry.error = "No image was ready before time expired.";
      }

      event = this.openVoting(room, now);
    }

    if (room.phase === "generating" && room.generationEndsAt !== null && now >= room.generationEndsAt) {
      for (const entry of Object.values(room.entries)) {
        if (entry.status === "transcribing" || entry.status === "generating") {
          entry.status = "failed";
          entry.error = "Generation timed out.";
        }
      }

      event = this.openVoting(room, now);
    }

    if (room.phase === "voting" && room.votingEndsAt !== null && now >= room.votingEndsAt) {
      event = this.finishGame(room);
    }

    if (event) {
      await this.persistAndBroadcast(room, event);
    }

  }

  private activePlayerIds(): Set<string> {
    const playerIds = new Set<string>();

    for (const socket of this.ctx.getWebSockets()) {
      if (socket.readyState !== OPEN) {
        continue;
      }

      const attachment = socketAttachment(socket);
      if (attachment?.playerId) {
        playerIds.add(attachment.playerId);
      }
    }

    return playerIds;
  }

  private snapshot(room: SavedRoom, event: RoomEvent): RoomSnapshot {
    const activePlayerIds = this.activePlayerIds();
    const players = orderedPlayers(room).map((player) => ({
      ...player,
      isLeader: player.id === room.leaderId,
      online: activePlayerIds.has(player.id)
    }));
    const leader = room.leaderId ? room.players[room.leaderId] : undefined;
    const counts = room.phase === "results" ? voteCounts(room) : {};
    const entries = Object.fromEntries(
      Object.entries(room.entries).map(([playerId, entry]) => [playerId, { ...entry, voteCount: counts[playerId] ?? 0 }])
    );

    return {
      type: "room_state",
      event,
      code: room.code,
      phase: room.phase,
      capacity: MAX_PLAYERS,
      leader: leader ? { id: leader.id, name: leader.name } : null,
      players,
      creativeBrief: room.phase === "lobby" || room.phase === "countdown" ? null : room.creativeBrief,
      roundDurationMs: room.roundDurationMs,
      countdownEndsAt: room.countdownEndsAt,
      promptEndsAt: room.promptEndsAt,
      generationEndsAt: room.generationEndsAt,
      entries,
      votingEndsAt: room.votingEndsAt,
      votes: room.phase === "results" ? { ...room.votes } : {},
      votedPlayerIds: Object.keys(room.votes),
      winnerPlayerId: room.winnerPlayerId,
      tieBreakApplied: room.tieBreakApplied,
      tieBreakRule: room.tieBreakApplied ? "Earliest room join order wins tied votes." : null,
      completedAt: room.completedAt
    };
  }

  private async persist(room: SavedRoom): Promise<void> {
    await this.ctx.storage.put("room", room);
  }

  private async persistAndBroadcast(room: SavedRoom, event: RoomEvent): Promise<void> {
    const deadline = room.countdownEndsAt ?? room.promptEndsAt ?? room.generationEndsAt ?? room.votingEndsAt;
    await this.ctx.storage.transaction(async (transaction) => {
      await transaction.put("room", room);
      if (deadline === null) {
        await transaction.deleteAlarm();
      } else {
        await transaction.setAlarm(Math.max(deadline, Date.now() + 1));
      }
    });
    this.broadcast(room, event);
  }

  private broadcast(room: SavedRoom, event: RoomEvent): void {
    const message = JSON.stringify(this.snapshot(room, event));

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
    return problem("Not found.", 404);
  }
} satisfies ExportedHandler<Env>;

export function isRoomCode(value: string): boolean {
  return ROOM_CODE_PATTERN.test(value);
}

function restoreRoom(saved: Partial<SavedRoom>): SavedRoom {
  const entries = Object.fromEntries(
    Object.entries(saved.entries ?? {}).map(([playerId, entry]) => [playerId, restoreEntry(playerId, entry)])
  );
  return {
    schemaVersion: 2,
    code: saved.code ?? "",
    createdAt: saved.createdAt ?? new Date().toISOString(),
    leaderId: saved.leaderId ?? null,
    phase: saved.phase ?? "lobby",
    players: saved.players ?? {},
    sessionTokenHashes: saved.sessionTokenHashes ?? {},
    creativeBrief: saved.creativeBrief ?? null,
    roundDurationMs: normalizeRoundDurationMs(saved.roundDurationMs),
    countdownEndsAt: saved.countdownEndsAt ?? null,
    promptEndsAt: saved.promptEndsAt ?? null,
    generationEndsAt: saved.generationEndsAt ?? null,
    votingEndsAt: saved.votingEndsAt ?? null,
    entries,
    votes: saved.votes ?? {},
    winnerPlayerId: saved.winnerPlayerId ?? null,
    tieBreakApplied: saved.tieBreakApplied ?? false,
    completedAt: saved.completedAt ?? null
  };
}

function emptyEntry(playerId: string): Entry {
  return {
    playerId,
    status: "listening",
    revision: 0,
    imageRevision: 0,
    promptHistory: [],
    activePrompt: null,
    transcript: null,
    finalPrompt: null,
    originalImageKey: null,
    imageUrl: null,
    error: null
  };
}

function actionFromPath(pathname: string): string | null {
  const match = /\/actions\/(start|reserve-entry|entry-generating|entry-ready|entry-failed|vote)$/.exec(pathname);
  return match?.[1] ?? null;
}

function restoreEntry(playerId: string, entry: Partial<Entry>): Entry {
  const promptHistory = Array.isArray(entry.promptHistory)
    ? entry.promptHistory.filter((prompt): prompt is string => typeof prompt === "string").slice(0, 20)
    : entry.transcript
      ? [entry.transcript]
      : [];
  return {
    playerId,
    status: entry.status ?? "listening",
    revision: Number.isInteger(entry.revision) && Number(entry.revision) >= 0 ? Number(entry.revision) : entry.imageUrl ? 1 : 0,
    imageRevision: Number.isInteger(entry.imageRevision) && Number(entry.imageRevision) >= 0 ? Number(entry.imageRevision) : entry.imageUrl ? 1 : 0,
    promptHistory,
    activePrompt: entry.activePrompt ?? null,
    transcript: entry.transcript ?? null,
    finalPrompt: entry.finalPrompt ?? null,
    originalImageKey: entry.originalImageKey ?? null,
    imageUrl: entry.imageUrl ?? null,
    error: entry.error ?? null
  };
}

function cumulativePrompt(creativeBrief: string, promptHistory: string[]): string {
  const twists = promptHistory.map((prompt, index) => `${index + 1}. ${prompt}`).join("\n");
  return `${creativeBrief}\n\nApply all of these player twists in order, preserving the earlier details:\n${twists}`;
}

function normalizeRoundDurationMs(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= MIN_ROUND_DURATION_SECONDS * 1_000 && value <= MAX_ROUND_DURATION_SECONDS * 1_000
    ? value
    : DEFAULT_ROUND_DURATION_MS;
}

function readRoundDurationSeconds(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= MIN_ROUND_DURATION_SECONDS && value <= MAX_ROUND_DURATION_SECONDS
    ? value
    : null;
}

function readRevision(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : null;
}

function orderedPlayers(room: Pick<SavedRoom, "players">): Player[] {
  return Object.values(room.players).sort((left, right) => left.joinedAt.localeCompare(right.joinedAt));
}

function firstPlayerId(room: Pick<SavedRoom, "players">): string | null {
  return orderedPlayers(room)[0]?.id ?? null;
}

function eligibleVoterIds(room: SavedRoom): string[] {
  const readyPlayerIds = new Set(
    Object.values(room.entries)
      .filter((entry) => entry.status === "ready")
      .map((entry) => entry.playerId)
  );

  return orderedPlayers(room)
    .map((player) => player.id)
    .filter((playerId) => [...readyPlayerIds].some((candidatePlayerId) => candidatePlayerId !== playerId));
}

function voteCounts(room: Pick<SavedRoom, "votes">): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const candidatePlayerId of Object.values(room.votes)) {
    counts[candidatePlayerId] = (counts[candidatePlayerId] ?? 0) + 1;
  }
  return counts;
}

function readPlayerId(payload: Record<string, unknown>): string | null {
  return typeof payload.playerId === "string" && PLAYER_ID_PATTERN.test(payload.playerId) ? payload.playerId : null;
}

function readSessionToken(payload: Record<string, unknown>): string | null {
  return typeof payload.sessionToken === "string" && SESSION_TOKEN_PATTERN.test(payload.sessionToken)
    ? payload.sessionToken
    : null;
}

async function hasValidSession(room: SavedRoom, playerId: string, value: unknown): Promise<boolean> {
  if (typeof value !== "string" || !SESSION_TOKEN_PATTERN.test(value)) {
    return false;
  }

  const expectedHash = room.sessionTokenHashes[playerId];
  return Boolean(expectedHash) && expectedHash === (await hashSessionToken(value));
}

async function hashSessionToken(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function normalizeName(value: string | null): string | null {
  return normalizeText(value, 2, 24);
}

function normalizeText(value: unknown, minimumLength: number, maximumLength: number): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length >= minimumLength && normalized.length <= maximumLength ? normalized : null;
}

function normalizeHttpUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2048) {
    return null;
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
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

function problem(error: string, status: number): Response {
  return json({ error }, status);
}
