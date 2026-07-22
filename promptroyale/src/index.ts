import { renderApp } from "./site";
import { toString as renderQrCode } from "qrcode";

export interface Env {
  AI: Ai;
  ROOMS: DurableObjectNamespace;
  IMAGES: R2Bucket;
  GALLERY: D1Database;
}

const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ROOM_CODE_PATTERN = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;
const PLAYER_ID_PATTERN = /^[a-zA-Z0-9_-]{8,100}$/;
const SESSION_TOKEN_PATTERN = /^[a-zA-Z0-9_-]{32,200}$/;
const MAX_ACTION_BODY_BYTES = 4_096;
const MAX_AUDIO_BODY_BYTES = 12 * 1024 * 1024;
const MAX_CREATE_ATTEMPTS = 5;
const MOCK_BRIEFS = [
  "A dog running through a field",
  "A royal banquet at the end of the world",
  "A tiny city hidden inside a vending machine",
  "An awkward family photo taken on the moon"
];

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/api/rooms") {
      return createRoom(env);
    }

    if (request.method === "GET" && url.pathname === "/api/qr") {
      return createQrCode(url);
    }

    if (request.method === "GET" && url.pathname === "/api/gallery") {
      const winners = await env.GALLERY.prepare("SELECT room_code, player_name, image_url, final_prompt, prompt_history, vote_count, completed_at FROM winners ORDER BY completed_at DESC LIMIT 24").all();
      return json({ winners: winners.results });
    }

    if (request.method === "GET" && url.pathname === "/api/players") {
      const players = await env.GALLERY.prepare("SELECT player_id, MAX(player_name) AS player_name, COUNT(*) AS games, SUM(won) AS wins, ROUND(100.0 * SUM(won) / COUNT(*)) AS win_rate, MAX(completed_at) AS last_played FROM game_players GROUP BY player_id ORDER BY wins DESC, win_rate DESC, games DESC, last_played DESC LIMIT 100").all();
      return json({ players: players.results });
    }

    const statsMatch = /^\/api\/players\/([a-zA-Z0-9_-]{8,100})\/stats$/.exec(url.pathname);
    if (request.method === "GET" && statsMatch) {
      const playerId = statsMatch[1];
      const [totals, wins] = await env.GALLERY.batch([
        env.GALLERY.prepare("SELECT COUNT(*) AS games, COALESCE(SUM(won), 0) AS wins FROM game_players WHERE player_id = ?").bind(playerId),
        env.GALLERY.prepare("SELECT room_code, player_name, image_url, completed_at FROM game_players WHERE player_id = ? AND won = 1 ORDER BY completed_at DESC").bind(playerId)
      ]);
      const summary = totals.results[0] as { games?: number; wins?: number } | undefined;
      const games = Number(summary?.games ?? 0);
      const winCount = Number(summary?.wins ?? 0);
      return json({ games, wins: winCount, winRate: games ? Math.round((winCount / games) * 100) : 0, winningImages: wins.results });
    }

    const roomApiMatch = /^\/api\/rooms\/([a-z0-9]{6})\/(state|live)$/i.exec(url.pathname);
    if (request.method === "GET" && roomApiMatch) {
      const code = roomApiMatch[1].toUpperCase();

      if (!isRoomCode(code)) {
        return json({ error: "Enter a valid six-character room code." }, 400);
      }

      return env.ROOMS.getByName(code).fetch(request);
    }

    const speechMatch = /^\/api\/rooms\/([a-z0-9]{6})\/actions\/speech$/i.exec(url.pathname);
    if (request.method === "POST" && speechMatch) {
      const code = speechMatch[1].toUpperCase();
      if (!isRoomCode(code)) {
        return json({ error: "Enter a valid six-character room code." }, 400);
      }
      return handleSpeechEntry(request, env, env.ROOMS.getByName(code), code);
    }

    const roomActionMatch = /^\/api\/rooms\/([a-z0-9]{6})\/actions\/(start|submit|mock-entry|vote|finalize)$/i.exec(url.pathname);
    if (request.method === "POST" && roomActionMatch) {
      const code = roomActionMatch[1].toUpperCase();
      if (!isRoomCode(code)) {
        return json({ error: "Enter a valid six-character room code." }, 400);
      }

      return handleRoomAction(request, env, env.ROOMS.getByName(code), code, roomActionMatch[2].toLowerCase());
    }

    const imageMatch = /^\/api\/rooms\/([a-z0-9]{6})\/images\/([a-zA-Z0-9_-]{8,100})$/i.exec(url.pathname);
    if (request.method === "GET" && imageMatch) {
      const code = imageMatch[1].toUpperCase();
      const playerId = imageMatch[2];
      if (!isRoomCode(code) || !PLAYER_ID_PATTERN.test(playerId)) {
        return json({ error: "Image not found." }, 404);
      }

      return generatedImage(request, env, env.ROOMS.getByName(code), code, playerId);
    }

    const mockImageMatch = /^\/api\/rooms\/([a-z0-9]{6})\/mock-images\/([a-zA-Z0-9_-]{8,100})\.svg$/i.exec(url.pathname);
    if (request.method === "GET" && mockImageMatch) {
      const code = mockImageMatch[1].toUpperCase();
      const playerId = mockImageMatch[2];
      if (!isRoomCode(code) || !PLAYER_ID_PATTERN.test(playerId)) {
        return json({ error: "Mock image not found." }, 404);
      }

      return mockImage(env.ROOMS.getByName(code), code, playerId);
    }

    if (request.method === "GET" && (url.pathname === "/" || url.pathname.startsWith("/room/"))) {
      return new Response(renderApp(), {
        headers: {
          "cache-control": "no-store",
          "content-security-policy": "default-src 'self'; base-uri 'none'; connect-src 'self' ws: wss:; form-action 'self'; frame-ancestors 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
          "content-type": "text/html; charset=UTF-8",
          "referrer-policy": "strict-origin-when-cross-origin",
          "x-content-type-options": "nosniff"
        }
      });
    }

    return json({ error: "Not found." }, 404);
  }
} satisfies ExportedHandler<Env>;

