import { renderApp } from "./site";
import { toString as renderQrCode } from "qrcode";

export interface Env {
  ROOMS: DurableObjectNamespace;
}

const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ROOM_CODE_PATTERN = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;
const MAX_CREATE_ATTEMPTS = 5;

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/api/rooms") {
      return createRoom(env);
    }

    if (request.method === "GET" && url.pathname === "/api/qr") {
      return createQrCode(url);
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
