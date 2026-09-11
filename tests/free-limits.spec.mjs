import { test, expect } from '@playwright/test';
const baseURL = process.env.TEST_BASE_URL;
test.skip(!baseURL, 'Set TEST_BASE_URL; these browser checks mock failures and do not use AI.');

test('daily image exhaustion displays reset time and prevents new games', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/api/availability', route => route.fulfill({ json: {
    available: false, remaining: 0, limit: 80, code: 'FREE_AI_LIMIT',
    error: "Today's shared free image allowance is used up. Come back after 00:00 UTC.", resetAt: '2026-09-12T00:00:00.000Z'
  } }));
  await page.goto(baseURL);
  await expect(page.locator('#service-notice')).toContainText('free image allowance is used up');
  await expect(page.locator('#service-notice')).toContainText('your local time');
  await expect(page.getByRole('button', { name: 'Create room' })).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/free-limit-mobile.png', fullPage: true });
});

test('platform HTML quota failures show an explanation instead of a JSON parse error', async ({ page }) => {
  await page.route('**/api/availability', route => route.fulfill({ json: { available: true, remaining: 50 } }));
  await page.route('**/api/rooms', route => route.fulfill({ status: 503, contentType: 'text/html', body: '<h1>Error 1027: Worker exceeded free daily request limit</h1>' }));
  await page.goto(baseURL);
  await page.getByLabel('Your stage name').fill('Quota Tester');
  await page.getByRole('button', { name: 'Create room' }).click();
  await expect(page.locator('#landing-feedback')).toContainText('free daily request limit');
  await expect(page.locator('#service-notice')).toContainText('00:00 UTC');
  await expect(page.getByRole('button', { name: 'Create room' })).toBeDisabled();
});

test('storage exhaustion does not promise an incorrect midnight reset', async ({ page }) => {
  await page.route('**/api/availability', route => route.fulfill({ status: 503, json: {
    code: 'FREE_STORAGE_LIMIT', error: "The game's free storage limit has been reached. New play is paused until space is available. Please try again later."
  } }));
  await page.goto(baseURL);
  await expect(page.locator('#service-notice')).toContainText('free storage limit');
  await expect(page.locator('#service-notice')).not.toContainText('Resets at');
  await expect(page.getByRole('button', { name: 'Create room' })).toBeDisabled();
});

test('mid-game exhaustion disables generation but keeps existing images and voting usable', async ({ page }) => {
  const playerId = 'quota-ui-player-0';
  const candidate = 'quota-ui-player-1';
  const snapshot = { type: 'room_state', event: 'room.updated', code: 'ABCDEF', phase: 'prompting', capacity: 4,
    leader: { id: playerId, name: 'Tester' }, players: [{ id: playerId, name: 'Tester' }, { id: candidate, name: 'Friend' }],
    creativeBrief: 'A colorful balloon', roundDurationMs: 60_000, promptEndsAt: Date.now() + 60_000,
    votedPlayerIds: [], entries: Object.fromEntries([playerId, candidate].map(id => [id, { playerId: id, status: 'ready', imageUrl: baseURL + '/quota-image.svg', promptHistory: ['sparkles'] }])) };
  await page.addInitScript(id => localStorage.setItem('prompt-royale:player-id', id), playerId);
  await page.addInitScript(() => localStorage.setItem('prompt-royale:name', 'Tester'));
  await page.route('**/api/availability', route => route.fulfill({ json: { available: true, remaining: 1 } }));
  await page.route('**/api/rooms/ABCDEF/state', route => route.fulfill({ json: snapshot }));
  await page.route('**/quota-image.svg', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="purple"/></svg>' }));
  let live;
  await page.routeWebSocket('**/api/rooms/ABCDEF/live**', socket => { live = socket; socket.send(JSON.stringify(snapshot)); });
  await page.route('**/api/rooms/ABCDEF/actions/submit', route => route.fulfill({ status: 429, json: {
    code: 'FREE_AI_LIMIT', error: "Today's shared free image allowance is used up.", resetAt: '2026-09-12T00:00:00.000Z'
  } }));
  await page.goto(baseURL + '/room/ABCDEF');
  await page.getByLabel('Add another twist to your image').fill('more sparkles');
  await page.getByRole('button', { name: 'Evolve image' }).click();
  await expect(page.locator('#service-notice')).toContainText('free image allowance is used up');
  await expect(page.getByRole('button', { name: 'Evolve image' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Record voice' })).toBeDisabled();
  await expect(page.locator('.entry-image')).toHaveCount(2);
  live.send(JSON.stringify({ ...snapshot, phase: 'voting', promptEndsAt: null, votingEndsAt: Date.now() + 30_000 }));
  await expect(page.getByRole('button', { name: 'Vote for this' })).toBeEnabled();
});

test('controls recover when the daily allowance becomes available again', async ({ page }) => {
  await page.clock.install();
  await page.route('**/api/availability', route => route.fulfill({ json: { available: true, remaining: 80 } }));
  await page.route('**/api/rooms', route => route.fulfill({ status: 429, json: {
    code: 'FREE_AI_LIMIT', error: "Today's shared free image allowance is used up.", resetAt: '2026-09-12T00:00:00.000Z'
  } }));
  await page.goto(baseURL);
  await page.getByLabel('Your stage name').fill('Reset Tester');
  await page.getByRole('button', { name: 'Create room' }).click();
  await expect(page.getByRole('button', { name: 'Create room' })).toBeDisabled();
  await page.clock.fastForward(60_100);
  await expect(page.getByRole('button', { name: 'Create room' })).toBeEnabled();
  await expect(page.locator('#service-notice')).toContainText('Free public play');
});
