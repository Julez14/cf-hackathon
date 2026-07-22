# Prompt Royale Phase 2

## Product Requirements Document

| Field | Value |
| --- | --- |
| Status | Draft |
| Owner | Julian Laxman |
| Type | Phase 2 product requirements |
| Date | 22 Jul 2026 |
| Working title | Prompt Royale: Image Evolution |
| One-liner | Friends evolve one image through live voice-driven rounds. |

## 1. Executive Summary

Phase 1 defines a game where a group creates one shared brief, generates competing image branches with voice prompts, and votes for a winner in one live round. Phase 2 turns that moment into a replayable game: the winning branch becomes the next round's shared image, and the final result becomes a lightweight, shareable recap.

The product goal remains a social, projector-first game for two to four people. Phase 2 adds durable background processing, safer public event modes, and operational visibility without moving live room authority out of the Durable Object. It expands the Cloudflare story with AI Gateway, Queues, Workflows, Turnstile, Cloudflare Access, Workers Analytics Engine, and Browser Run while preserving Workers, Durable Objects, Workers AI, R2, Cloudflare Images, and D1 as the core platform.

## 2. Background

The Phase 1 game ends when a room selects a winning image. That creates a satisfying reveal, but it does not fulfill the product's working promise that friends can evolve a shared image together. Players cannot build on the winning interpretation, revisit the path their ideas took, or share a final result that explains the game.

The first implementation also runs model work directly on the request path. That is appropriate for a four-hour MVP, but it gives an organizer little visibility into model errors or cost, offers no controlled retry path for transient failures, and is not suitable for an open event where automated users can trigger expensive work.

Phase 2 addresses those limits while keeping the game fast and legible: a Durable Object still decides whose turn it is, which image won, and what every browser sees. Other Cloudflare products add resilience, access control, measurement, and shareable output around that authoritative loop.

## 3. Problem

People playing Prompt Royale need the winning image to matter after the vote. Without a next round, a strong visual branch is discarded immediately and the game's central idea stops short of genuine collaboration.

Event organizers also need a way to run the game beyond a trusted hackathon audience. A public room-creation endpoint can be abused to spend model capacity, a failed inference has no reliable retry path, and the team cannot tell whether players complete rounds, reach voting, or share the result.

The product needs controlled image evolution and a reliable event mode without turning the game into an account system, a social network, or a distributed job platform.

## 4. Phase 2 Goals

- Run two rounds by default, with an organizer-selectable maximum of three rounds.
- Promote the winning ready image from each round to the next round's immutable base image.
- Generate one image-edit branch per player from that round's base image and the player's transcribed voice instruction.
- Keep the live game responsive while model jobs are retried safely outside the browser request lifecycle.
- Let organizers run an invite-only event mode and a public event mode without adding player accounts.
- Produce a durable replay page and branded share card after a completed game.
- Measure round completion, generation latency and failure, voting completion, and result-sharing as aggregate operational events.
- Make AI inference cost, failure, and rate behavior visible to operators.

## 5. Non-Goals

- Public matchmaking, open-ended social feeds, player profiles, or persistent leaderboards.
- More than four active players per room.
- Continuous audio, WebRTC, video generation, or real-time image pixel streaming.
- Multiple competing image models, bring-your-own model keys, or user-facing model controls.
- Automatic content review as a substitute for curated themes and event moderation.
- Moving room phases, timers, votes, or winner selection from the Durable Object to Queues, Workflows, D1, or the browser.
- Treating Workers Analytics Engine as the source of truth for game records.

## 6. Users and Roles

| Role | Needs | Phase 2 capabilities |
| --- | --- | --- |
| Group leader | Keep the game moving and make each round feel connected. | Starts a two- or three-round game, sees the current base image, and advances through results. |
| Player | See that their spoken instruction creates a distinct, fair branch. | Submits one short voice edit per round, sees live status, votes, and follows the image evolution. |
| Spectator | Understand the game immediately on a projector or recap link. | Watches the room, sees each branch and winner, and opens the final replay or share card. |
| Event organizer | Run a safe, observable game without managing player accounts. | Chooses public or invite-only mode, reviews aggregate outcomes, and can share a completed-game link. |

## 7. Core Experience

### Step 1: Create a Protected Room

The group leader creates a room. In public event mode, the browser completes a Turnstile challenge before the public Worker accepts a room-creation or generation-submission request. The Worker validates the token server-side before performing costly work.

In invite-only mode, Cloudflare Access protects the organizer and event host surface. Public player participation remains a separate mode so the product does not require player accounts.

### Step 2: Start Round One

The leader starts a room with a curated theme and a curated starting image stored in R2. The Room Durable Object stores the image key as the immutable base image for round one and broadcasts the countdown.