async function createRoom(env: Env): Promise<Response> {
  try {
    for (let attempt = 0; attempt < MAX_CREATE_ATTEMPTS; attempt += 1) {
      const code = createRoomCode();
      const room = env.ROOMS.getByName(code);
      const response = await room.fetch(
        new Request("https://room.internal/create", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ code })
        })
      );

      if (response.status === 201) {
        return json({ code }, 201);
      }

      if (response.status !== 409) {
        throw new Error(`Room creation returned ${response.status}.`);
      }
    }
  } catch (error) {
    console.error("Unable to create room", {
      error: error instanceof Error ? error.message : String(error)
    });
  }

  return json({ error: "We could not open a room. Please try again." }, 503);
}

async function handleRoomAction(
  request: Request,
  env: Env,
  room: DurableObjectStub,
  code: string,
  action: string
): Promise<Response> {
  const parsed = await readActionPayload(request);
  if (parsed instanceof Response) {
    return parsed;
  }
  const payload = parsed;

  if (action === "finalize") {
    return finalizeWinner(env, room);
  }

  if (action === "start") {
    return roomAction(room, "start", {
      playerId: payload.playerId,
      sessionToken: payload.sessionToken,
      creativeBrief: mockBrief(code),
      roundDurationSeconds: payload.roundDurationSeconds
    });
  }

  if (action === "vote") {
    return roomAction(room, "vote", {
      playerId: payload.playerId,
      sessionToken: payload.sessionToken,
      candidatePlayerId: payload.candidatePlayerId
    });
  }

  const playerId = typeof payload.playerId === "string" ? payload.playerId : "";
  const sessionToken = typeof payload.sessionToken === "string" ? payload.sessionToken : "";
  const transcript = normalizeTranscript(payload.transcript);
  if (!PLAYER_ID_PATTERN.test(playerId) || !SESSION_TOKEN_PATTERN.test(sessionToken) || !transcript) {
    return json({ error: "A valid player session and mock transcript are required." }, 400);
  }

  if (action === "submit") {
    return generateEntry(request, env, room, code, playerId, sessionToken, transcript);
  }

  const reserved = await roomAction(room, "reserve-entry", { playerId, sessionToken });
  if (!reserved.ok) {
    return reserved;
  }
  const revision = await readEntryRevision(reserved, playerId);
  if (!revision) {
    return json({ error: "The room could not reserve this prompt." }, 502);
  }

  try {
    await delay(250);
    const generating = await roomAction(room, "entry-generating", { playerId, transcript, revision });
    if (!generating.ok) {
      await roomAction(room, "entry-failed", { playerId, revision, error: "Mock transcription failed." });
      return generating;
    }

    await delay(750);
    const imageUrl = new URL(`/api/rooms/${code}/mock-images/${encodeURIComponent(playerId)}.svg?revision=${revision}`, request.url).toString();
    const ready = await roomAction(room, "entry-ready", {
      playerId,
      revision,
      originalImageKey: `mock/${code}/${playerId}/${revision}.svg`,
      imageUrl
    });
    if (!ready.ok) {
      await roomAction(room, "entry-failed", { playerId, revision, error: "Mock image generation failed." });
    }
    return ready;
  } catch (error) {
    await roomAction(room, "entry-failed", { playerId, revision, error: "Mock image generation failed." }).catch(() => undefined);
    console.error("Mock entry failed", { code, playerId, error: error instanceof Error ? error.message : String(error) });
    return json({ error: "Mock image generation failed." }, 502);
  }
}

