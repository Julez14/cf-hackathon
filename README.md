# Prompt Royale

## Overview

Prompt Royale is a real-time multiplayer image-generation party game for two to four players. Players join a room, add a typed or voice twist to a shared creative brief, watch each image arrive live, then vote for a winner.

## Tutorial

1. Install dependencies from the repository root:

   ```sh
   npm install
   ```

2. Start the public Worker and room Durable Object:

   ```sh
   npm run dev
   ```

3. Open `http://localhost:8790`, enter a stage name, and create a room.
4. Open the room link or enter its six-character code on one to three other devices or browser sessions.
5. Once at least two players have joined, the room leader starts the game. Each player submits a typed or voice twist, then votes for another ready image.

## Cloudflare Products Used

- **Cloudflare Workers** serves the browser application and public API.
- **Durable Objects** maintains the authoritative room state, game rules, and live WebSocket updates.
- **Workers AI** transcribes voice prompts and generates images.

## Future Changes

- Persist original images in R2, display assets in Cloudflare Images, and completed games in D1.
- Add a post-game gallery and shareable results.
- Explore multi-round games and image-evolution trees.
