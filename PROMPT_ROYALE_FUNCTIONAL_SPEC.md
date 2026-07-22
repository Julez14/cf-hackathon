# Prompt Royale Functional Spec

Status: Hackathon MVP

Build window: 4 hours

Source: [PRD](./PROMPT_ROYALE_PRD.md)

## 1. Experience

Prompt Royale is a live multiplayer image-generation game for two to four players.

Every player receives the same creative brief and records one short voice prompt that adds a visual twist. The game generates one image per player from the shared brief and that player's transcription. The room votes once and reveals one winner.

## 2. Game Flow

1. A group leader creates a room.
2. Players join through a room link or six-character code.
3. The leader starts when two to four players have joined.
4. The room shows a five-second countdown, then reveals one shared creative brief.
5. Every player has a twenty-second prompt window to record and upload one short voice clip.
6. Each player's panel moves through listening, transcribing, generating, ready, or failed states.
7. Images reveal independently as they become ready.
8. Voting begins when every submitted image job has finished or failed, or when the generation timeout expires.
9. Each player who has another ready image available may cast one vote.
10. The room reveals the winning image, vote count, and final prompt.
11. The completed result and image references are persisted for the post-game gallery.

## 3. Game Rules

- Rooms support two to four players.
- The first joined player is the group leader.
- A room has one active round and cannot be restarted after reaching results.
- The leader can start only from the lobby and only when at least two players have joined.
- The countdown lasts five seconds.
- Voice clips are limited to ten seconds.
- The shared prompt window lasts twenty seconds.
- Each player may submit one voice clip and create one image entry.
- Every image prompt combines the shared creative brief with that player's transcription.
- Generation jobs run independently and may finish in any order.
- A transcription or generation failure affects only that player's entry.
- Voting begins when all entries are ready or failed, or after the generation timeout.
- Only ready entries may receive votes.
- Each player with at least one ready entry they do not own gets one vote and cannot vote for their own entry.
- Duplicate and late votes are rejected.
- Voting closes after thirty seconds so a disconnected player cannot stall the room.
- The highest-voted ready image wins.
- Ties are resolved deterministically by the tied entries' room join order. The result includes the tie-break rule.
- If no image succeeds, the room enters results with no winner and explains that all entries failed.

## 4. Views

### Home

- Enter a display name.
- Create a room.
- Join with a room code.

### Lobby

- Show the room code, shareable link, and QR code.
- Show up to four connected players.
- Identify the group leader.
- Let the leader start when at least two players are present.

All views must remain usable on desktop and mobile. The arena is optimized for a projector-friendly 2 x 2 grid, while a player's mobile view keeps join, hold-to-talk, and vote as the primary controls.

### Countdown

- Show a shared five-second countdown.
- Keep the creative brief hidden until the countdown ends.

### Prompting

- Show the shared creative brief and remaining prompt time.
- Let each player hold a button to record one short voice prompt.
- Upload the clip when the button is released.
- Show each player's current entry status.

### Generating

- Show the shared creative brief and all player panels.
- Show each transcription when it becomes available.
- Replace each loading panel with its generated image when ready.
- Show entry-level failures without blocking other entries.

### Voting

- Show every ready image with its player name and transcribed twist.
- Let each player select one other player's image.
- Show a waiting state after a vote is submitted.

### Results

- Reveal player names, transcripts, and vote totals.
- Highlight the winning image and final prompt.
- Explain the deterministic tie-break when it was used.
- Show a no-winner result if every entry failed.

## 5. Cloudflare Products

| Product | Use in Prompt Royale |
| --- | --- |
| Workers | Serves the browser application, handles room and media APIs, and coordinates AI and persistence calls |
| Durable Objects | Runs one authoritative multiplayer room per room code |
| Durable Object WebSockets | Pushes room, phase, entry, voting, and result updates to every browser |
| Workers AI | Converts each voice clip to text and generates one image per player |
| R2 | Stores original generated-image binaries under room and entry keys |
| Cloudflare Images | Stores display-ready images and provides delivery URLs |
| D1 | Stores completed-room metadata, entries, votes, and the winner |

## 6. Service Connections

```text
Browser -----------------------> Public Worker
                                     |
                                     +----> Durable Object
                                     |          |
                                     |          +---- WebSocket updates
                                     |                    |
                                     |                    v
                                     |              all browsers
                                     |
                                     +----> Workers AI speech-to-text
                                     |
                                     +----> Workers AI text-to-image
                                     |
                                     +----> R2 originals
                                     |
                                     +----> Cloudflare Images delivery assets
                                     |
                                     +----> D1 completed-game records
```

The Durable Object stores authoritative game state and metadata. It does not store audio or image bytes. D1 is not used for live timers, entry status, voting, or winner selection.

## 7. Main Data Flows

### Create and Join a Room

1. The browser sends the player's display name to the public Worker.
2. The Worker creates or looks up a Durable Object using the room code.
3. The browser opens a WebSocket with its player identity.
4. The Durable Object adds the player, assigns the leader when needed, and broadcasts the updated room state.

### Start the Round