async function generateEntry(
  request: Request,
  env: Env,
  room: DurableObjectStub,
  code: string,
  playerId: string,
  sessionToken: string,
  transcript: string
): Promise<Response> {
  const reserved = await roomAction(room, "reserve-entry", { playerId, sessionToken });
  if (!reserved.ok) {
    return reserved;
  }
  const revision = await readEntryRevision(reserved, playerId);
  if (!revision) {
    return json({ error: "The room could not reserve this prompt." }, 502);
  }

  return completeEntry(request, env, room, code, playerId, transcript, revision);
}

async function handleSpeechEntry(request: Request, env: Env, room: DurableObjectStub, code: string): Promise<Response> {
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_AUDIO_BODY_BYTES) {
    return json({ error: "Audio clip is too large." }, 413);
  }

  const form = await request.formData().catch(() => undefined);
  const playerId = form?.get("playerId");
  const sessionToken = form?.get("sessionToken");
  const audio = form?.get("audio");
  if (
    typeof playerId !== "string" ||
    !PLAYER_ID_PATTERN.test(playerId) ||
    typeof sessionToken !== "string" ||
    !SESSION_TOKEN_PATTERN.test(sessionToken) ||
    !(audio instanceof File) ||
    audio.size === 0 ||
    audio.size > MAX_AUDIO_BODY_BYTES
  ) {
    return json({ error: "A valid player session and audio clip are required." }, 400);
  }

  const reserved = await roomAction(room, "reserve-entry", { playerId, sessionToken });
  if (!reserved.ok) {
    return reserved;
  }
  const revision = await readEntryRevision(reserved, playerId);
  if (!revision) {
    return json({ error: "The room could not reserve this prompt." }, 502);
  }

  try {
    const transcription = await env.AI.run("@cf/openai/whisper-large-v3-turbo", {
      audio: {
        body: audio.stream(),
        contentType: audio.type || "application/octet-stream"
      },
      task: "transcribe",
      vad_filter: true,
      condition_on_previous_text: false
    });
    const transcript = normalizeTranscript(transcription.text);
    if (!transcript) {
      throw new Error("Workers AI returned no speech.");
    }
    return completeEntry(request, env, room, code, playerId, transcript, revision);
  } catch (error) {
    await roomAction(room, "entry-failed", { playerId, revision, error: "Workers AI could not hear a prompt." }).catch(
      () => undefined
    );
    console.error("Speech transcription failed", {
      code,
      playerId,
      error: error instanceof Error ? error.message : String(error)
    });
    return json({ error: "Workers AI could not hear a prompt." }, 502);
  }
}

async function completeEntry(
  request: Request,
  env: Env,
  room: DurableObjectStub,
  code: string,
  playerId: string,
  transcript: string,
  revision: number
): Promise<Response> {

  try {
    const generating = await roomAction(room, "entry-generating", { playerId, transcript, revision });
    if (!generating.ok) {
      await roomAction(room, "entry-failed", { playerId, revision, error: "Prompt preparation failed." });
      return generating;
    }

    const snapshot = await generating.clone().json<unknown>();
    const finalPrompt = readGenerationPrompt(snapshot, playerId, revision);
    if (!finalPrompt) {
      throw new Error("The room did not return a final prompt.");
    }

    const imageUrl = new URL(`/api/rooms/${code}/images/${encodeURIComponent(playerId)}?revision=${revision}`, request.url).toString();
    const imageResponse = await generateImage(env, finalPrompt, hash(`${code}:${playerId}:${revision}`));
    const imageKey = `rooms/${code}/${playerId}/${revision}`;
    await env.IMAGES.put(imageKey, await imageResponse.clone().arrayBuffer(), {
      httpMetadata: { contentType: imageResponse.headers.get("content-type") ?? "application/octet-stream" }
    });

    const ready = await roomAction(room, "entry-ready", {
      playerId,
      revision,
      originalImageKey: imageKey,
      imageUrl
    });
    if (!ready.ok) {
      await roomAction(room, "entry-failed", { playerId, revision, error: "Image generation finished too late." });
    }
    return ready;
  } catch (error) {
    await roomAction(room, "entry-failed", { playerId, revision, error: "Workers AI could not generate this image." }).catch(
      () => undefined
    );
    console.error("Image generation failed", {
      code,
      playerId,
      error: error instanceof Error ? error.message : String(error)
    });
    return json({ error: "Workers AI could not generate this image." }, 502);
  }
}

