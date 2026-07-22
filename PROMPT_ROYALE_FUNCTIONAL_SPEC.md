# Prompt Royale Functional Spec

Status: Hackathon MVP

Build window: 4 hours

Source: [PRD](./PROMPT_ROYALE_PRD.md)

## 1. Experience

Prompt Royale is a desktop multiplayer image-editing game for up to four players.

Every round starts with one shared image and theme. Players take short push-to-talk turns describing an edit. Each edit creates a separate image branch. The room votes, and the winning branch becomes the shared image for the next round.

The game runs for two or three rounds, then shows the full image evolution and final winner.

## 2. Game Flow

1. A host creates a room.
2. Players join on desktop through a room link or code.
3. The host starts when two to four players have joined.
4. The room shows one base image, one theme, and the turn order.
5. Each player records a short voice edit during their turn.
6. The player's panel moves through transcription, generation, and ready states.
7. After every branch is ready, players vote for their favorite.
8. The winning image becomes the base image for the next round.
9. After the final round, the arena shows the winning image and evolution tree.

## 3. Game Rules

- Maximum of four players.
- Two rounds by default; three rounds when time permits.
- One voice clip and one generated branch per player per round.
- Voice clips are limited to ten seconds.
- Each player has twenty seconds to start and finish their recording.
- Turns are taken in room order.
- Image jobs may continue while the next player records their turn.
- Voting begins after every turn is complete and every image job has finished or failed.
- Each player gets one vote and cannot vote for their own branch.
- Player names and transcribed edits remain visible throughout the round.
- The highest-voted image wins the round.
- The Durable Object randomly selects between tied winners so the next round has one base image.
- If every image job fails, the host may replay the round with the same base image.

## 4. Desktop Views

### Home

- Enter a display name.
- Create a room.
- Join with a room code.

### Lobby

- Show room code and shareable link.
- Show up to four connected players.
- Let the host start the game.

### Arena

- Show the shared base image and theme.
- Show four side-by-side player panels.
- Highlight the current player and remaining turn time.
- Show each panel's live job status.

### Player Turn

- Hold a button to record a short voice edit.
- Upload the clip when the button is released.
- Show the transcribed edit in that player's panel.
- Replace the loading panel with the generated branch when ready.

### Voting

- Show all completed branches with their player names and transcribed edits.
- Let each player select one branch.
- Show a waiting state after a vote is submitted.

### Round Result

- Reveal player names, transcripts, and vote totals.
- Highlight the winning branch.
- Promote the winning image to the next round's base image.

### Final Recap

- Show the original image.
- Show every round's branches and winner.
- End on the final winning image.

## 5. Cloudflare Products

| Product | Use in Prompt Royale |
| --- | --- |
| Cloudflare Pages | Hosts the desktop game and projector arena UI |
| Workers | Receives game actions, audio clips, votes, and image requests |
| Durable Objects | Runs one authoritative multiplayer room per room code |
| Durable Object WebSockets | Pushes room, turn, job, voting, and result updates to every browser |
| Workers AI | Converts each push-to-talk audio clip into text |
| AI Gateway | Observes and controls speech and image model calls while keeping provider keys server-side |
| Image generation provider | Edits the current base image using the player's transcribed instruction |
| R2 | Stores base images, generated branches, and final recap images |

## 6. Service Connections

```text
                         +----> Cloudflare Pages (loads desktop UI)
Desktop browser --------+
                         +----> Worker API
                                   |
                                   +----> Durable Object
                                   |          |
                                   |          +---- WebSocket updates
                                   |                    |
                                   |                    v
                                   |              all browsers
                                   |
                                   +----> AI Gateway ----> Workers AI speech-to-text
                                   |
                                   +----> AI Gateway ----> image editing provider
                                   |
                                   +----> R2 ----> Worker image response ----> browser
```

The Durable Object stores game state and metadata. It does not store audio or image bytes.

## 7. Main Data Flows

### Create and Join a Room

1. The browser UI loaded from Pages sends the player's name to the Worker.
2. The Worker creates or looks up a Durable Object using the room code.
3. The Durable Object adds the player and returns the current room state.
4. The browser opens a WebSocket to receive live updates.
5. The Durable Object broadcasts the updated player list.

### Start a Round

1. The host sends `start round` to the Worker.
2. The Worker forwards the action to the room's Durable Object.
3. Round one uses a fixed theme and starting image stored in R2 for the demo.
4. The Durable Object records the theme, base image, turn order, first player, and turn deadline.
5. The Durable Object broadcasts the new round state.

### Turn Voice Into an Image

1. The current player records and uploads a short audio clip to the Worker.
2. The Worker asks the Durable Object to confirm that it is that player's turn.
3. The Worker sends the clip through AI Gateway to Workers AI for transcription.
4. The Worker reports the transcript and `generating` status to the Durable Object.
5. The Durable Object broadcasts the transcript, job status, and next turn.
6. The Worker sends the base image and transcript through AI Gateway to the image provider.
7. The Worker writes the generated image to R2.
8. The Worker gives the R2 image key to the Durable Object.
9. The Durable Object marks the panel `ready` and broadcasts its image URL.

### Vote and Advance

1. Each browser sends one vote to the Worker.
2. The Worker forwards the vote to the Durable Object.
3. The Durable Object counts votes and selects the winner.
4. The Durable Object stores the winner's R2 key as the next base image.
5. The Durable Object broadcasts the result and either starts the next round or shows the recap.
6. If no branches succeeded, the Durable Object keeps the current base image and returns control to the host.

## 8. Durable Object Room State

```text
Room
- code
- phase: lobby | editing | voting | result | finished
- players[4]
- hostPlayerId
- roundNumber
- totalRounds
- theme
- baseImageKey
- currentTurn
- turnEndsAt
- branches[playerId]
  - transcript
  - status: waiting | transcribing | generating | ready | failed
  - imageKey
- votes[playerId]
- roundHistory[]
```

One room code maps to one Durable Object. This keeps turn order, votes, and winner selection consistent even when several players act at once.

## 9. WebSocket Updates

The Durable Object broadcasts a small set of events:

- `room.updated`
- `round.started`
- `turn.started`
- `branch.status`
- `voting.started`
- `round.finished`
- `game.finished`

The browser can redraw the arena from the latest room state after any event.

## 10. Four-Hour Build Order

| Time | Build |
| --- | --- |
| 0:00-0:45 | Pages desktop UI with lobby, arena panels, voting, and recap states |
| 0:45-1:45 | Durable Object room, WebSockets, player presence, turns, and votes |
| 1:45-2:45 | Push-to-talk upload, Workers AI transcription, and live job statuses |
| 2:45-3:30 | Image editing provider, AI Gateway, R2 storage, and panel updates |
| 3:30-4:00 | Round chaining, final recap, deployment, and demo rehearsal |

## 11. Not in the MVP

- Mobile layouts or QR joining.
- Accounts, profiles, or permanent feeds.
- Continuous voice or WebRTC.
- More than four players.
- Multiple image models.
- AI-selected winners.
- Public galleries.
- Advanced image editing controls.
