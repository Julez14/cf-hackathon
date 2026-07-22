# Prompt Royale Phase 2

## Product Requirements Document

| Field | Value |
| --- | --- |
| Status | Draft |
| Owner | Julian Laxman |
| Type | Hackathon bonus integrations |
| Date | 22 Jul 2026 |
| Working title | Prompt Royale: Royal Recap |
| One-liner | Create an optional share card after a completed game. |

## 1. Executive Summary

Phase 2 is a set of isolated Cloudflare bonus integrations for the hackathon. It does not expand the core game loop. Players must still be able to create a room, join, submit one voice prompt, generate an image, vote, and view results when every Phase 2 integration is disabled or unavailable.

The single optional feature is a post-game Royal Recap. After a room reaches results, an organizer may request a short recap caption and a branded share card. The request runs in a separate background pipeline and can fail without changing the completed game.

This scope demonstrates AI Gateway, Cloudflare Queues, Cloudflare Workflows, Turnstile, Cloudflare Access, Workers Analytics Engine, and Browser Run. Workers, Durable Objects, Workers AI, R2, Cloudflare Images, and D1 remain the core product architecture defined by the Phase 1 PRD.

## 2. Core Protection Contract

The Phase 1 PRD and functional specification remain the source of truth for the live game.

| Core behavior | Phase 2 rule |
| --- | --- |
| Room creation, joining, and WebSocket presence | Must not read a Phase 2 binding or wait for a Phase 2 request. |
| Countdown, prompts, generation status, voting, and winner selection | Remain entirely in the Room Durable Object. No Queue, Workflow, Access policy, or analytics write may affect them. |
| Workers AI transcription and player-image generation | Continue on the existing core path. AI Gateway is not inserted into either call for this bonus scope. |
| Results screen | Appears as soon as the Durable Object finishes the game. It does not wait for recap generation. |
| Core failure handling | A Phase 2 failure is logged or shown only in the optional recap surface. It never changes a core response or room state. |

## 3. Problem

The core game produces a good projector moment but no compact artifact to share after the game. A simple recap card gives a hackathon demo a visible outcome without changing the room rules or asking players to create accounts.

The team also wants to demonstrate more Cloudflare products. Adding those products to room creation, image generation, or voting would increase the chance that a bonus integration breaks the demo. The integrations need their own bounded feature and failure mode.

## 4. Goals

- Let an organizer request a recap only after a room has reached results.
- Generate a short, optional caption from completed game metadata.
- Create a branded share card from the caption and winning image.
- Keep the recap pipeline asynchronous, retryable, idempotent, and isolated from the Room Durable Object.
- Protect the optional public recap request against automated use.
- Give organizers a protected bonus dashboard and aggregate event measurements.
- Leave the core game functional with every bonus binding disabled.

## 5. Non-Goals

- Changing Phase 1 room phases, timers, player limits, entry rules, voting, or winner selection.
- Multi-round games, image-to-image editing, persistent player accounts, or leaderboards.
- Requiring Turnstile or Cloudflare Access to create, join, play, or vote in a core room.
- Moving transcription or player-image generation to Cloudflare Queues, Cloudflare Workflows, or AI Gateway.
- Making a recap card required before a result can be considered complete.
- Using Workers Analytics Engine as a game or replay data store.

## 6. Core Experience

### Step 1: Finish the Core Game

The Room Durable Object announces results exactly as Phase 1 defines. The results screen is complete at this point.

### Step 2: Request a Royal Recap

An organizer optionally opens the bonus dashboard or selects "Create recap" from the finished results view. The separate recap request verifies that the room is complete. Public requests complete Turnstile verification before the Worker accepts the request.

The recap endpoint returns an acknowledgement quickly. If the endpoint is disabled, misconfigured, or unavailable, the core result remains usable and no room state changes.

### Step 3: Build the Recap Outside the Game

The public Worker sends a compact, non-sensitive completed-game reference to Cloudflare Queues. A Queue consumer starts a Cloudflare Workflow for that recap identifier. The Workflow reads the completed metadata, creates an optional one-sentence caption through AI Gateway, renders a card with Browser Run, and writes the optional assets and status to R2 and D1.