async function generatedImage(
  request: Request,
  env: Env,
  room: DurableObjectStub,
  code: string,
  playerId: string
): Promise<Response> {
  const stateResponse = await room.fetch(new Request("https://room.internal/state"));
  const snapshot = await stateResponse.json<unknown>().catch(() => undefined);
  const image = readCurrentImage(snapshot, playerId);
  const requestedRevision = Number(new URL(request.url).searchParams.get("revision"));
  if (!stateResponse.ok || !image || requestedRevision !== image.revision) {
    return json({ error: "Image not found." }, 404);
  }

  const object = await env.IMAGES.get(image.key);
  if (!object) return json({ error: "Image not found." }, 404);
  const headers = new Headers({ "cache-control": "public, max-age=31536000, immutable", "x-content-type-options": "nosniff" });
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  return new Response(object.body, { headers });
}

async function generateImage(env: Env, prompt: string, seed: number): Promise<Response> {
  const form = new FormData();
  form.append("prompt", prompt);
  form.append("width", "1024");
  form.append("height", "1024");
  form.append("seed", String(seed));

  const serialized = new Response(form);
  const contentType = serialized.headers.get("content-type");
  if (!serialized.body || !contentType) {
    throw new Error("Could not serialize image prompt.");
  }

  const result = await env.AI.run("@cf/black-forest-labs/flux-2-klein-4b", {
    multipart: {
      body: serialized.body,
      contentType
    }
  });
  if (!result.image) {
    throw new Error("Workers AI returned no image.");
  }

  const bytes = decodeBase64(result.image);
  const body = Uint8Array.from(bytes).buffer;
  return new Response(body, {
    headers: {
      "cache-control": "public, max-age=3600",
      "content-type": imageContentType(bytes),
      "x-content-type-options": "nosniff"
    }
  });
}

function readGenerationPrompt(snapshot: unknown, playerId: string, revision: number): string | null {
  if (!isRecord(snapshot) || !isRecord(snapshot.entries)) {
    return null;
  }

  const entry = snapshot.entries[playerId];
  return isRecord(entry) && entry.revision === revision && typeof entry.activePrompt === "string" ? entry.activePrompt : null;
}

function readCurrentImage(snapshot: unknown, playerId: string): { key: string; revision: number } | null {
  if (!isRecord(snapshot) || !isRecord(snapshot.entries)) {
    return null;
  }

  const entry = snapshot.entries[playerId];
  return isRecord(entry) && typeof entry.originalImageKey === "string" && typeof entry.imageRevision === "number"
    ? { key: entry.originalImageKey, revision: entry.imageRevision }
    : null;
}

