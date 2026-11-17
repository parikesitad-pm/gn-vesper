import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHmac, randomBytes } from "node:crypto";
import { parseRepository, DEFAULT_PREFERENCES, githubUrl, type Repository } from "../lib/github/types";
import { encrypt, decrypt, verifyWebhook } from "../lib/github/security";
import { createFileStore } from "../lib/github/store";
import { normalizeEvent, acceptEvent } from "../lib/github/events";
import { eventMatches, parsePreferences } from "../lib/github/preferences";
import { changedPulls } from "../lib/github/browser";
import { parseSubscription } from "../lib/github/push";
import { getRepository, getPullDetail, GitHubError } from "../lib/github/api";

const prPayload = { action: "review_requested", repository: { full_name: "owner/repo", id: 10 }, sender: { login: "alice" }, requested_reviewer: { login: "bob" }, pull_request: { number: 3, title: "Fix loading", html_url: "https://github.com/owner/repo/pull/3" } };

test("repository URLs are normalized and arbitrary hosts, paths, and credentials are rejected", () => {
  for (const input of ["owner/repo", "https://github.com/owner/repo.git", "github.com/owner/repo", "https://github.com/owner/repo/?tab=readme"]) assert.equal(parseRepository(input).fullName, "owner/repo");
  for (const input of ["http://github.com/owner/repo", "https://github.com.evil.test/owner/repo", "https://token@github.com/owner/repo", "https://localhost/owner/repo", "owner/..", "owner/repo/tree/main", "owner/repo?x=1", "https://github.com:444/owner/repo"]) assert.throws(() => parseRepository(input));
  assert.equal(githubUrl("javascript:alert(1)"), "https://github.com");
});
test("AES-GCM encrypts tokens and rejects tampered ciphertext and wrong keys", () => {
  const key = randomBytes(32).toString("hex");
  const sealed = encrypt("fake-test-token", key);
  assert.ok(!sealed.includes("fake-test-token"));
  assert.equal(decrypt(sealed, key), "fake-test-token");
  assert.throws(() => decrypt(sealed, randomBytes(32).toString("hex")));
  const pieces = sealed.split("."); pieces[2] = Buffer.from("tampered").toString("base64url");
  assert.throws(() => decrypt(pieces.join("."), key));
});
test("webhook validation checks exact original body and full signature", () => {
  const secret = "unit-test-webhook-secret";
  const body = JSON.stringify(prPayload);
  const signature = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
  assert.equal(verifyWebhook(body, signature, secret), true);
  assert.equal(verifyWebhook(`${body} `, signature, secret), false);
  assert.equal(verifyWebhook(body, "sha256=00", secret), false);
  assert.equal(verifyWebhook(body, null, secret), false);
  assert.equal(verifyWebhook(body, signature, ""), false);
});
test("events preserve state semantics and never invent a merged PR", () => {
  const review = normalizeEvent("pull_request", prPayload, "delivery-test-1")!;
  assert.equal(review.kind, "review_requested"); assert.equal(review.recipient, "bob");
  assert.equal(normalizeEvent("pull_request", { ...prPayload, action: "labeled" }, "ignored"), null);
  assert.match(normalizeEvent("pull_request", { ...prPayload, action: "closed" }, "closed")!.title, /closed/);
  assert.match(normalizeEvent("pull_request", { ...prPayload, action: "closed", pull_request: { ...prPayload.pull_request, merged: true } }, "merged")!.title, /merged/);
  assert.equal(normalizeEvent("check_run", { action: "completed", repository: prPayload.repository, check_run: { name: "tests", conclusion: "success" } }, "success"), null);
  assert.equal(normalizeEvent("check_run", { action: "completed", repository: prPayload.repository, check_run: { name: "tests", conclusion: "failure" } }, "failed")!.kind, "check_failed");
  assert.equal(normalizeEvent("release", { action: "published", repository: prPayload.repository, release: { tag_name: "v1.0", html_url: "https://github.com/owner/repo/releases/tag/v1.0" } }, "release")!.kind, "release");
});
test("preferences filter direct activity and reject unsupported inputs", () => {
  const event = normalizeEvent("pull_request", prPayload, "delivery")!;
  assert.equal(eventMatches(event, { ...DEFAULT_PREFERENCES, mode: "mine" }, "bob"), true);
  assert.equal(eventMatches(event, { ...DEFAULT_PREFERENCES, mode: "mine" }, "eve"), false);
  assert.equal(eventMatches(event, { ...DEFAULT_PREFERENCES, kinds: [] }, "bob"), false);
  assert.throws(() => parsePreferences({ ...DEFAULT_PREFERENCES, mode: "unknown" }));
  assert.throws(() => parsePreferences({ ...DEFAULT_PREFERENCES, kinds: ["arbitrary"] }));
});
test("file storage survives reopening and concurrent duplicate deliveries notify once", async () => {
  const dir = await mkdtemp(join(tmpdir(), "vesper-store-test-"));
  try {
    const store = createFileStore(dir);
    const repo = { id: 10, fullName: "owner/repo" } as Repository;
    await store.put("watch:1", [{ repo, addedAt: new Date().toISOString() }]);
    await store.put("user:1", { login: "bob" });
    await store.put("preferences:1", { ...DEFAULT_PREFERENCES, browserNotifications: true });
    await store.put("watch:2", [{ repo: { id: 11, fullName: "other/repo" } }]);
    await store.put("user:2", { login: "eve" });
    const delivered: number[] = [];
    const event = normalizeEvent("pull_request", prPayload, "delivery-concurrent")!;
    const results = await Promise.all(Array.from({ length: 8 }, () => acceptEvent(store, event, async userId => { delivered.push(userId); })));
    assert.equal(results.filter(Boolean).length, 1);
    assert.deepEqual(delivered, [1]);
    const reopened = createFileStore(dir);
    assert.equal((await reopened.entries("event:")).length, 1);
    assert.equal((await reopened.get<{ login: string }>("user:2"))?.login, "eve");
    await reopened.put("preferences:1", { ...DEFAULT_PREFERENCES, mode: "digest", browserNotifications: true });
    await acceptEvent(reopened, { ...event, id: "digest-event" }, async userId => { delivered.push(userId); });
    assert.deepEqual(delivered, [1]);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
test("public snapshot comparison uses a baseline and reports only known changes", () => {
  const pull = { number: 3, title: "Tests", url: "https://github.com/owner/repo/pull/3", state: "open", draft: false, author: "bob", updatedAt: "2026-11-17T00:00:00Z", reviewRequested: false, headSha: "a" };
  assert.deepEqual(changedPulls("owner/repo", undefined, [pull]), []);
  const baseline = { pulls: [pull], fetchedAt: pull.updatedAt };
  assert.deepEqual(changedPulls("owner/repo", baseline, [pull]), []);
  assert.deepEqual(changedPulls("owner/repo", baseline, []), []);
  assert.match(changedPulls("owner/repo", baseline, [{ ...pull, updatedAt: "2026-11-17T01:00:00Z" }])[0].title, /updated/);
});
test("push registration rejects arbitrary endpoints and private network targets", () => {
  const keys = { p256dh: "a".repeat(87), auth: "b".repeat(22) };
  assert.equal(parseSubscription({ endpoint: "https://fcm.googleapis.com/fcm/send/test", keys }).endpoint, "https://fcm.googleapis.com/fcm/send/test");
  for (const endpoint of ["https://localhost/push", "https://127.0.0.1/push", "http://fcm.googleapis.com/push", "https://fcm.googleapis.com.evil.test/push", "https://fcm.googleapis.com:444/push"]) assert.throws(() => parseSubscription({ endpoint, keys }));
});
test("GitHub adapter calls fixed API paths, maps detail, and reports rate limits", async () => {
  const original = globalThis.fetch;
  const paths: string[] = [];
  globalThis.fetch = async (input, init) => {
    const url = String(input); paths.push(url);
    assert.ok(url.startsWith("https://api.github.com/"));
    assert.equal(new Headers(init?.headers).get("authorization"), "Bearer fixture-token");
    if (url.includes("limited")) return new Response("{}", { status: 403, headers: { "x-ratelimit-remaining": "0", "x-ratelimit-reset": "2000000000" } });
    if (url.includes("/reviews")) return Response.json([{ user: { login: "bob" }, state: "APPROVED" }]);
    if (url.includes("/check-runs")) return Response.json({ check_runs: [{ name: "tests", status: "completed", conclusion: "success", html_url: "https://github.com/owner/repo/actions/runs/1" }] });
    if (url.includes("/pulls/")) return Response.json({ number: 3, title: "Fixture", html_url: "https://github.com/owner/repo/pull/3", state: "open", user: { login: "alice" }, updated_at: "now", head: { sha: "abc" }, requested_reviewers: [{ login: "bob" }], body: "Description", changed_files: 2, additions: 3, deletions: 1 });
    return Response.json({ id: 1, full_name: "owner/repo", description: null, html_url: "https://github.com/owner/repo", private: false, default_branch: "main" });
  };
  try {
    assert.equal((await getRepository(parseRepository("owner/repo"), "fixture-token")).fullName, "owner/repo");
    const detail = await getPullDetail(parseRepository("owner/repo"), 3, "fixture-token", "bob");
    assert.equal(detail.reviewRequested, true); assert.equal(detail.reviews[0].state, "APPROVED"); assert.equal(detail.checks[0].conclusion, "success");
    await assert.rejects(getRepository(parseRepository("owner/limited"), "fixture-token"), error => error instanceof GitHubError && error.status === 429 && !!error.retryAt);
    assert.equal(paths.length, 5);
  } finally { globalThis.fetch = original; }
});