### Step 4: View or Share the Card

The results page may poll the separate recap-status endpoint or show a link when the card is ready. A failed recap shows a retryable bonus-feature message. It does not alter the winner, images, votes, or completed room record.

## 7. Additional Cloudflare Products

| Product | Small bonus use | Isolation rule |
| --- | --- | --- |
| AI Gateway | Runs one optional text-model call that turns the completed game metadata into a short recap caption. | Core transcription and player-image generation continue to call Workers AI directly. A caption failure produces no game failure. |
| Cloudflare Queues | Holds `recap.requested` messages after an organizer requests a recap. | Queues do not receive player media, generation jobs, votes, or Room Durable Object actions. A Queue failure affects only the recap request. |
| Cloudflare Workflows | Runs the ordered recap steps and retries individual steps safely. | A Workflow starts only for a completed room and never changes Room Durable Object state. Image binaries stay in R2, not Workflow state. |
| Cloudflare Turnstile | Protects the optional public `POST /api/bonus/recaps` action before it can create AI or Browser Run work. | It does not guard room creation, joining, prompting, voting, or WebSockets. |
| Cloudflare Access | Protects the separate organizer bonus dashboard and recap administration routes. | It does not identify players or protect public core-game routes. |
| Workers Analytics Engine | Records best-effort aggregate bonus events such as recap requested, completed, failed, and opened. | It stores no player names, transcripts, or image data and is never used to derive game state. |
| Browser Run | Renders one branded share card after the caption and winning image are available. | Browser Run runs in the Workflow after results. A render error is visible only as an unavailable recap. |

## 8. Architecture

```text
Core game

Browser <-> Public Worker <-> Room Durable Object <-> WebSockets
                                  |
                                  +--> core results

Optional Royal Recap, after core results only

Organizer --> Turnstile --> POST /api/bonus/recaps --> Cloudflare Queue
                                                       |
                                                       v
                                                Queue consumer
                                                       |
                                                       v
                                               Cloudflare Workflow
                                                |       |        |
                                                |       |        +--> Browser Run --> R2 / Cloudflare Images card
                                                |       +--> AI Gateway caption
                                                +--> D1 recap status

Public Worker -- best effort --> Workers Analytics Engine
Cloudflare Access --> /organizer/bonus only
```

The optional pipeline receives only a completed room code or recap identifier, a winner reference, and safe display metadata. It never receives audio bytes, image-generation jobs, player submission commands, or votes.

## 9. Functional Requirements

### Recap Request

- `POST /api/bonus/recaps` accepts requests only for rooms that have reached `results`.
- A recap request has a stable recap identifier derived from the completed room, so repeated requests do not create duplicate cards.
- Public recap requests require server-side Turnstile Siteverify validation.
- The endpoint returns a bonus-specific error if Turnstile, Queues, or any required recap binding is unavailable.
- The endpoint must not call a Room Durable Object action that mutates state.

### Queue and Workflow

- The Queue message contains references and display-safe fields only. It never includes audio, raw transcripts, or image binaries.
- Queue consumers and Workflows are idempotent because both may retry work.
- A Workflow records recap status as `queued`, `generating`, `ready`, or `failed` outside Room Durable Object state.
- A workflow retry must reuse the same recap identifier and R2 key prefix.
- The Workflow cannot delay, reopen, or modify a completed room.

### Caption and Share Card

- The optional caption uses only the shared brief, vote outcome, and fixed recap labels. It does not use player names, transcriptions, or final prompts.
- AI Gateway metadata contains only the recap identifier, model, and outcome. It excludes raw player names and transcripts.
- Browser Run renders from trusted application data or static HTML. It does not browse user-supplied URLs.
- The output card is stored under an isolated R2 `bonus-recaps/` prefix and may receive a Cloudflare Images delivery URL.
- If caption or card generation fails, the recap record retains a safe error state and the organizer can retry it.

### Organizer and Analytics Surfaces

