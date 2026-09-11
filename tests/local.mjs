import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Miniflare, Log, LogLevel, convertV4MiniflareOptions } from 'miniflare';

test('atomic AI cap, failed evolution recovery, session isolation and server-side results', async () => {
  const common = { modules: true, compatibilityDate: '2026-09-11', compatibilityFlags: ['nodejs_compat'], d1Databases: { GALLERY: 'local-gallery' } };
  const mf = new Miniflare(convertV4MiniflareOptions({ log: new Log(LogLevel.ERROR), workers: [
    { ...common, name: 'prompt-royale', scriptPath: 'promptroyale/dist/index.js',
      bindings: { DAILY_AI_LIMIT: '1', ALLOW_MOCK_ENTRIES: 'true' }, r2Buckets: ['IMAGES'],
      durableObjects: { ROOMS: { className: 'Room', scriptName: 'prompt-royale-do', useSQLite: true } },
      ratelimits: { ROOM_LIMITER: { namespace_id: '1', simple: { limit: 20, period: 60 } }, API_LIMITER: { namespace_id: '2', simple: { limit: 120, period: 60 } } }
    },
    { ...common, name: 'prompt-royale-do', scriptPath: 'promptroyale-do/dist/room.js', durableObjects: { ROOMS: { className: 'Room', useSQLite: true } } }
  ] }));
  const sockets = [];
  try {
    const db = await mf.getD1Database('GALLERY', 'prompt-royale');
    const sql = await Promise.all(['0001_winners.sql', '0002_player_stats.sql', '0003_usage.sql'].map(name => readFile('promptroyale/migrations/' + name, 'utf8')));
    await db.batch(sql.join('\n').split(';').map(s => s.trim()).filter(Boolean).map(s => db.prepare(s)));
    const request = (path, init = {}) => mf.dispatchFetch('https://game.test' + path, init);
    const create = await request('/api/rooms', { method: 'POST' });
    assert.equal(create.status, 201);
    const { code } = await create.json();
    const ids = [0, 1].map(i => ({ playerId: 'local-player-' + i, sessionToken: crypto.randomUUID() + crypto.randomUUID() }));
    for (const [i, id] of ids.entries()) {
      const query = new URLSearchParams({ ...id, name: 'Local ' + i });
      const response = await request('/api/rooms/' + code + '/live?' + query, { headers: { Upgrade: 'websocket' } });
      assert.equal(response.status, 101);
      response.webSocket.accept();
      sockets.push(response.webSocket);
    }
    const action = (i, verb, extra = {}) => request('/api/rooms/' + code + '/actions/' + verb, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...ids[i], ...extra }) });
    const theft = await request('/api/rooms/' + code + '/live?' + new URLSearchParams({ ...ids[0], sessionToken: 'x'.repeat(64), name: 'Impostor' }), { headers: { Upgrade: 'websocket' } });
    assert.equal(theft.status, 403);
    assert.equal((await action(0, 'start', { roundDurationSeconds: 60 })).status, 200);
    for (let i = 0; i < 2; i++) assert.equal((await action(i, 'mock-entry', { transcript: 'A safe colorful balloon' })).status, 200);
    const before = await (await request('/api/rooms/' + code + '/state')).json();
    const attempts = await Promise.all([action(0, 'submit', { transcript: 'sparkles' }), action(1, 'submit', { transcript: 'confetti' })]);
    assert.deepEqual(attempts.map(r => r.status).sort(), [429, 502]);
    assert.equal((await db.prepare('SELECT attempts FROM daily_ai_usage').first()).attempts, 1);
    const after = await (await request('/api/rooms/' + code + '/state')).json();
    for (const id of ids) {
      assert.equal(after.entries[id.playerId].status, 'ready');
      assert.equal(after.entries[id.playerId].imageUrl, before.entries[id.playerId].imageUrl);
      assert.equal(after.entries[id.playerId].finalPrompt, before.entries[id.playerId].finalPrompt);
    }
    assert.equal((await request('/api/rooms', { method: 'POST', headers: { origin: 'https://other.test' } })).status, 403);
    const invalidBody = await request('/api/rooms/' + code + '/actions/speech', { method: 'POST', headers: { 'content-type': 'multipart/form-data; boundary=invalid' }, body: 'invalid' });
    assert.equal(invalidBody.status, 400);
    // No browser calls finalize. The room's alarm must save the completed game itself.
    sockets.forEach(s => s.close());
    const deadline = Date.now() + 100_000;
    let saved;
    while (Date.now() < deadline) {
      saved = await db.prepare('SELECT COUNT(*) AS n FROM game_players WHERE room_code = ?').bind(code).first();
      if (saved.n === 2) break;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    assert.equal(saved.n, 2);
    assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM winners WHERE room_code = ?').bind(code).first()).n, 1);
  } finally {
    await mf.dispose();
  }
});
