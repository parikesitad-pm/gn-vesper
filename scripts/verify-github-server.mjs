import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { once } from 'node:events';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { randomBytes, createHmac } from 'node:crypto';

const directory = await mkdtemp(join(tmpdir(), 'vesper-server-test-'));
const origin = 'http://localhost:3002';
const secret = randomBytes(32).toString('hex');
const environment = { ...process.env, APP_URL: origin, PORT: '3002', GITHUB_APP_SLUG: 'fixture', GITHUB_CLIENT_ID: 'fixture-client', GITHUB_CLIENT_SECRET: randomBytes(32).toString('hex'), GITHUB_WEBHOOK_SECRET: secret, SESSION_SECRET: randomBytes(32).toString('hex'), TOKEN_ENCRYPTION_KEY: randomBytes(32).toString('hex'), DATABASE_URL: '', VERCEL: '', VESPER_DATA_DIR: directory, VAPID_PUBLIC_KEY: '', VAPID_PRIVATE_KEY: '', VAPID_SUBJECT: '', NODE_OPTIONS: `--import=${resolve('tests/fixtures/github-fetch.mjs')}` };
let server;
let logs = '';
async function start() {
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', '3002'], { env: environment, stdio: ['ignore', 'pipe', 'pipe'] });
  for (const stream of [server.stdout, server.stderr]) stream.on('data', chunk => { logs += chunk.toString(); });
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw new Error(`Fixture server exited: ${logs}`);
    try { if ((await fetch(`${origin}/api/github/status`)).ok) return; } catch { /* Wait for the isolated server to listen. */ }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Fixture server did not start: ${logs}`);
}
async function stop() {
  if (server && server.exitCode === null) { server.kill('SIGTERM'); await once(server, 'exit'); }
}
async function request(path, cookie = '', method = 'GET', body) {
  const response = await fetch(`${origin}/api/github/${path}`, { method, redirect: 'manual', headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  return { response, data: response.headers.get('content-type')?.includes('json') ? await response.json() : null };
}
async function login(owner) {
  const start = await request('auth/start');
  assert.equal(start.response.status, 302);
  const url = new URL(start.response.headers.get('location'));
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
  const cookie = start.response.headers.getSetCookie().find(value => value.startsWith('vesper_oauth=')).split(';')[0];
  const result = await request(`auth/callback?state=${url.searchParams.get('state')}&code=${owner}`, cookie);
  assert.equal(result.response.headers.get('location'), `${origin}/vesper?auth=connected`);
  const session = result.response.headers.getSetCookie().find(value => value.startsWith('vesper_session='));
  assert.ok(session.includes('HttpOnly')); assert.ok(session.includes('SameSite=lax'));
  return session.split(';')[0];
}
async function deliver(id, action = 'opened') {
  const body = JSON.stringify({ action, repository: { full_name: 'alice/private', id: 10 }, sender: { login: 'alice' }, pull_request: { number: 3, title: 'Fixture change', html_url: 'https://github.com/alice/private/pull/3', user: { login: 'alice' } } });
  const response = await fetch(`${origin}/api/github/webhook`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-GitHub-Event': 'pull_request', 'X-GitHub-Delivery': id, 'X-Hub-Signature-256': `sha256=${createHmac('sha256', secret).update(body).digest('hex')}` }, body });
  assert.equal(response.status, 200);
  return response.json();
}
try {
  await start();
  assert.equal((await request('status')).data.ready, true);
  assert.equal((await request('activity')).response.status, 401);
  const invalidState = await request('auth/callback?state=wrong&code=alice');
  assert.equal(invalidState.response.headers.get('location'), `${origin}/vesper?auth=invalid-state`);
  const alice = await login('alice');
  const bob = await login('bob');
  const status = await request('status', alice);
  assert.equal(status.data.user.login, 'alice');
  assert.ok(!JSON.stringify(status.data).includes('fixture-alice'));
  assert.equal((await request('repositories', alice)).data.available[0].fullName, 'alice/private');
  assert.equal((await request('repositories', alice, 'POST', { repo: 'alice/private' })).response.status, 200);
  assert.equal((await request('repositories', bob, 'POST', { repo: 'alice/private' })).response.status, 403);
  assert.equal((await request('repositories', bob, 'POST', { repo: 'bob/private' })).response.status, 200);
  const detail = await request('repository?repo=alice/private&pull=3', alice);
  assert.equal(detail.data.pull.reviews[0].state, 'APPROVED');
  assert.equal(detail.data.pull.checks[0].conclusion, 'success');
  assert.equal((await request('repository?repo=alice/private', bob)).response.status, 404);
  assert.equal((await request('repository?repo=alice/private')).response.status, 404);
  assert.equal((await deliver('fixture-delivery-1')).duplicate, false);
  assert.equal((await deliver('fixture-delivery-1')).duplicate, true);
  const activity = (await request('activity', alice)).data;
  assert.equal(activity.events.length, 1);
  assert.equal((await request('activity', bob)).data.events.length, 0);
  await request('activity', alice, 'POST', { readAt: activity.events[0].at });
  assert.equal((await request('activity', alice)).data.readAt, activity.events[0].at);
  const preferences = { mode: 'digest', kinds: ['release'], browserNotifications: false };
  assert.equal((await request('preferences', alice, 'PUT', preferences)).response.status, 200);
  assert.equal((await request('activity', alice)).data.events.length, 0);
  const crossOrigin = await fetch(`${origin}/api/github/repositories`, { method: 'POST', headers: { Origin: 'https://other.example', Cookie: alice, 'Content-Type': 'application/json' }, body: JSON.stringify({ repo: 'alice/private' }) });
  assert.equal(crossOrigin.status, 403);
  const badWebhook = await fetch(`${origin}/api/github/webhook`, { method: 'POST', headers: { 'X-Hub-Signature-256': 'sha256=00' }, body: '{}' });
  assert.equal(badWebhook.status, 401);
  await stop(); await start();
  assert.equal((await request('status', alice)).data.user.login, 'alice');
  assert.equal((await request('repositories', alice)).data.watched.length, 1);
  assert.deepEqual((await request('preferences', alice)).data.preferences, preferences);
  assert.equal((await request('auth/logout', alice, 'POST', { forget: true })).response.status, 200);
  assert.equal((await request('activity', alice)).response.status, 401);
  const reconnected = await login('alice');
  assert.equal((await request('repositories', reconnected)).data.watched.length, 0);
  const expired = await login('expired');
  assert.equal((await request('status', expired)).data.user.login, 'alice');
  const revoked = await login('revoked');
  assert.equal((await request('status', revoked)).data.user, null);
  assert.equal((await request('auth/logout', revoked, 'POST', { forget: true })).response.status, 200);
  assert.equal((await request('repositories', bob)).data.watched.length, 1);
  await request('auth/logout', bob, 'POST', {});
  assert.equal((await request('activity', bob)).response.status, 401);
  console.log('PASS: OAuth/PKCE, sessions, token refresh/revocation recovery, account isolation, private PR detail, signed webhooks/deduplication, read state, preferences, origin rejection, restart persistence, account deletion and logout. GitHub responses are fixtures.');
} finally { await stop(); await rm(directory, { recursive: true, force: true }); }
