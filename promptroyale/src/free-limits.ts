export interface ServiceProblem {
  code: string;
  error: string;
  status: number;
  resetAt?: string;
}

export function nextDailyReset(now = Date.now()): string {
  const date = new Date(now);
  date.setUTCHours(24, 0, 0, 0);
  return date.toISOString();
}

export function dailyImageLimit(): ServiceProblem {
  return { code: "FREE_AI_LIMIT", status: 429, resetAt: nextDailyReset(),
    error: "Today's shared free image allowance is used up. Image creation is paused to keep this game free. Come back after 00:00 UTC; existing images can still be viewed and voted on." };
}

export function serviceProblem(error: unknown): ServiceProblem | null {
  // Cloudflare bindings can wrap the provider error in Error.cause.
  const messages: string[] = [];
  let current: unknown = error;
  for (let i = 0; i < 4 && current; i++) {
    if (typeof current === "object") {
      const record = current as Record<string, unknown>;
      messages.push(String(record.message ?? ""), String(record.code ?? ""));
      current = record.cause;
    } else { messages.push(String(current)); break; }
  }
  const message = messages.join(" ");
  if (/\b3036\b|daily free allocation.*neurons|neurons.*daily.*(?:limit|allocation)/i.test(message)) return dailyImageLimit();
  if (/SQLITE_FULL|database or disk is full|(?:maximum|total|account).*storage limit/i.test(message)) {
    return { code: "FREE_STORAGE_LIMIT", status: 503,
      error: "The game's free storage limit has been reached. New play is paused until space is available. Please try again later; the host may need to clear old data." };
  }
  if (/(?:daily|free tier|free plan).*(?:limit|quota).*(?:exceed|reach)|(?:exceed|reach).*(?:daily|free tier|free plan).*(?:limit|quota)/i.test(message)) {
    return { code: "FREE_SERVICE_LIMIT", status: 429, resetAt: nextDailyReset(),
      error: "The game's shared Cloudflare free-plan daily limit has been reached. Play is paused to avoid paid usage. Please come back after 00:00 UTC." };
  }
  if (/\b3040\b|out of capacity/i.test(message)) {
    return { code: "AI_BUSY", status: 503, error: "The image service is busy, not out of today's allowance. Please try again in a minute." };
  }
  if (/\b5035\b|requires (?:a )?Workers Paid plan/i.test(message)) {
    return { code: "FREE_MODEL_UNAVAILABLE", status: 503, error: "This AI model is no longer available on the free plan. Image creation is paused; the host needs to update the game. No paid fallback is enabled." };
  }
  return null;
}

export function problemResponse(problem: ServiceProblem): Response {
  const headers = new Headers({ "content-type": "application/json; charset=UTF-8", "cache-control": "no-store" });
  if (problem.resetAt) headers.set("retry-after", String(Math.max(1, Math.ceil((Date.parse(problem.resetAt) - Date.now()) / 1000))));
  return new Response(JSON.stringify(problem), { status: problem.status, headers });
}