### Step 3: Create Branches

Each player records one short voice instruction. The public Worker verifies the player and phase with the Room Durable Object, transcribes the clip with Workers AI, and records the final prompt against that player's entry.

The Worker enqueues an image-generation job containing the room code, round number, entry identifier, final prompt, and base-image key. Audio and image bytes are not placed in queue messages.

### Step 4: Generate and Reveal

A Queue consumer reads the job, obtains the base image from R2, calls the validated Workers AI image-editing model through AI Gateway, and stores the resulting original in R2. It creates a display-ready Cloudflare Images asset, then reports the image references back to the Room Durable Object.

The Durable Object accepts a result only when it matches the active round and entry. It broadcasts `generating`, `ready`, or `failed` status to every connected browser. Queued retries never create a second branch for the same entry.

### Step 5: Vote and Evolve

The room votes after all entries reach a terminal state or the generation deadline expires. The Durable Object resolves the winner using the existing deterministic rule. If a ready branch wins and another round remains, its R2 key becomes the next round's base image. The next round starts from that exact image for every player.

### Step 6: Publish the Recap

When the final round ends, the public Worker starts one Workflow for the completed room. The Workflow persists the completed replay metadata to D1, writes a final recap manifest to R2, generates a share card with Browser Run, and records the card's delivery URL. None of these steps block the live results screen.

## 8. Functional Requirements

### Image Evolution

- A game contains two rounds by default and may contain three when selected before the game starts.
- Each round has exactly one immutable base image key stored by the Room Durable Object.
- Every ready branch in a round is generated from that round's base image and that entry's final voice-derived instruction.
- The winning ready branch becomes the next base image only after voting closes.
- A failed branch cannot receive votes or become a future base image.
- If every branch fails, the leader can retry eligible generation jobs with the same base image and final prompts or end the game.
- The final replay displays each round's base image, player branches, transcripts, vote totals, and winner.

### Reliable Generation

- The public Worker reserves the entry with the Room Durable Object before queuing a generation job.
- Queue messages include a stable job identifier and contain references and text only, never audio or image binaries.
- Queue consumers are idempotent because Cloudflare Queues provides at-least-once delivery.
- A retry may replace a failed or unfinished attempt for the same active entry, but it must not create another voteable branch.
- The Room Durable Object remains the sole authority for whether a queued result is accepted, rejected as stale, or shown to players.
- The generation deadline remains a Durable Object timer. A late result is retained for troubleshooting but is not inserted into a completed round.

### AI Observability and Cost Controls

- Workers AI transcription and image-edit calls run through AI Gateway.
- Each inference includes non-sensitive metadata for the room, round, model, and job outcome.
- Image-generation requests bypass AI Gateway caching so two game entries never receive a cached image unexpectedly.
- Operators can inspect aggregate inference latency, errors, rate behavior, and spend through AI Gateway.
- Raw player names, audio, and transcripts must not be added to AI Gateway metadata. Logging retention and access must be decided before enabling prompt or response logging.

### Public and Invite-Only Modes

- Public mode validates Turnstile server-side for room creation and image-generation submission.
- Turnstile validation occurs immediately before the protected action because challenge tokens are single-use and expire.
- Invite-only mode protects the organizer/event host surface with Cloudflare Access and an explicit allow policy.
- Access is not used as the player-identity system for public games.
- A failed Turnstile or Access check returns a clear, non-model error and does not reserve an entry or enqueue work.

### Replay and Sharing

- Every completed game has a durable replay record in D1 and a recap manifest in R2.
- The replay uses Cloudflare Images delivery URLs for responsive arena and gallery rendering.
- A post-game Workflow creates one branded share card from the final recap using Browser Run.
- A Browser Run failure does not affect the completed game, results screen, or replay data. The workflow retries the card step and records a safe fallback state.
- The final public URL exposes only the fields intended for spectators. Original audio clips are never included.

### Measurement

- The public Worker writes aggregate game events to Workers Analytics Engine without player names, raw transcripts, or image contents.
- Required events include room created, round started, transcription completed or failed, generation completed or failed, voting completed or expired, game completed, replay opened, and share card opened.
- Workers Analytics Engine is used for product and operational measurement only. D1 remains the completed-game record of truth.

## 9. Cloudflare Product Architecture