1. The leader sends `start round` to the public Worker.
2. The Worker forwards the action and curated creative brief to the room's Durable Object.
3. The Durable Object validates the leader, player count, and current phase.
4. The Durable Object records the brief and countdown deadline, then broadcasts the countdown state.
5. A Durable Object alarm advances the room to prompting after five seconds.
6. The Durable Object records the prompt deadline and broadcasts the revealed brief.

### Turn Voice Into an Image

1. A player records and uploads one short audio clip to the public Worker before the prompt deadline.
2. The Worker asks the Durable Object to reserve that player's one submission.
3. The Durable Object marks the entry `transcribing` and broadcasts its status.
4. The Worker sends the clip to Workers AI for transcription.
5. The Worker reports the transcript to the Durable Object.
6. The Durable Object combines the shared brief and transcript, records the exact final prompt, and returns it with the `generating` state.
7. The Worker sends that returned final prompt to Workers AI for image generation.
8. The Worker writes the original image to R2 and uploads a display-ready asset to Cloudflare Images.
9. The Worker reports the R2 key and delivery URL to the Durable Object.
10. The Durable Object marks the entry `ready` and broadcasts the updated room state.
11. A failed transcription or image job is reported as `failed` with a safe display message.

### Close Submissions and Start Voting

1. A Durable Object alarm closes the prompt window after twenty seconds.
2. Players who did not submit are marked `failed` with a missed-deadline reason.
3. The room enters `generating` while submitted jobs are still in progress.
4. Voting starts as soon as every entry is ready or failed.
5. If jobs remain in progress at the generation deadline, the alarm marks them failed and starts voting.

### Vote and Finish

1. Each browser sends one vote to the public Worker.
2. The Worker forwards the vote to the Durable Object.
3. The Durable Object validates the phase, voter, candidate, self-vote rule, and duplicate-vote rule.
4. Once every eligible player has voted, or the voting deadline expires, the Durable Object counts votes and resolves any tie by room join order.
5. The Durable Object records the winner and broadcasts the results state.
6. The public Worker reads the completed state and writes the room, entries, image references, votes, and winner to D1.

## 8. Durable Object Room State

```text
Room
- code
- createdAt
- phase: lobby | countdown | prompting | generating | voting | results
- players[4]
  - id
  - name
  - joinedAt
  - online
- leaderId
- creativeBrief
- countdownEndsAt
- promptEndsAt
- generationEndsAt
- votingEndsAt
- entries[playerId]
  - status: listening | transcribing | generating | ready | failed
  - transcript
  - finalPrompt
  - originalImageKey
  - imageUrl
  - error
- votes[playerId]
- winnerPlayerId
- tieBreakApplied
- completedAt
```

One room code maps to one Durable Object. This keeps phase transitions, timers, submissions, votes, and winner selection consistent when several players act at once.

## 9. Durable Object Actions

The public Worker forwards these authenticated room actions:

- `start`: leader starts the countdown with a curated creative brief.
- `reserve-entry`: player claims their one submission before the prompt deadline.
- `entry-generating`: Worker reports a successful transcript and the final generation prompt.
- `entry-ready`: Worker reports the R2 key and Cloudflare Images delivery URL.
- `entry-failed`: Worker reports a safe failure message.
- `vote`: player votes for another player's ready entry.

Every action returns the latest room state. Invalid actions return an HTTP `4xx` response and do not change room state.

## 10. WebSocket Updates

The Durable Object broadcasts these events with the latest complete room state:

- `room.updated`
- `countdown.started`
- `prompting.started`
- `entry.updated`
- `generating.started`
- `voting.started`
- `game.finished`

The browser redraws from the included room state after any event. A reconnecting browser fetches the current state before reopening its WebSocket.

## 11. Timing Defaults

| Timer | Duration | Owner |
| --- | --- | --- |
| Countdown | 5 seconds | Durable Object alarm |
| Prompt window | 20 seconds | Durable Object alarm |
| Maximum voice clip | 10 seconds | Browser and public Worker validation |
| Generation grace period | 60 seconds after prompting closes | Durable Object alarm |
| Voting window | 30 seconds | Durable Object alarm |

## 12. Four-Hour Build Order

| Time | Build |
| --- | --- |
| 0:00-0:45 | Worker-served UI with lobby, arena panels, voting, and result states |
| 0:45-1:45 | Durable Object room, WebSockets, phases, alarms, submissions, and votes |
| 1:45-2:45 | Push-to-talk upload, Workers AI transcription, and live entry statuses |
| 2:45-3:30 | Workers AI image generation, R2, Cloudflare Images, and panel updates |
| 3:30-4:00 | D1 completion persistence, deployment, and demo rehearsal |

## 13. Not in the MVP

- Multiple rounds, image evolution, or tournaments.
- Accounts, profiles, permanent feeds, or public galleries.
- Continuous voice, WebRTC, or audio streaming.
- More than four players.
- Multiple image models or image-to-image editing.
- AI Gateway, Queues, Analytics Engine, Turnstile, or Access.
- AI-selected winners.
