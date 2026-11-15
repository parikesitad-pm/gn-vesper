/**
 * Entity identity tests.
 *
 * These are the permanent product boundaries: Vesper (GN-013), Owl (GN-011) and dap_ are three distinct roles.
 * A model provider is infrastructure, not an entity. The tests exercise the deterministic layer directly and
 * through the same `resolve()` the notch runs, so a routing change cannot silently send an identity question to
 * retrieval or, worse, to an action.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { identityIntent, OWL, VESPER } from "../lib/identity";
import { resolve } from "../lib/intent/pipeline";
import { answerQuestion, identityAnswer } from "../lib/rag/answer";
import { CREATOR_SITE_SOURCE } from "../lib/rag/sources";
import type { Provider } from "../lib/providers/types";

const DEMO = { aiAvailable: false } as const;

const answer = (question: string) => {
  const result = identityAnswer(question);
  assert.ok(result, `expected a deterministic identity answer for: ${question}`);
  return result;
};

// --- the eight acceptance cases ---------------------------------------------------------------

test("1. Who are you? identifies as Vesper GN-013", () => {
  const a = answer("Who are you?");
  assert.equal(a.mode, "identity");
  assert.equal(a.provider, "local");
  assert.match(a.answer, /Vesper/);
  assert.match(a.answer, new RegExp(VESPER.id));
  assert.doesNotMatch(a.answer, /I'm Owl/);
});

test("2. Are you Owl? clearly distinguishes Vesper from Owl", () => {
  const a = answer("Are you Owl?");
  assert.match(a.answer, /^No\./);
  assert.match(a.answer, /Vesper/);
  assert.match(a.answer, new RegExp(OWL.name));
  assert.match(a.answer, new RegExp(OWL.id));
  assert.match(a.answer, /separate/);
});

test("3. Who is Owl? describes Owl as a separate assistant", () => {
  const a = answer("Who is Owl?");
  assert.match(a.answer, new RegExp(OWL.name));
  assert.match(a.answer, new RegExp(OWL.id));
  assert.match(a.answer, /separate/);
  assert.match(a.answer, /dap_/);
  assert.match(a.answer, /no live Owl integration/);
});

test("4. Who created you? identifies dap_ and links the creator website", () => {
  const a = answer("Who created you?");
  assert.match(a.answer, /dap_/);
  assert.match(a.answer, /Dausan Adam Parikesit/);
  assert.ok(a.sources.some((s) => s.url === CREATOR_SITE_SOURCE.url));
});

test("5. Are you dap_? clarifies that dap_ is the human creator", () => {
  const a = answer("Are you dap_?");
  assert.match(a.answer, /^No/);
  assert.match(a.answer, /human creator/);
  assert.match(a.answer, /Vesper/);
  assert.doesNotMatch(a.answer, /^Yes/);
});

test("6. Which AI provider are you? separates provider from identity", () => {
  const a = answer("Which AI provider are you?");
  assert.match(a.answer, /Gemini/);
  assert.match(a.answer, /Groq/);
  assert.match(a.answer, /not my identity/);
  assert.match(a.answer, /Vesper/);
  assert.doesNotMatch(a.answer, /^I am Gemini/);
});

test("7. Can you replace Owl? explains the different responsibilities", () => {
  const a = answer("Can you replace Owl?");
  assert.match(a.answer, /^No\./);
  assert.match(a.answer, /separate roles/);
  assert.match(a.answer, /Vesper/);
  assert.match(a.answer, /Owl/);
});

test("8. Where can I meet Owl? points to the verified creator site only", () => {
  const a = answer("Where can I meet Owl?");
  assert.match(a.answer, /no live Owl integration/);
  assert.match(a.answer, /d-ap\.my\.id/);
  assert.ok(a.sources.length > 0);
  assert.ok(a.sources.every((s) => s.url === CREATOR_SITE_SOURCE.url));
});

// --- routing ------------------------------------------------------------------------------------

const ACCEPTANCE = [
  "Who are you?",
  "Are you Owl?",
  "Who is Owl?",
  "Who created you?",
  "Are you dap_?",
  "Which AI provider are you?",
  "Can you replace Owl?",
  "Where can I meet Owl?",
];

test("every identity question routes to read-only knowledge, never to an action", async () => {
  for (const question of ACCEPTANCE) {
    const { intent, knowledge, trace } = await resolve(question, DEMO);
    assert.equal(intent, null, question);
    assert.deepEqual(knowledge, { question }, question);
    assert.equal(trace.kind, "know", question);
    assert.equal(trace.status, "ok", question);
  }
});

test("identity answers short-circuit before retrieval and providers, even when configured", async () => {
  const failing: Provider = {
    id: "gemini",
    model: "fake-flash",
    generate: async () => {
      throw new Error("gemini-503");
    },
  };
  const a = await answerQuestion("Who created Vesper?", {}, { hits: [], chain: [failing] });
  assert.equal(a.mode, "identity");
  assert.equal(a.provider, "local");
});

// --- Indonesian and negative cases --------------------------------------------------------------

test("the same boundaries hold in Indonesian", () => {
  const self = answer("Siapa kamu?");
  assert.match(self.answer, /Saya Vesper/);
  assert.match(self.answer, new RegExp(VESPER.id));

  const owl = answer("Apakah kamu Owl?");
  assert.match(owl.answer, /^Bukan\./);
  assert.match(owl.answer, new RegExp(OWL.id));

  const creator = answer("Siapa pembuatmu?");
  assert.match(creator.answer, /Dausan Adam Parikesit/);

  const isCreator = answer("Apakah kamu dap_?");
  assert.match(isCreator.answer, /manusia pembuatnya/);

  const provider = answer("Provider AI apa kamu?");
  assert.match(provider.answer, /bukan identitas saya/);

  const replace = answer("Bisakah kamu menggantikan Owl?");
  assert.match(replace.answer, /^Tidak\./);

  const meet = answer("Di mana saya bisa bertemu Owl?");
  assert.match(meet.answer, /integrasi Owl langsung/);
  assert.match(meet.answer, /d-ap\.my\.id/);
});

test("non-identity creator questions still go to grounded retrieval", () => {
  assert.equal(identityIntent("What does dap_ build?"), null);
  assert.equal(identityIntent("Where is dap_ based?"), null);
  assert.equal(identityIntent("Who is dap_?"), null);
  // An Owl topic question that is not about identity is left to retrieval.
  assert.equal(identityIntent("What projects use Owl?"), null);
});

test("identity recognition does not swallow unrelated questions", () => {
  assert.equal(identityIntent("Who created React?"), null);
  assert.equal(identityIntent("What model is best for React?"), null);
  assert.equal(identityIntent("change the theme"), null);
  assert.equal(identityIntent("how do I go back?"), null);
});