| Product | Phase 2 responsibility | Explicit boundary |
| --- | --- | --- |
| Cloudflare Workers | Serves the application, validates public actions, coordinates bindings, and starts post-game work. | Does not own game authority or store image bytes in memory longer than needed. |
| Durable Objects and WebSockets | Own one room's phases, deadlines, entries, votes, winner, and live broadcasts. | Does not run image jobs or retain media binaries. |
| Workers AI | Transcribes voice clips and creates image-edit branches. | Uses one validated image-editing model; no player-selectable models. |
| AI Gateway | Provides inference observability, rate controls, and cost controls for Workers AI calls. | Does not decide room state; image requests skip cache. |
| R2 | Stores original starting images, branch images, recap manifests, and share-card originals. | Does not determine game state or voting. |
| Cloudflare Images | Creates and delivers display-ready image variants. | Does not replace R2 as the source original. |
| D1 | Stores completed-game metadata and replay records. | Is never on the live timer, vote, or winner path. |
| Cloudflare Queues | Buffers and retries independent image-generation jobs. | Does not authorize jobs or decide whether a result is current. |
| Cloudflare Workflows | Runs ordered, durable post-game publication steps. | Does not manage the live round or carry image binaries as workflow state. |
| Cloudflare Turnstile | Reduces automated costly actions in public mode. | Is verified server-side; it is not player identity. |
| Cloudflare Access | Protects invite-only organizer and event-host surfaces. | Does not replace room membership or public-event controls. |
| Workers Analytics Engine | Captures aggregate completion, latency, failure, and sharing metrics. | Is not a transactional or replay data store. |
| Browser Run | Produces a final branded share card from the recap view. | Runs after results and never blocks a game. |

```text
Browser -- Turnstile --> Public Worker --> Room Durable Object --> WebSockets
                              |                   |
                              |                   +--> authoritative room state
                              |
                              +--> Workers AI transcription via AI Gateway
                              |
                              +--> Cloudflare Queue --> generation consumer
                                                        |
                                                        +--> R2 base image
                                                        +--> Workers AI image editing via AI Gateway
                                                        +--> R2 originals + Cloudflare Images
                                                        +--> Room Durable Object status update
                              |
                              +--> Workers Analytics Engine
                              |
                              +--> post-game Workflow --> D1 + R2 recap + Browser Run share card

Cloudflare Access --> organizer and invite-only event surface
```

## 10. Core Decisions

- Phase 2 requires a completed Phase 1 single-round game before multi-round play is enabled.
- The Room Durable Object remains the authoritative source for all live game rules and state.
- Phase 2 introduces image-to-image editing only to make the winning image the next round's base image. It does not introduce model comparison or user-tunable generation controls.
- A Queue is used for independent generation jobs; a Workflow is used only for the ordered post-game publication sequence. They are complementary, not interchangeable.
- All Queue and Workflow side effects must be idempotent because their work may retry.
- AI Gateway is required for Phase 2 inference visibility and control, but caching is disabled for generative image calls.
- Turnstile protects expensive public actions. Cloudflare Access protects organizer and invite-only deployment modes.
- No new Worker workspace is required. The existing public Worker can consume generation jobs and start Workflows; the private room Worker continues to own the Durable Object.

## 11. What We Are Releasing

### Player Action: Evolve an Image

| Step | Action | Outcome |
| --- | --- | --- |
| 1 | Join a room and wait for the leader to start. | The browser receives live room state through the Durable Object WebSocket. |
| 2 | Record one voice edit for the current round. | The Worker validates the player and records a single entry. |
| 3 | Wait for transcription and generation. | The panel shows a live status and, when ready, a branch based on the shared base image. |
| 4 | Vote for another ready branch. | The Durable Object records one valid vote and closes the round when eligible voting completes or times out. |
| 5 | Continue to the next round. | The winning image becomes the shared starting point for all players. |

### Organizer Action: Run an Event Mode

| Step | Action | Outcome |
| --- | --- | --- |
| Prerequisite | Choose public or invite-only event mode. | Public mode has Turnstile protection; invite-only organizer surfaces have an Access policy. |
| 1 | Set the round count and curated starting image/theme. | The game starts with a known, safe base image and a bounded duration. |
| 2 | Share the room link or projector view. | Players can join without creating product accounts. |
| 3 | Review aggregate outcomes after the event. | Analytics Engine and AI Gateway show completion, reliability, and inference behavior. |

### System Action: Publish a Final Recap

| Step | Action | Outcome |
| --- | --- | --- |
| 1 | Receive the final room state. | The Worker starts one idempotent Workflow for the completed room. |
| 2 | Persist replay metadata and manifests. | D1 and R2 hold a durable replay without affecting the finished result. |
| 3 | Render the share card. | Browser Run produces a branded card or the workflow records a retryable fallback. |
| 4 | Publish delivery URLs. | The replay can use Cloudflare Images variants and a final share card. |

## 12. Acceptance Criteria