async function finalizeWinner(env: Env, room: DurableObjectStub): Promise<Response> {
  const stateResponse = await room.fetch(new Request("https://room.internal/state"));
  const snapshot = await stateResponse.json<unknown>().catch(() => undefined);
  if (!stateResponse.ok || !isRecord(snapshot) || snapshot.phase !== "results" || typeof snapshot.code !== "string" || typeof snapshot.winnerPlayerId !== "string" || !Array.isArray(snapshot.players) || !isRecord(snapshot.entries)) {
    return json({ error: "Winner is not ready." }, 409);
  }

  const winner = snapshot.players.find((player) => isRecord(player) && player.id === snapshot.winnerPlayerId);
  const entry = snapshot.entries[snapshot.winnerPlayerId];
  if (!isRecord(winner) || typeof winner.name !== "string" || !isRecord(entry) || typeof entry.originalImageKey !== "string" || typeof entry.imageUrl !== "string" || typeof entry.finalPrompt !== "string") {
    return json({ error: "Winner image is unavailable." }, 409);
  }

  await env.GALLERY.prepare("INSERT OR IGNORE INTO winners (room_code, player_id, player_name, image_key, image_url, final_prompt, prompt_history, vote_count, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(snapshot.code, snapshot.winnerPlayerId, winner.name, entry.originalImageKey, entry.imageUrl, entry.finalPrompt, JSON.stringify(Array.isArray(entry.promptHistory) ? entry.promptHistory : []), typeof entry.voteCount === "number" ? entry.voteCount : 0, typeof snapshot.completedAt === "string" ? snapshot.completedAt : new Date().toISOString())
    .run();
  const completedAt = typeof snapshot.completedAt === "string" ? snapshot.completedAt : new Date().toISOString();
  const statements = snapshot.players
    .filter(isRecord)
    .filter((player) => typeof player.id === "string" && typeof player.name === "string")
    .map((player) => {
      const playerEntry = snapshot.entries[player.id as string];
      return env.GALLERY.prepare("INSERT OR IGNORE INTO game_players (room_code, player_id, player_name, won, image_url, completed_at) VALUES (?, ?, ?, ?, ?, ?)")
        .bind(snapshot.code, player.id, player.name, player.id === snapshot.winnerPlayerId ? 1 : 0, isRecord(playerEntry) && typeof playerEntry.imageUrl === "string" ? playerEntry.imageUrl : null, completedAt);
    });
  if (statements.length) await env.GALLERY.batch(statements);
  return json({ saved: true });
}

async function readEntryRevision(response: Response, playerId: string): Promise<number | null> {
  const snapshot = await response.clone().json<unknown>().catch(() => undefined);
  if (!isRecord(snapshot) || !isRecord(snapshot.entries)) {
    return null;
  }

  const entry = snapshot.entries[playerId];
  return isRecord(entry) && typeof entry.revision === "number" ? entry.revision : null;
}

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function imageContentType(bytes: Uint8Array): string {
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "image/png";
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
    return "image/webp";
  }
  return "application/octet-stream";
}

