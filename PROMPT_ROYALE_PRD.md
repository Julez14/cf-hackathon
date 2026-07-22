# Prompt Royale

## Product Requirements Document

| Field | Value |
| --- | --- |
| Status | Draft |
| Owner | Julian Laxman |
| Type | Hackathon MVP |
| Date | 22 Jul 2026 |
| Working title | Prompt Royale |
| One-liner | Friends compete to evolve a shared image with voice prompts. |

## 1. Executive Summary

Prompt Royale turns image generation from a solitary prompt box into a live multiplayer game. Two to four players join a room, receive the same creative brief, speak a short visual twist, and watch their generated image panels update live. The room then votes for the funniest, most creative, or most viral branch.

The MVP is designed for a four-hour build and a live hackathon presentation. Its technical story is as visible as its game loop: a Durable Object coordinates the room in real time while Workers AI transcribes prompts and creates images.

## 2. Problem

Most generative-image experiences are single-player and passive: one person writes a prompt, waits alone, and shares a finished result afterward. A group gathered around a screen has no shared state, no clear turn structure, and no reason to participate beyond taking turns at the same prompt box.

A social, real-time experience needs a canonical room state, immediate feedback, and an outcome that the entire group can influence. Simply putting several image generators side by side does not create a game. Prompt Royale makes the competition, audience, and visual reveal the product.

## 3. Goals

- Let two to four players create or join a room through a short code or QR link.
- Let a designated group leader start a timed round once enough players have joined.
- Give every player the same creative brief and one short push-to-talk opportunity to add a twist.
- Show each panel move through listening, transcribing, generating, and ready states in real time.
- Generate one distinct image per player from the shared brief plus that player's voice prompt.
- Run a live vote and announce one winner.
- Persist the completed room, entries, votes, and final images for a lightweight post-game gallery.

## 4. Non-Goals

- Continuous voice conversation or WebRTC audio streaming.
- User accounts, profiles, social-login integrations, or public feeds.
- Multiple model comparison, image-to-image editing, or model-specific tuning controls.
- Multi-round tournaments, persistent leaderboards, or paid prizes.
- Progressive pixel-by-pixel image streaming; panels should instead show clear status changes until an image is ready.

## 5. Users and Roles

| Role | Responsibilities |
| --- | --- |
| Group leader | Creates the room, shares its code or QR link, and starts the round. |
| Player | Joins the room, records one short voice prompt, views every generated panel, and casts one vote. |
| Spectator | May view the room and results during a presentation but does not submit or vote in the MVP. |

## 6. Core User Flow

### Step 1: Landing Page

A visitor creates a room or enters an existing room code.

### Step 2: Lobby

The room displays joined players, the leader, and a QR code. The leader can start only when at least two players are present. Rooms support a maximum of four players for a clear 2 x 2 arena.

### Step 3: Creative Brief

The leader starts the round and every player immediately sees the same base brief, for example: "A dog running through a field."

### Step 4: Player Prompt

Each player types or records a short twist, for example: "but it is a 1980s action movie." The system builds a generation prompt from the base brief plus the player's twist.

### Step 5: Live Generation

Each player panel broadcasts its current status to the room. Images reveal independently as they complete. Voting begins after every player entry is ready or failed.

### Step 6: Vote and Result

Every player receives one vote and cannot vote for their own entry. The room reveals the winning image, vote count, and final prompt.

### Step 7: Persist and Share

The system saves the room outcome and final images. The result screen can be shown on a projector and later expanded into a shareable gallery.

## 7. Functional Requirements

### Room Lifecycle

- Create a unique, short room code.
- Join an open room by code or QR-derived URL.
- Track player presence and leader assignment in real time.
- Enforce a maximum of four players and one active round per room.
- Enforce room phases: `lobby`, `prompting`, `generating`, `voting`, and `results`.

### Voice and Generation

- Capture a short browser-recorded audio clip per player.
- Transcribe the clip with Workers AI.
- Generate one image from the shared brief plus the transcription using one Workers AI image model.
- Show transcription and generation failures without blocking the rest of the room.

### Voting

- Accept one vote per player during the voting phase.
- Reject self-votes and duplicate votes.
- Resolve ties deterministically and visibly.

### Persistence

- Store original generated-image binaries in R2.
- Upload display-ready image assets to Cloudflare Images and use delivery URLs in the arena and result view.
- Record completed-room metadata, entries, image references, votes, and winner in D1.

## 8. Technical Approach

### Cloudflare Workers

Serve the application, expose room and media endpoints, call Workers AI, and coordinate persistence. Store any model credentials and service tokens as Worker secrets.

### Durable Objects

Create one Durable Object per room. It is the authoritative source for room state, timers, player presence, prompt submissions, generation status, votes, and WebSocket broadcasts. Durable Object state, not D1, determines the live result.

### Workers AI

Use one speech-to-text model and one text-to-image model. The first implementation must validate both model bindings before frontend polish begins.

### R2

Store original generated image assets under a room and entry key structure.

### Cloudflare Images

Store or serve display-optimized variants for the arena grid and result screen.

### D1

Persist only completed-game records and gallery metadata. D1 is not on the real-time voting or timer path.

## 9. MVP Acceptance Criteria

- Four devices can join the same room and see lobby changes without refreshing.
- The leader can start one complete round.
- Each player can submit a short voice prompt and receive a distinct generated image.
- All devices see panel status and image completion in real time.
- Votes are counted once per player and a winner is announced consistently on every device.
- The winning result and image references persist after the room completes.
- A live demo can complete in under three minutes excluding model-provider latency.

## 10. Design Considerations

The arena is a projector-first 2 x 2 image grid with a prominent round timer. Mobile participants need only three primary controls: join, hold to talk, and vote. Every panel must make model work visible through simple states rather than a blank wait.

The creative brief should be playful and broad enough to create distinct branches. The vote labels should reward interpretation rather than technical image quality: Most Unhinged, Best Plot Twist, or Most Likely to Go Viral.

## 11. Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| Model latency | Show live generation status and allow a fixed generation grace period before voting. |
| Speech transcription failure | Show the captured transcript before submission when possible and allow a typed fallback only if it can be added without disrupting the core loop. |
| Cloudflare Images entitlement | Verify account access before relying on hosted delivery; retain R2 originals as the fallback. |
| Abusive prompts | Use a curated base brief for the MVP and keep rooms limited to the hackathon audience. |
| Duplicate or late actions | Durable Object phase checks reject actions outside the current room state. |

## 12. Out of Scope

- Public discovery and unauthenticated global matchmaking.
- Persistent player identity and cross-room rankings.
- Third-party model comparisons and bring-your-own API keys.
- Continuous real-time audio, live video, or external social posting.
- AI Gateway, Queues, Analytics Engine, Turnstile, Access, and share-card generation. These are follow-on additions after the core round works.

## 13. Follow-On Ideas

- AI Gateway for provider observability, rate limiting, and model fallback.
- Queues for resilient generation retries at larger room counts.
- Analytics Engine for round-completion and viral-share metrics.
- Turnstile and Access for protected public or internal deployment modes.
- Multi-round brackets, shareable image-evolution trees, and public galleries.