- A room of two to four players can complete two connected rounds without refreshing.
- Every player sees the same base image at the start of each round.
- The next round's base image is exactly the prior round's winning ready image.
- A duplicate Queue delivery does not produce a duplicate branch, duplicate Room Durable Object update, or additional vote target.
- A transient generation failure can retry without blocking other players or changing live room authority.
- The results screen appears even if recap publication or share-card generation fails.
- Public creation and generation submission reject invalid Turnstile validation before AI work begins.
- Invite-only organizer routes deny users who do not match a Cloudflare Access allow policy.
- Operators can observe aggregate game funnel and inference outcomes without querying player names, raw transcripts, or image binaries.
- The final replay contains the full round-by-round image evolution and a share card when Browser Run succeeds.

## 13. Design Considerations

- The projector view should make the current shared base image visually distinct from player branches.
- Each round needs a compact evolution trail so spectators can see why the current base image exists without losing focus on active branches.
- The mobile player interface remains limited to joining, recording, viewing status, and voting.
- The results view should make a failed share-card render invisible to players; it is an organizer-facing operational state, not a game failure.
- Public-mode failures should explain the action that was blocked without exposing anti-abuse signals or model details.

## 14. Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| Image edits drift too far from the shared base image. | Validate one image-editing model with a fixed starting-image set before committing to the experience. Retain a curated image library for demos. |
| Queue retries create duplicate or stale results. | Use stable job and entry identifiers; have the Durable Object reject results for a non-active entry or round. |
| Queue delay makes a live round feel stalled. | Keep the generation deadline in the Durable Object, show entry-level status, and use Queues for reliability rather than batching for throughput. |
| AI Gateway logs expose player-provided text. | Use non-sensitive metadata only and set an explicit logging-retention and access policy before enabling content logs. |
| Turnstile adds friction during a live event. | Use the managed widget only on expensive actions and validate it server-side immediately before the action. |
| Access accidentally blocks public attendees. | Scope Access to organizer and invite-only host routes, not the public player route. |
| Browser Run is unavailable or rate-limited. | Make card generation asynchronous and retryable; never delay the results view or replay record. |
| Cloudflare Images is unavailable for the account. | Retain R2 originals and serve a Worker-backed fallback until Cloudflare Images delivery is available. |
| Analytics data is mistaken for authoritative records. | Keep completed game data in D1 and document Analytics Engine as aggregate, sampled telemetry. |

## 15. Rollout Plan

| Slice | Scope | Exit Criteria |
| --- | --- | --- |
| 2A: Evolution | Two rounds, image editing, Queue-backed generation, AI Gateway, and durable replay metadata. | A room completes two rounds with no duplicate branch under a simulated Queue retry. |
| 2B: Event Safety | Turnstile public mode, Access-protected organizer mode, and Analytics Engine instrumentation. | Public expensive actions validate server-side and organizers can see the game funnel. |
| 2C: Sharing | Workflow-driven recap publication, Browser Run card generation, and spectator replay. | A completed game publishes a replay without delaying the final result. |

## 16. Open Questions

- Which Workers AI image-editing model best preserves a shared base image while meeting live-demo latency expectations?
- Should the host choose between two and three rounds, or should every event default to two rounds until reliability data supports a third?
- What gallery retention period is appropriate for public event results and R2 originals?
- What information can safely be retained in AI Gateway logs, if any, for a game with player-generated speech?
- Does the invite-only mode need player-level Access policies, or is organizer-only protection sufficient for the first release?
- What retry budget and generation deadline preserve game pacing without wasting model capacity?

## 17. Out of Scope

- Global public discovery, matchmaking, and social follows.
- Paid competitions, prizes, or payment flows.
- Persistent player accounts, identity-based rankings, or cross-event leaderboards.
- Real-time collaborative image editing, masks, inpainting controls, or user-selected model parameters.
- Image or audio moderation guarantees beyond the curated-theme and event-control model.
- Email notifications, mobile native applications, or external social posting.

## 18. References

- [Phase 1 PRD](./PROMPT_ROYALE_PRD.md)
- [Phase 1 Functional Spec](./PROMPT_ROYALE_FUNCTIONAL_SPEC.md)
- [AI Gateway with Workers AI](https://developers.cloudflare.com/ai-gateway/usage/providers/workersai/)
- [Cloudflare Queues](https://developers.cloudflare.com/queues/)
- [Cloudflare Workflows](https://developers.cloudflare.com/workflows/)
- [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/)
- [Cloudflare Access self-hosted applications](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/)
- [Workers Analytics Engine](https://developers.cloudflare.com/analytics/analytics-engine/)
- [Browser Run](https://developers.cloudflare.com/browser-run/)