- `/organizer/bonus` is a separate Cloudflare Access application with an explicit allow policy.
- Access configuration is optional deployment configuration and does not affect public core routes.
- Analytics writes run through `ctx.waitUntil()` after the core or bonus response is determined.
- Analytics events contain only event type, coarse timing, outcome, and an opaque recap identifier when needed.

## 10. Implementation Boundaries

- Keep bonus routing and bindings in a dedicated public-Worker module, such as `src/bonus.ts`.
- Do not add Room Durable Object actions, fields, migrations, alarms, or WebSocket events for recap work.
- Do not make `promptroyale-do/` aware of AI Gateway, Queues, Workflows, Turnstile, Access, Analytics Engine, or Browser Run.
- Bindings and secrets for bonus products belong only to the public Worker.
- Put the bonus route behind an explicit `BONUS_RECAP_ENABLED` environment flag that defaults to disabled.
- When the flag is disabled, public bonus routes return `404` and no core route reads a bonus binding.
- Add each product incrementally. A failed deployment or configuration for a later bonus product must not change the core Worker deployment.

## 11. Acceptance Criteria

- The core room lifecycle works with `BONUS_RECAP_ENABLED` unset or false.
- The core room lifecycle works when every bonus binding is absent from the development environment.
- A completed room can request at most one active recap for a given recap identifier.
- A failed Queue send, Workflow run, AI Gateway call, Browser Run render, Turnstile check, Access policy, or Analytics write cannot change core room state or core HTTP responses.
- A Queue redelivery or Workflow retry does not create duplicate recap records or cards.
- The optional public recap request rejects an invalid Turnstile token before it queues work.
- The organizer bonus dashboard is inaccessible without a matching Cloudflare Access allow policy.
- Analytics contains no player names, transcripts, audio, prompt text, or image contents.
- The share card is available only after a successful optional pipeline and is never required for the results screen.

## 12. Rollout Order

| Slice | Scope | Exit criteria |
| --- | --- | --- |
| 2A: Measurement | Add best-effort Workers Analytics Engine events behind the public Worker. | Core tests still pass with Analytics Engine absent. |
| 2B: Protected request | Add the disabled-by-default recap route, Turnstile validation, and an Access-protected organizer surface. | Core routes are unchanged when the bonus flag is off. |
| 2C: Background recap | Add Cloudflare Queues, Cloudflare Workflows, AI Gateway captioning, and Browser Run card rendering. | A failed recap leaves a completed room and results screen unchanged. |

## 13. Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| A bonus binding breaks the core Worker deployment. | Keep bindings and routes behind the bonus flag; verify a deployment with the feature disabled before enabling each slice. |
| A recap request is repeated or a Queue message is redelivered. | Use a deterministic recap identifier and idempotent R2 and D1 writes. |
| Turnstile or Access adds friction to players. | Scope them only to bonus surfaces, never core participation. |
| AI Gateway or Browser Run consumes extra time or cost. | Trigger both only after an explicit recap request and cap one active recap per completed room. |
| Analytics captures player-generated content. | Record fixed event names and opaque identifiers only. |
| The bonus card is unavailable during a demo. | Demonstrate the completed core game first. Treat the card as an optional follow-up reveal. |

## 14. Out of Scope

- Multi-round image evolution and image-to-image editing.
- Queue-backed player-image generation or workflow-managed game state.
- AI Gateway in the core image or transcription path.
- Cloudflare Access for public player enrollment.
- Turnstile for core room creation or submission.
- Public galleries, social posting, accounts, or leaderboards.

## 15. References

- [Phase 1 PRD](./PROMPT_ROYALE_PRD.md)
- [Phase 1 Functional Spec](./PROMPT_ROYALE_FUNCTIONAL_SPEC.md)
- [AI Gateway with Workers AI](https://developers.cloudflare.com/ai-gateway/usage/providers/workersai/)
- [Cloudflare Queues](https://developers.cloudflare.com/queues/)
- [Cloudflare Workflows](https://developers.cloudflare.com/workflows/)
- [Cloudflare Turnstile server-side validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
- [Cloudflare Access applications](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/)
- [Workers Analytics Engine](https://developers.cloudflare.com/analytics/analytics-engine/)
- [Browser Run](https://developers.cloudflare.com/browser-run/)
