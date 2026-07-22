import { Room, isRoomCode } from "./room";
import { renderApp } from "./site";

export interface Env {
  ROOMS: DurableObjectNamespace<Room>;
}

const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const MAX_CREATE_ATTEMPTS = 5;

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/api/rooms") {
      return createRoom(env);
    }

    const roomApiMatch = /^\/api\/rooms\/([a-z0-9]{6})\/(state|live)$/i.exec(url.pathname);
    if (request.method === "GET" && roomApiMatch) {
      const code = roomApiMatch[1].toUpperCase();

      if (!isRoomCode(code)) {
        return json({ error: "Enter a valid six-character room code." }, 400);
      }

      return env.ROOMS.getByName(code).fetch(request);
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

export { Room };

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

function createRoomCode(): string {
  const values = new Uint32Array(6);
  crypto.getRandomValues(values);

  return Array.from(values, (value) => ROOM_CODE_ALPHABET[value % ROOM_CODE_ALPHABET.length]).join("");
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json; charset=UTF-8" }
  });
}
