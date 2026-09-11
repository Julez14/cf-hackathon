# Prompt Royale

## Overview

**Play publicly:** https://prompt-royale.juelzlax.workers.dev — enter a stage name; no login required. See [deployment, costs, and limits](./DEPLOYMENT.md).

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

## Cloudflare Products Implemented

The current source and Worker configurations use these Cloudflare products:

- **Cloudflare Workers** serves the browser application and public API from the public Worker, and hosts the room Worker entry point.
- **Durable Objects** maintains authoritative room state, game rules, timers, persistence, and one room instance per room code.
- **Durable Object WebSockets** broadcasts lobby, prompt, generation, voting, and results updates to connected browsers.
- **Workers AI** transcribes voice prompts with Whisper and generates player images with FLUX.2 [klein] 4B.
- **Durable Object SQLite storage** holds temporary images without R2. Only the latest image per player is kept, and images expire ten minutes after results.
- **D1** stores completed winners, gallery records, and player statistics.
- **Workers Observability** is enabled for both Worker deployments.

## Future Cloudflare Product Implementations

These products are planned but are not wired into the current implementation:

- **Cloudflare Images** is not enabled; images are served directly from the room's Free-plan storage.
- **AI Gateway** will provide optional post-game recap captioning, observability, rate limiting, and fallback controls.
- **Cloudflare Queues** will hold asynchronous post-game recap requests.
- **Cloudflare Workflows** will run and retry the isolated recap pipeline.
- **Turnstile** will protect the optional public recap request from automated abuse.
- **Cloudflare Access** will protect the organizer recap dashboard and administration routes.
- **Workers Analytics Engine** will record aggregate recap-request and outcome metrics.
- **Browser Run** will render branded post-game share cards.

## Future Game Features

- Add a post-game gallery and shareable results.
- Explore multi-round games and image-evolution trees.
