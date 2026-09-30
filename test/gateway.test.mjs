import test from 'node:test';
import assert from 'node:assert/strict';

process.env.DATABASE_URL ??= 'postgres://gateway:gateway@localhost:5433/gateway';
process.env.AI_API_KEY ??= 'test';
process.env.AI_MODEL ??= 'test';
process.env.AI_BASE_URL ??= 'http://127.0.0.1:9';
process.env.APP_ORIGIN ??= 'http://localhost:5173';
const { app, pool } = await import('../server.mjs');
const server = app.listen(0, '127.0.0.1');
await new Promise(resolve => server.once('listening', resolve));
const address = server.address();
const base = `http://127.0.0.1:${address.port}`;

test.after(async () => {
  await new Promise(resolve => server.close(resolve));
  await pool.end();
});

test('AC-1: session endpoint creates an anonymous cookie', async () => {
  const response = await fetch(`${base}/api/session`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}',
  });
  assert.equal(response.status, 200);
  assert.match(response.headers.get('set-cookie') || '', /^ai_session=[a-f0-9]{64};/);
  assert.match((await response.json()).sessionId, /^[0-9a-f-]{36}$/);
});

test('AC-5: history cannot be read without the session cookie', async () => {
  const response = await fetch(`${base}/api/history`);
  assert.equal(response.status, 401);
});

test('invalid prompt is rejected before the AI provider', async () => {
  const session = await fetch(`${base}/api/session`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}',
  });
  const cookie = session.headers.get('set-cookie').split(';', 1)[0];
  const response = await fetch(`${base}/api/requests`, {
    method: 'POST', headers: { 'content-type': 'application/json', cookie }, body: JSON.stringify({ prompt: ' ' }),
  });
  assert.equal(response.status, 400);
});
