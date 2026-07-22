# Prompt Royale Decisions

Record important product, architecture, implementation, and model decisions here. Keep entries concise and durable; do not add temporary task notes or session history.

## 2026-07-22: Use FLUX.2 [klein] 4B for image generation

**Status:** Accepted

**Decision:** Use the Workers AI model `@cf/black-forest-labs/flux-2-klein-4b` for the MVP's image generation.

**Rationale:** The model is optimized for latency-critical, real-time workflows with a fixed four-step inference process. It is the best fit among Workers AI-hosted models for showing independently generated player images quickly during a live game.

**Consequences:**

- The public Worker will send multipart requests to Workers AI.
- The MVP uses the model for text-to-image generation only. Its reference-image editing capability is not exposed because image-to-image editing is outside the current MVP scope.
- Do not add a quality fallback or a second image model; the MVP supports one image model.

**Alternatives considered:** `@cf/black-forest-labs/flux-2-klein-9b` offers enhanced quality, but its higher cost makes it less suitable as the default for this latency-sensitive MVP.

**Source:** [FLUX.2 [klein] 4B on Workers AI](https://developers.cloudflare.com/changelog/post/2026-01-15-flux-2-klein-4b-workers-ai/)

## 2026-07-22: Keep bonus Cloudflare integrations off the core game path

**Status:** Accepted

**Decision:** Implement AI Gateway, Cloudflare Queues, Cloudflare Workflows, Turnstile, Cloudflare Access, Workers Analytics Engine, and Browser Run as an optional post-game Royal Recap feature. The feature is enabled only through public-Worker bonus routes and does not modify Room Durable Object state.

**Rationale:** These integrations are included for hackathon bonus points. A failure, unavailable entitlement, or configuration error must not prevent the live game from creating rooms, generating player images, voting, or showing results.

**Consequences:**

- The Room Durable Object does not gain bonus actions, storage fields, alarms, or WebSocket events.
- Core transcription and image generation do not route through AI Gateway, Queues, or Workflows.
- Turnstile and Cloudflare Access protect optional recap surfaces only.
- Recap work uses an explicit feature flag, idempotent identifiers, and safe failure states outside the completed room.

**Alternatives considered:** Put Queues and AI Gateway in the generation path, and use Turnstile on room creation. Rejected because either approach makes a bonus integration a dependency of the hackathon demo.

## 2026-07-22: Use the real room flow with mock image generation

**Status:** Superseded by the Workers AI image path

**Decision:** Drive the real Durable Object phases through public Worker actions while returning deterministic, same-origin SVG images from typed transcripts.

**Rationale:** This makes room creation, countdowns, entry status, voting, and results testable end to end before audio transcription and Workers AI image generation are connected.

**Consequences:**

- The public Worker exposes `start`, `mock-entry`, and `vote` actions.
- Mock entries use the same Durable Object state transitions as future AI-backed entries.
- The mock SVG path will be replaced by Workers AI and image storage without changing authoritative game rules.

## 2026-07-22: Use cache-backed Workers AI images for the playable MVP

**Status:** Accepted temporarily

**Decision:** Generate player images with `@cf/black-forest-labs/flux-2-klein-4b`, cache them behind same-origin Worker URLs, and regenerate from the Durable Object's final prompt after a cache miss.

**Rationale:** The game needs real AI images now, while R2, Cloudflare Images, and D1 persistence can follow after the live game works.

**Consequences:**

- Typed and recorded voice prompts share the same image-generation path.
- Generated images are not durable and may be regenerated after cache eviction.
- The Durable Object continues to store only metadata and the exact final prompt.

## 2026-07-22: Authenticate room actions with player session tokens

**Status:** Accepted

**Decision:** Give each player a random per-room session token, store only its SHA-256 hash in the Durable Object, and require the token for player-owned mutations.

**Rationale:** Room snapshots expose player IDs, so IDs alone cannot safely authorize leader actions, submissions, or votes.

**Consequences:**

- The browser keeps the token in local storage and sends it when opening the room WebSocket.
- The Durable Object never broadcasts raw tokens or token hashes.
- The public Worker forwards the token for `start`, `reserve-entry`, and `vote` validation.

## 2026-07-22: Start prompting immediately and wait for every player

**Status:** Accepted

**Decision:** Starting a round immediately reveals the creative brief. There is no countdown or prompt deadline. Voting opens after every player entry is ready or failed.

**Rationale:** Removing timers keeps the live demo simple and lets every player finish their prompt before the game advances.

**Consequences:**

- A room can remain in prompting if a player never submits.
- Entry status updates show the room who is still working.
- The voting deadline remains unchanged.
