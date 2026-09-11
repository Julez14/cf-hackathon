# Public deployment

Play at **https://prompt-royale.juelzlax.workers.dev**. Guests enter a stage name and create or join a six-character room. No accounts or Cloudflare login are needed. Each room supports 2–4 players and one round; “Play again” returns home to create another room. Late arrivals can watch an active/completed round. Voice requires browser microphone permission and HTTPS.

## Resources

- Account: `5123e5b48cbca84dedd3925e6085c866`.
- Public Worker: `prompt-royale` (workers.dev enabled; preview URLs disabled).
- Private Worker: `prompt-royale-do` (workers.dev and previews disabled).
- SQLite Durable Object: `Room`, owned by `prompt-royale-do`, migration `v1`; stores temporary images and game state.
- D1: `prompt-royale-gallery`, ID `61430743-2ad4-421a-8e02-f2ec09edf2b7`.
- Workers AI: FLUX.2 klein 4B for 1024×1024 images and Whisper Turbo for voice.

These resources are separate from the original repository's account. No existing application resources were modified.

## Costs and limits

Pricing checked September 11, 2026; USD, before tax. Cloudflare confirmed this account's Workers plan is Free during deployment. No subscription upgrade was made.

- **Workers / Durable Objects / D1:** Within Free quotas, there is no usage charge; exceeding quotas can interrupt play. Workers Free allows 100,000 dynamic requests/day. All HTML in this app is Worker-rendered, so visits are dynamic requests. See [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/), [Durable Objects pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/), and [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/).
- **AI:** The account gets 10,000 neurons/day. An image uses approximately 104.2 neurons, so roughly 95 images/day fit if no other app uses the allowance. Voice consumes additional neurons. Free-plan exhaustion stops generation until midnight UTC; it does not buy more usage. The application conservatively allows **80 accepted image attempts/day** (including voice and failed attempts), shared by all players. Cloudflare may stop generation sooner if other apps or voice use the allowance. See [AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/).
- **Keep Workers Free:** This application uses no R2, Cloudflare Images, paid model provider, AI Gateway credits, or paid fallback. With the account remaining on Workers Free, its resource limits stop operations instead of purchasing overages. Unrelated subscriptions and resources on the same account are outside this app's controls. Upgrading Workers later can enable usage charges; the image-attempt cap is not a dollar limit or a lifetime account spending cap. See [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/).

## Free-limit messages

The home and room screens explain that allowances are shared and daily limits reset at 00:00 UTC. `/api/availability` reports the remaining application allowance. At exhaustion, the UI shows a prominent explanation and a local-time reset timestamp, disables room creation/start and image/voice submission, and leaves viewing/voting available where the underlying services still work.

Workers AI error 3036 is classified as daily exhaustion and records the pause for all rooms until reset. Temporary capacity error 3040 tells players to try again in a minute instead. Recognized D1/Durable Object daily limits show a midnight reset; storage-full errors explain that space must become available, without promising a reset. API quota responses include a stable error code and `Retry-After` where known.

Browsers that already loaded the app explain non-JSON Cloudflare 1027 responses rather than displaying a JSON parsing error. **If Cloudflare blocks the public Worker before it runs, a fresh visitor can see Cloudflare's own error page instead of our custom message.** The app cannot override that platform-level block.

## Image retention

The Room's SQLite storage holds each player's latest image during play. Images are split into 512 KiB chunks, with an 8 MiB size limit; image bytes and metadata commit atomically. Successful evolution removes the previous image. Rejected late uploads never commit image data. Images survive room eviction and are not sent inside WebSocket snapshots.

A Durable Object alarm deletes the remaining images **10 minutes after results**, including the winner, without needing any browser to stay open. The results view and public gallery then lose their images; win totals and textual game records remain. Failed cleanup retries after one minute while the platform permits alarms/writes; exhaustion can delay deletion. The image API refuses expired images even if cleanup has been delayed. Cloudflare platform backups have their own retention policy.

Image responses use `Cache-Control: no-store`. Images already downloaded or cached under a previous deployment cannot be recalled. No R2 bucket or lifecycle configuration is required.

The application limits room creation and mutations/socket connections to reduce automated abuse. They are not protection against every denial-of-service scenario. Guests can exhaust the shared daily image allowance. Prompt/image moderation is not implemented, and winning images and stage names appear in the public gallery. Session identity is saved in that browser; clearing browser storage resets personal stats access.

## Redeploy

Use Node.js 24 or newer (tests use native TypeScript stripping). From the repository root:

```sh
npm install
npx wrangler login
npm run typecheck
npm test
npx wrangler d1 migrations apply prompt-royale-gallery --remote --config promptroyale/wrangler.jsonc
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

- `DAILY_AI_LIMIT` in `promptroyale/wrangler.jsonc` is 80. It must be a positive integer and resets at 00:00 UTC. Do not raise it or upgrade the account without revisiting the owner's $0 requirement. Cloudflare account limits still apply.
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

### Earlier temporary-image update verification (R2, now superseded)

- Type generation/type-checking, builds, and the expanded local runtime regression passed. A three-second test-only retention setting exercised the real alarm handler after disconnected completion: current, superseded, and orphan revision objects were deleted, another room's object was untouched, image URLs returned 404, and win statistics remained. Legacy finalize did not restore gallery images.
- Deployed with the production retention setting of 600 seconds and verified that four pre-existing completed rooms acquired exactly that expiration interval. All 15 stored verification images were deleted. The bucket's `rooms/` listing is empty; D1 still contains all 20 participation records and four wins, with zero image references.
- Verified the one-day fallback lifecycle rule through the Cloudflare API. No subscription or AI-usage setting changed.
- A fresh anonymous mobile Chromium session passed the expired-results check: all four image placeholders, winner and scores, live spectator connection, old image URL returning 404, idempotent finalize, and navigation home. No JavaScript errors or horizontal overflow were detected; the screenshot was visually checked.

### Free-only storage and quota-message verification

- Removed both Workers' R2 bindings and deleted the empty, game-only `prompt-royale-images` bucket after checking its contents. Other buckets were untouched. Remote settings confirm the 80-attempt cap and no R2 bindings; no paid subscription or fallback was enabled.
- Type-checking and production builds passed. All three local test suites passed, covering chunked image storage, atomic replacement and rollback on simulated storage exhaustion, persistence through actual room eviction, alarm-driven deletion, concurrent budget reservations, and typed/voice provider-quota errors.
- A fresh live four-player game passed with R2 already deleted: five real generated images, voice transcription, image evolution, reconnect, voting, results, gallery, stats, and anonymous spectator access.
- All five browser quota tests passed against the deployed app with simulated error responses: daily reset messaging and mobile layout, Cloudflare HTML limit errors, storage-full messaging, voting after mid-game image exhaustion, and automatic re-enabling of controls when the allowance returns. These tests did not intentionally exhaust the real account allowance.
- Latest deployed versions: public Worker `e04e37139e624eb2a40e88757191cbe7`; room Worker `5a6ab54c01294d839983901ccdd9100b`.

To rerun the quota-message browser checks without generating images:

```sh
TEST_BASE_URL=https://prompt-royale.juelzlax.workers.dev npx playwright test tests/free-limits.spec.mjs --workers=1
```
