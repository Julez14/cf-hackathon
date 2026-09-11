import { test, expect, chromium } from '@playwright/test';

const baseURL = process.env.TEST_BASE_URL;
test.skip(!baseURL, 'Set TEST_BASE_URL to a deployed game; this test uses real AI.');

test('four guests complete a real game with typing, voice, reconnects and persistence', async () => {
  test.setTimeout(300_000);
  const browser = await chromium.launch({ args: [
    '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream',
    ...(process.env.TEST_AUDIO_FILE ? ['--use-file-for-fake-audio-capture=' + process.env.TEST_AUDIO_FILE] : [])
  ] });
  const contexts = [];
  const errors = [];
  try {
    for (let i = 0; i < 5; i++) contexts.push(await browser.newContext({
      baseURL, permissions: ['microphone'], viewport: i === 3 ? { width: 390, height: 844 } : { width: 1280, height: 900 }
    }));
    const pages = await Promise.all(contexts.map(c => c.newPage()));
    pages.forEach(p => p.on('pageerror', e => errors.push(e.message)));
    const [host, second, third, fourth, extra] = pages;
    await host.goto('/');
    await expect(host.getByLabel('Your stage name')).toBeVisible();
    await host.getByLabel('Your stage name').fill('Pixel Pirate');
    await host.getByRole('button', { name: 'Create room' }).click();
    await host.waitForURL('**/room/*');
    const code = new URL(host.url()).pathname.split('/').pop();
    console.log('Created public room', code);
    await expect(host.getByRole('button', { name: 'Start game' })).toBeDisabled();
    await host.getByRole('button', { name: 'Giant QR' }).click();
    await expect(host.locator('#qr-dialog img')).toBeVisible();
    expect(await host.locator('#qr-dialog img').evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
    await host.getByRole('button', { name: 'Close QR code' }).click();
    await second.goto('/');
    await second.getByLabel('Your stage name').fill('Disco Frog');
    await second.getByRole('tab', { name: 'Join', exact: true }).click();
    for (let i = 0; i < code.length; i++) await second.getByLabel('Room code character ' + (i + 1)).fill(code[i]);
    await second.getByRole('button', { name: 'Join the madness' }).click();
    for (const [page, name] of [[third, 'Moon Duck'], [fourth, 'Wizard Cat']]) {
      await page.goto('/room/' + code);
      await page.getByLabel('Your stage name').fill(name);
      await page.getByRole('button', { name: 'Enter lobby' }).click();
      await expect(page.locator('#connection-state')).toHaveText('Live');
    }
    await expect(host.getByText('4 / 4 chaos agents ready')).toBeVisible();
    await extra.goto('/room/' + code);
    await extra.getByLabel('Your stage name').fill('Extra Player');
    await extra.getByRole('button', { name: 'Enter lobby' }).click();
    await expect(extra.getByRole('heading', { name: 'This room is full.' })).toBeVisible();

    const identities = await Promise.all(pages.slice(0, 4).map(page => page.evaluate(code => ({
      playerId: localStorage.getItem('prompt-royale:player-id'),
      sessionToken: localStorage.getItem('prompt-royale:room-token:' + code)
    }), code)));
    const action = (i, verb, fields = {}) => contexts[i].request.post('/api/rooms/' + code + '/actions/' + verb, { data: { ...identities[i], ...fields } });
    expect((await action(1, 'start', { roundDurationSeconds: 120 })).status()).toBe(403);
    expect((await action(0, 'start', { sessionToken: 'x'.repeat(64), roundDurationSeconds: 120 })).status()).toBe(403);
    expect((await action(0, 'mock-entry', { transcript: 'Test' })).status()).toBe(404);
    await host.locator('#round-duration').selectOption('180');
    await host.getByRole('button', { name: 'Start game' }).click();
    await Promise.all(pages.slice(0, 4).map(p => expect(p.getByRole('heading', { name: 'Keep adding twists' })).toBeVisible()));
    console.log('Four-player lobby, QR, room capacity and host authorization passed');

    await second.getByLabel('Your first visual twist').fill('a tiny frog wearing a disco suit');
    await second.getByLabel('Your first visual twist').focus();
    const hostResponse = host.waitForResponse(r => r.url().endsWith('/actions/submit'));
    await host.getByLabel('Your first visual twist').fill('a cheerful pirate with a giant purple hat');
    await host.getByRole('button', { name: 'Create image', exact: true }).click();
    const generated = await hostResponse;
    expect(generated.ok(), await generated.text()).toBe(true);
    await expect(second.locator('#twist-input')).toHaveValue('a tiny frog wearing a disco suit');
    await expect(second.locator('#twist-input')).toBeFocused();
    await third.reload();
    await expect(third.locator('#connection-state')).toHaveText('Live');
    await expect(third.getByLabel('Your first visual twist')).toBeVisible();
    const typedEntries = Promise.all([[second, 'a tiny frog wearing a disco suit'], [third, 'a friendly duck in a space suit']].map(async ([page, prompt]) => {
      await page.getByLabel('Your first visual twist').fill(prompt);
      const pending = page.waitForResponse(r => r.url().endsWith('/actions/submit'));
      await page.getByRole('button', { name: 'Create image', exact: true }).click();
      const response = await pending;
      expect(response.ok(), await response.text()).toBe(true);
    }));
    typedEntries.catch(() => {});
    if (process.env.TEST_AUDIO_FILE) {
      const pending = fourth.waitForResponse(r => r.url().endsWith('/actions/speech'), { timeout: 45_000 });
      pending.catch(() => {});
      await fourth.getByRole('button', { name: 'Record voice' }).click();
      await expect(fourth.getByRole('button', { name: 'Stop recording' })).toBeVisible();
      const response = await pending;
      expect(response.ok(), await response.text()).toBe(true);
      const state = await response.json();
      expect(state.entries[identities[3].playerId].transcript).toMatch(/wizard|purple|hat/i);
      console.log('Voice recording, automatic stop, transcription and image generation passed');
    } else {
      const response = await action(3, 'submit', { transcript: 'a cat with a purple wizard hat' });
      expect(response.ok(), await response.text()).toBe(true);
    }
    await typedEntries;
    const pendingEvolution = host.waitForResponse(r => r.url().endsWith('/actions/submit'));
    await host.getByLabel('Add another twist to your image').fill('and colorful balloons floating above');
    await host.getByRole('button', { name: 'Evolve image' }).click();
    const evolution = await pendingEvolution;
    expect(evolution.ok(), await evolution.text()).toBe(true);
    const evolved = await evolution.json();
    expect(evolved.entries[identities[0].playerId].promptHistory).toHaveLength(2);
    await expect(host.locator('.entry-image')).toHaveCount(4);
    for (const page of pages.slice(0, 4)) {
      await expect.poll(() => page.locator('.entry-image').evaluateAll(images => images.every(img => img.complete && img.naturalWidth > 0))).toBe(true);
    }
    expect(await fourth.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await fourth.screenshot({ path: 'test-results/mobile-game.png', fullPage: true });
    console.log('Five real images, cumulative prompts, draft preservation, reconnect and mobile layout passed');
    await expect(host.getByRole('heading', { name: 'Pick the chaos' })).toBeVisible({ timeout: 190_000 });
    expect((await action(0, 'vote', { candidatePlayerId: identities[0].playerId })).status()).toBe(409);
    expect((await action(0, 'vote', { candidatePlayerId: identities[1].playerId })).ok()).toBe(true);
    expect((await action(0, 'vote', { candidatePlayerId: identities[2].playerId })).status()).toBe(409);
    for (let i = 1; i < 4; i++) await pages[i].locator('.entry-card').filter({ has: pages[i].getByRole('heading', { name: 'Pixel Pirate' }) }).getByRole('button', { name: 'Vote for this' }).click();
    await Promise.all(pages.slice(0, 4).map(p => expect(p.getByRole('heading', { name: 'Pixel Pirate wins!' })).toBeVisible()));
    expect((await action(1, 'submit', { transcript: 'late attempt' })).status()).toBe(409);
    await host.screenshot({ path: 'test-results/results.png', fullPage: true });
    await extra.reload();
    await expect(extra.getByRole('heading', { name: 'Pixel Pirate wins!' })).toBeVisible();
    await expect(extra.locator('#connection-state')).toHaveText('Live');
    await host.getByRole('link', { name: 'Play again' }).click();
    await expect(host.locator('#gallery-grid').getByText('Room ' + code, { exact: false })).toBeVisible();
    const stats = await (await contexts[0].request.get('/api/players/' + identities[0].playerId + '/stats')).json();
    expect(stats).toMatchObject({ games: 1, wins: 1, winRate: 100 });
    expect(errors).toEqual([]);
    console.log('Voting, duplicate/self/late action rejection, shared results, public spectator, gallery and stats passed');
  } catch (error) {
    console.log('Original test failure:', error.message);
    for (const [i, context] of contexts.entries()) {
      const page = context.pages()[0];
      if (page && !page.isClosed()) {
        console.log('Player', i, (await page.locator('body').innerText()).slice(0, 2200));
        await page.screenshot({ path: 'test-results/failure-' + i + '.png', fullPage: true });
      }
    }
    throw error;
  } finally {
    await browser.close();
  }
});
