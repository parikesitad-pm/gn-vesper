/**
 * Provider selection and fallback-chain tests. No network: a provider here is a plain object whose `generate`
 * is a fake, which is exactly the contract the adapters satisfy.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { answerChain, aiConfigured, answerConfigured, classifyChain, ProviderChainError, runChain } from "../lib/providers";
import { geminiProvider } from "../lib/providers/gemini";
import { groqProvider } from "../lib/providers/groq";
import type { Provider } from "../lib/providers/types";

function fake(id: Provider["id"], generate: Provider["generate"]): Provider {
  return { id, model: `${id}-fake`, generate };
}

test("no keys means Demo Mode, with an empty chain", () => {
  assert.deepEqual(classifyChain({}), []);
  assert.deepEqual(answerChain({}), []);
  assert.equal(aiConfigured({}), false);
  assert.equal(answerConfigured({}), false);
});

test("classification prefers Groq, then Gemini; answers prefer Gemini, then Groq", () => {
  const env = { GROQ_API_KEY: "g", GEMINI_API_KEY: "m" };
  assert.deepEqual(
    classifyChain(env).map((p) => p.id),
    ["groq", "gemini"],
  );
  assert.deepEqual(
    answerChain(env).map((p) => p.id),
    ["gemini", "groq"],
  );
  assert.equal(aiConfigured(env), true);
  assert.equal(answerConfigured(env), true);
});

test("a pinned classification provider is respected, with the other as fallback", () => {
  const env = { GROQ_API_KEY: "g", GEMINI_API_KEY: "m", VESPER_AI_PROVIDER: "gemini" };
  assert.deepEqual(
    classifyChain(env).map((p) => p.id),
    ["gemini"],
  );
  const groqPinned = { GROQ_API_KEY: "g", GEMINI_API_KEY: "m", VESPER_AI_PROVIDER: "groq" };
  assert.deepEqual(
    classifyChain(groqPinned).map((p) => p.id),
    ["groq", "gemini"],
  );
});

test("model ids stay configurable and default only when unset", () => {
  assert.equal(groqProvider({ GROQ_API_KEY: "g" })?.model, "openai/gpt-oss-20b");
  assert.equal(groqProvider({ GROQ_API_KEY: "g", VESPER_GROQ_MODEL: "custom/model" })?.model, "custom/model");
  assert.equal(geminiProvider({ GEMINI_API_KEY: "m" })?.model, "gemini-3.5-flash-lite");
  assert.equal(geminiProvider({ GEMINI_API_KEY: "m", VESPER_GEMINI_MODEL: "custom-flash" })?.model, "custom-flash");
});

test("a failing provider is recorded, then the next provider answers", async () => {
  const chain = [
    fake("groq", async () => {
      throw new Error("groq-429");
    }),
    fake("gemini", async () => "theme neon"),
  ];

  const reply = await runChain(chain, "system", "make it neon");
  assert.equal(reply.text, "theme neon");
  assert.equal(reply.provider, "gemini");
  assert.equal(reply.attempts.length, 2);
  assert.deepEqual(
    reply.attempts.map((a) => [a.provider, a.ok, a.error]),
    [
      ["groq", false, "groq-429"],
      ["gemini", true, undefined],
    ],
  );
});

test("an exhausted chain throws with the full attempt history", async () => {
  const chain = [
    fake("groq", async () => {
      throw new Error("groq-500");
    }),
    fake("gemini", async () => {
      throw new Error("gemini-503");
    }),
  ];

  await assert.rejects(
    runChain(chain, "system", "hello"),
    (err: unknown) => {
      assert.ok(err instanceof ProviderChainError);
      assert.deepEqual(
        err.attempts.map((a) => a.provider),
        ["groq", "gemini"],
      );
      assert.match(err.message, /providers-failed: groq, gemini/);
      return true;
    },
  );
});