async function roomAction(room: DurableObjectStub, action: string, payload: Record<string, unknown>): Promise<Response> {
  return room.fetch(
    new Request(`https://room.internal/actions/${action}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    })
  );
}

async function mockImage(room: DurableObjectStub, code: string, playerId: string): Promise<Response> {
  const stateResponse = await room.fetch(new Request("https://room.internal/state"));
  if (!stateResponse.ok) {
    return json({ error: "Mock image not found." }, 404);
  }

  const snapshot = await stateResponse.json<unknown>().catch(() => undefined);
  if (!isRecord(snapshot) || !Array.isArray(snapshot.players) || !isRecord(snapshot.entries)) {
    return json({ error: "Room state is unavailable." }, 502);
  }

  const entry = snapshot.entries[playerId];
  const player = snapshot.players.find(
    (candidate): candidate is Record<string, unknown> => isRecord(candidate) && candidate.id === playerId
  );
  if (!isRecord(entry) || !player || entry.status !== "ready" || typeof player.name !== "string") {
    return json({ error: "Mock image not found." }, 404);
  }

  const transcript = typeof entry.transcript === "string"
    ? entry.transcript
    : typeof entry.finalPrompt === "string"
      ? entry.finalPrompt
      : "Prompt Royale";

  return new Response(renderMockSvg(code, player.name, transcript), {
    headers: {
      "cache-control": "public, max-age=31536000, immutable",
      "content-type": "image/svg+xml; charset=UTF-8",
      "x-content-type-options": "nosniff"
    }
  });
}

function renderMockSvg(code: string, playerName: string, transcript: string): string {
  const seed = hash(`${code}:${playerName}:${transcript}`);
  const hue = seed % 360;
  const accentHue = (hue + 115) % 360;
  const lines = wrapText(transcript, 30, 3);
  const lineMarkup = lines
    .map((line, index) => `<tspan x="80" dy="${index === 0 ? 0 : 48}">${escapeXml(line)}</tspan>`)
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" role="img" aria-labelledby="title description">
  <title id="title">Mock image for ${escapeXml(playerName)}</title>
  <description id="description">${escapeXml(transcript)}</description>
  <defs>
    <linearGradient id="background" x1="0" y1="0" x2="1" y2="1">
      <stop stop-color="hsl(${hue} 82% 58%)"/>
      <stop offset="1" stop-color="hsl(${accentHue} 88% 48%)"/>
    </linearGradient>
    <filter id="shadow"><feDropShadow dx="12" dy="14" stdDeviation="0" flood-color="#171221"/></filter>
  </defs>
  <rect width="800" height="800" fill="url(#background)"/>
  <circle cx="${130 + (seed % 90)}" cy="${120 + (seed % 70)}" r="105" fill="#ffe34f" stroke="#171221" stroke-width="14"/>
  <path d="M560 80l38 90 96 10-73 63 23 94-84-49-84 49 23-94-73-63 96-10z" fill="#ff77b7" stroke="#171221" stroke-width="14"/>
  <rect x="68" y="288" width="664" height="368" rx="42" fill="#fff7e6" stroke="#171221" stroke-width="14" filter="url(#shadow)"/>
  <text x="80" y="356" fill="#171221" font-family="Arial Black, Arial, sans-serif" font-size="24" font-weight="900">PROMPT ROYALE MOCK</text>
  <text x="80" y="436" fill="#171221" font-family="Arial, sans-serif" font-size="38" font-weight="800">${lineMarkup}</text>
  <text x="80" y="608" fill="#171221" font-family="Arial Black, Arial, sans-serif" font-size="28">${escapeXml(playerName)} / ${escapeXml(code)}</text>
</svg>`;
}

function mockBrief(code: string): string {
  return MOCK_BRIEFS[hash(code) % MOCK_BRIEFS.length];
}

function normalizeTranscript(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length >= 1 && normalized.length <= 500 ? normalized : null;
}

function wrapText(value: string, maximumLength: number, maximumLines: number): string[] {
  const words = value.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];

  for (const word of words) {
    const next = lines.length === 0 ? word : `${lines[lines.length - 1]} ${word}`;
    if (next.length <= maximumLength) {
      if (lines.length === 0) {
        lines.push(word);
      } else {
        lines[lines.length - 1] = next;
      }
    } else if (lines.length < maximumLines) {
      lines.push(word.slice(0, maximumLength));
    }
  }

  if (words.join(" ").length > lines.join(" ").length && lines.length > 0) {
    lines[lines.length - 1] = `${lines[lines.length - 1].slice(0, maximumLength - 3)}...`;
  }

  return lines;
}

function hash(value: string): number {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function escapeXml(value: string): string {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function readActionPayload(request: Request): Promise<Record<string, unknown> | Response> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return json({ error: "Expected an application/json request." }, 415);
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_ACTION_BODY_BYTES) {
    return json({ error: "Request body is too large." }, 413);
  }

  const reader = request.body?.getReader();
  if (!reader) {
    return json({ error: "Expected a JSON object." }, 400);
  }

  const decoder = new TextDecoder();
  let size = 0;
  let body = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      body += decoder.decode();
      break;
    }

    size += value.byteLength;
    if (size > MAX_ACTION_BODY_BYTES) {
      await reader.cancel();
      return json({ error: "Request body is too large." }, 413);
    }
    body += decoder.decode(value, { stream: true });
  }

  try {
    const payload: unknown = JSON.parse(body);
    return isRecord(payload) ? payload : json({ error: "Expected a JSON object." }, 400);
  } catch {
    return json({ error: "Expected a JSON object." }, 400);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function createQrCode(requestUrl: URL): Promise<Response> {
  const value = requestUrl.searchParams.get("url");

  try {
    const target = value ? new URL(value) : null;
    const roomMatch = target ? /^\/room\/([a-z0-9]{6})$/i.exec(target.pathname) : null;
    if (
      !target ||
      target.origin !== requestUrl.origin ||
      target.search ||
      target.hash ||
      !roomMatch ||
      !isRoomCode(roomMatch[1].toUpperCase())
    ) {
      return json({ error: "Enter a valid room URL." }, 400);
    }

    const roomUrl = new URL(`/room/${roomMatch[1].toUpperCase()}`, requestUrl.origin).toString();

    const svg = await renderQrCode(roomUrl, {
      type: "svg",
      errorCorrectionLevel: "M",
      margin: 1,
      color: { dark: "#171221", light: "#ffffff" }
    });

    return new Response(svg, {
      headers: {
        "cache-control": "public, max-age=3600",
        "content-type": "image/svg+xml; charset=UTF-8",
        "x-content-type-options": "nosniff"
      }
    });
  } catch {
    return json({ error: "Enter a valid room URL." }, 400);
  }
}

function createRoomCode(): string {
  const values = new Uint32Array(6);
  crypto.getRandomValues(values);

  return Array.from(values, (value) => ROOM_CODE_ALPHABET[value % ROOM_CODE_ALPHABET.length]).join("");
}

function isRoomCode(value: string): boolean {
  return ROOM_CODE_PATTERN.test(value);
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json; charset=UTF-8" }
  });
}
