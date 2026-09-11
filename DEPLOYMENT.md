# Public deployment

Play at **https://prompt-royale.juelzlax.workers.dev**. Guests enter a stage name and create or join a six-character room. No accounts or Cloudflare login are needed. Each room supports 2–4 players and one round; “Play again” returns home to create another room. Late arrivals can watch an active/completed round. Voice requires browser microphone permission and HTTPS.

## Resources

- Account: `5123e5b48cbca84dedd3925e6085c866`.
- Public Worker: `prompt-royale` (workers.dev enabled; preview URLs disabled).
- Private Worker: `prompt-royale-do` (workers.dev and previews disabled).
- SQLite Durable Object: `Room`, owned by `prompt-royale-do`, migration `v1`.
- R2: `prompt-royale-images`, accessed only through the Worker binding.
- D1: `prompt-royale-gallery`, ID `61430743-2ad4-421a-8e02-f2ec09edf2b7`.
- Workers AI: FLUX.2 klein 4B for 1024×1024 images and Whisper Turbo for voice.

These resources are separate from the original repository's account. No existing application resources were modified.

## Costs and limits

Pricing checked September 11, 2026; USD, before tax. Cloudflare confirmed this account's Workers plan is Free during deployment. No subscription upgrade was made.

- **Workers / Durable Objects / D1:** Within Free quotas, there is no usage charge; exceeding quotas can interrupt play. Workers Free allows 100,000 dynamic requests/day. All HTML in this app is Worker-rendered, so visits are dynamic requests. See [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/), [Durable Objects pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/), and [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/).
- **AI:** The account gets 10,000 neurons/day. An image uses approximately 104.2 neurons, so roughly 95 images/day fit if no other app uses the allowance. Voice consumes additional neurons. Free-plan exhaustion stops generation until midnight UTC; it does not buy more usage. The additional application cap is 500 accepted image attempts/day (including voice and failed attempts). See [AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/).
- **If you later upgrade:** Workers Paid starts at $5/month. Each image is approximately $0.001148 before included usage; 500 images are about $0.574. Ten seconds of Whisper Turbo is approximately $0.000085. Hosting/storage overages are separate. The 500-attempt cap is not a dollar limit or an account-wide billing limit. See [FLUX pricing](https://developers.cloudflare.com/workers-ai/models/flux-2-klein-4b/) and [Whisper pricing](https://developers.cloudflare.com/workers-ai/models/whisper-large-v3-turbo/).
- **R2 can incur costs on this account:** Standard R2 includes 10 GB-month storage, 1 million Class A operations, and 10 million Class B operations each month. Above these, storage is $0.015/GB-month, writes/listing $4.50/million, and reads $0.36/million; deletes and internet egress are free. Allowances are shared with other buckets. Images are now temporary; see retention below. Deletion does not refund AI generation usage. See [R2 pricing](https://developers.cloudflare.com/r2/pricing/).

## Image retention

R2 provides temporary shared image storage during play. A Durable Object alarm deletes **all revisions 10 minutes after results**, including the winner, without needing any browser to stay open. The results view and public gallery then lose their images; win totals and textual game records remain. Failed deletion or metadata cleanup retries after one minute. The API stops exposing expired image URLs at the deadline even during a cleanup outage.

Late rejected uploads are deleted immediately. `promptroyale/r2-lifecycle.json` adds a one-day expiration rule scoped to `rooms/` as a fallback for orphan uploads, while retaining the default incomplete multipart upload rule. Lifecycle deletion is asynchronous, typically within 24 hours after expiration; this is a fallback, not the ten-minute timer. See [Cloudflare lifecycle behavior](https://developers.cloudflare.com/r2/buckets/object-lifecycles/).

New image responses use `Cache-Control: no-store`. Images already downloaded or cached under the previous deployment cannot be recalled. R2 is not inherently required for this game concept, but removing it entirely would require replacing shared image storage/delivery.

The application limits room creation and mutations/socket connections to reduce automated abuse. They are not protection against every denial-of-service scenario. Guests can exhaust the shared daily image allowance. Prompt/image moderation is not implemented, and winning images and stage names appear in the public gallery. Session identity is saved in that browser; clearing browser storage resets personal stats access.

## Redeploy

Use Node.js 22 or newer. From the repository root:

```sh
npm install
npx wrangler login
npm run typecheck
npm test
npx wrangler d1 migrations apply prompt-royale-gallery --remote --config promptroyale/wrangler.jsonc
npx wrangler r2 bucket lifecycle set prompt-royale-images --file promptroyale/r2-lifecycle.json
npm run deploy
```

`npm run deploy` deploys the room Worker first. The initial deployment used the connected Cloudflare API because the local Wrangler login had expired. Source bundles were built with Wrangler; the three SQL migrations were applied to the new D1 database. All migrations use idempotent CREATE statements and can safely be registered/applied through Wrangler later.

`npm run dev` starts both Workers and requires Cloudflare authentication for remote Workers AI. `npm test` is fully local: it uses Miniflare, mock images, and a simulated missing AI provider to verify error recovery, budget concurrency, and disconnected completion without using the account's AI allowance. There is no separate linter configured.

For a live four-browser check (creates real images and a public test result):

```sh
npx playwright install chromium
TEST_BASE_URL=https://prompt-royale.juelzlax.workers.dev npm run test:live
```

Optionally supply `TEST_AUDIO_FILE=/absolute/path/to/spoken-prompt.wav` to exercise recording and transcription with Chromium's synthetic microphone. Use a short spoken sentence mentioning a purple wizard hat, PCM WAV. Without the fixture, the fourth player uses typed input.

## Controls

- Change `DAILY_AI_LIMIT` in `promptroyale/wrangler.jsonc`, then redeploy. It is an integer count, reset at 00:00 UTC; `0` disables this application cap. Cloudflare account limits still apply.
- Keep `ALLOW_MOCK_ENTRIES` set to `false` in production.
- Workers Logs capture application errors. The public room Worker URL must remain disabled because its internal actions trust binding callers.
- Model failures or generation finishing after the timer can happen. Failed evolution keeps the previous successful image; players can retry while the timer remains. Default rounds last 90 seconds; the host can choose up to five minutes.

## Deployment verification — September 11, 2026

- `npm run typecheck`, `npm test`, `npm run build`, and `npm audit` passed (zero reported dependency vulnerabilities).
- Both Workers passed local startup profiling. Cloudflare reported 7 ms public Worker startup on the final upload.
- The live Playwright test completed in 3.2 minutes: four isolated guest browser contexts, room code and room-link joins, QR loading, capacity/host authorization, five real images, synthetic microphone recording and transcription, cumulative evolution, draft/focus preservation, reconnect, mobile image/layout checks, voting, invalid/duplicate/late action rejection, spectator access, gallery and stats.
- The local runtime test verified an atomic daily cap under simultaneous requests, recovery preserving a previous image, session-token isolation, and result persistence after all clients disconnect without calling finalize.
- The public URL returns HTTP 200 without cookies or credentials; development mock routes return 404, including mixed-case action names. The room Worker's public URL is disabled.
- Some earlier live image attempts returned a generation error; the same failed model input succeeded on a direct retry. No permanent cause was established. The final full game passed without a retry, but image service failures remain possible and are shown to players. Voice was tested with a synthetic microphone in Chromium; physical iPhone/Safari microphone behavior was not tested.

Verification-game images now follow the same deletion policy. GitHub automatic deployment is not configured; deploy future changes with the commands above.

### Temporary-image update verification

- Type generation/type-checking, builds, and the expanded local runtime regression passed. A three-second test-only retention setting exercised the real alarm handler after disconnected completion: current, superseded, and orphan revision objects were deleted, another room's object was untouched, image URLs returned 404, and win statistics remained. Legacy finalize did not restore gallery images.
- Deployed with the production retention setting of 600 seconds and verified that four pre-existing completed rooms acquired exactly that expiration interval. All 15 stored verification images were deleted. The bucket's `rooms/` listing is empty; D1 still contains all 20 participation records and four wins, with zero image references.
- Verified the one-day fallback lifecycle rule through the Cloudflare API. No subscription or AI-usage setting changed.
- A fresh anonymous mobile Chromium session passed the expired-results check: all four image placeholders, winner and scores, live spectator connection, old image URL returning 404, idempotent finalize, and navigation home. No JavaScript errors or horizontal overflow were detected; the screenshot was visually checked.
