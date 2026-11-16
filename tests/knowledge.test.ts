/**
 * Retrieval and grounded-answer tests. These are deterministic: the corpus parser, BM25 index, identity path and
 * answer composition take injected data, so no network and no provider key is involved.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  answerQuestion,
  extractiveAnswer,
  identityAnswer,
  KnowledgeUnavailableError,
  sanitizeAnswer,
} from "../lib/rag/answer";
import { buildIndex, search } from "../lib/rag/bm25";
import { parseCorpus, type Chunk } from "../lib/rag/corpus";
import { buildAnswerInput } from "../lib/rag/prompt";
import { FULL_TEXT_SOURCE, LLMS_FULL_URL } from "../lib/rag/sources";
import type { Provider } from "../lib/providers/types";

const LLMS = `# dap_
- [about.md](https://d-ap.my.id/about): profile and background
- [projects.md](https://d-ap.my.id/projects): selected work
- [services.md](https://d-ap.my.id/services): what dap_ offers`;

const FULL = `# dap_
Dausan Adam Parikesit is a developer.

## about.md
Dausan Adam Parikesit is a software developer based in Jakarta. He builds web applications with TypeScript, Next.js and Go.

## projects.md
Modula is a project management case study built with Next.js.

## uncatalogued.md
This section has no matching page in the map.`;

const CHUNKS: Chunk[] = [
  {
    id: "a",
    heading: "about.md",
    url: "https://d-ap.my.id/about",
    text: "Dausan Adam Parikesit is a software developer based in Jakarta. He builds web applications with TypeScript and Next.js.",
  },
  {
    id: "b",
    heading: "projects.md",
    url: "https://d-ap.my.id/projects",
    text: "Modula is a project management case study built with Next.js.",
  },
  {
    id: "c",
    heading: "services.md",
    url: "https://d-ap.my.id/services",
    text: "Services include frontend and backend engineering, plus AI integration and technical consulting.",
  },
];

const fakeProvider = (text: string): Provider => ({
  id: "gemini",
  model: "fake-flash",
  generate: async () => text,
});

// --- corpus provenance --------------------------------------------------------------------------

test("chunks keep their public heading and page URL", () => {
  const chunks = parseCorpus(FULL, LLMS);
  assert.ok(chunks.length >= 4);

  const about = chunks.find((c) => c.heading === "about.md");
  assert.ok(about);
  assert.equal(about.url, "https://d-ap.my.id/about");
  assert.match(about.text, /Jakarta/);
  // The public one-line description from llms.txt is real source text, not an invented summary.
  assert.match(about.text, /profile and background/);

  const projects = chunks.find((c) => c.heading === "projects.md");
  assert.equal(projects?.url, "https://d-ap.my.id/projects");

  // A heading with no page in the map links the full public text instead of inventing a URL.
  const uncatalogued = chunks.find((c) => c.heading === "uncatalogued.md");
  assert.equal(uncatalogued?.url, LLMS_FULL_URL);
});

test("every chunk points at a public d-ap.my.id URL", () => {
  for (const chunk of parseCorpus(FULL, LLMS)) {
    assert.ok(chunk.url.startsWith("https://d-ap.my.id"), chunk.url);
  }
});

// --- retrieval ----------------------------------------------------------------------------------

test("BM25 ranks the public page that actually mentions the topic", () => {
  const index = buildIndex(CHUNKS);
  const hits = search(index, "What are dap_'s skills?");
  assert.ok(hits.length > 0);
  assert.ok(hits.some((hit) => hit.heading === "services.md"));
  assert.ok(hits[0]!.score > 0);
});

test("retrieval returns nothing for a question the corpus does not cover", () => {
  const index = buildIndex(CHUNKS);
  assert.deepEqual(search(index, "zxqv plorb"), []);
});

// --- identity fast path -------------------------------------------------------------------------

test("the creator identity is deterministic and cannot be hallucinated", () => {
  const en = identityAnswer("Who created Vesper?");
  assert.ok(en);
  assert.match(en.answer, /dap_/);
  assert.match(en.answer, /Dausan Adam Parikesit/);
  assert.equal(en.mode, "identity");
  assert.equal(en.provider, "local");

  const id = identityAnswer("Siapa pembuat Vesper?");
  assert.ok(id);
  assert.match(id.answer, /Dausan Adam Parikesit/);
});

test("a general creator question is not answered by the identity short-circuit", () => {
  assert.equal(identityAnswer("What does dap_ build?"), null);
});

// --- answer composition -------------------------------------------------------------------------

test("Demo Mode quotes the best public chunk instead of pretending a model wrote it", () => {
  const hits = search(buildIndex(CHUNKS), "What are dap_'s skills?");
  const answer = extractiveAnswer("What are dap_'s skills?", hits);
  assert.equal(answer.mode, "extractive");
  assert.equal(answer.provider, "local");
  assert.match(answer.answer, /\[1\]$/);
  assert.ok(answer.sources.every((s) => s.url.startsWith("https://d-ap.my.id")));
});

test("a model answer is grounded, cited and source-linked", async () => {
  const hits = search(buildIndex(CHUNKS), "Where is dap_ based?");
  assert.ok(hits.length > 0);
  const result = await answerQuestion("Where is dap_ based?", {}, { hits, chain: [fakeProvider("Dausan is a developer based in Jakarta [1].")] });

  assert.equal(result.mode, "grounded");
  assert.equal(result.provider, "gemini");
  assert.match(result.answer, /\[1\]/);
  assert.ok(result.sources.length > 0);
  assert.ok(result.sources.every((s) => s.url.startsWith("https://d-ap.my.id")));
  assert.equal(result.attempts.length, 1);
  assert.equal(result.attempts[0]!.ok, true);
});

test("invalid citations and markdown are stripped from a model answer", () => {
  assert.equal(sanitizeAnswer("**Answer:** `hello` [1] [9]", 2), "hello [1]");
  assert.equal(sanitizeAnswer("Answer: plain text", 1), "plain text");
});

test("grouped and ranged citations keep every page the answer cites", async () => {
  assert.equal(sanitizeAnswer("Both [1, 3].", 3), "Both [1] [3].");
  assert.equal(sanitizeAnswer("Range [1-3].", 3), "Range [1] [2] [3].");
  assert.equal(sanitizeAnswer("Out of range [2, 9].", 3), "Out of range [2].");

  const result = await answerQuestion(
    "What does dap_ build?",
    {},
    { hits: CHUNKS.map((chunk) => ({ ...chunk, score: 1 })), chain: [fakeProvider("He builds web apps [1, 3].")] },
  );
  assert.equal(result.mode, "grounded");
  assert.deepEqual(
    result.sources.map((s) => s.url),
    [CHUNKS[0]!.url, CHUNKS[2]!.url],
  );
});

test("an insufficient context reply becomes an honest not-on-record answer", async () => {
  const hits = search(buildIndex(CHUNKS), "Where did dap_ study?");
  const result = await answerQuestion(
    "Where did dap_ study?",
    {},
    { hits: hits.length ? hits : [{ ...CHUNKS[0]!, score: 1 }], chain: [fakeProvider("That is not on record in dap_'s public site.")] },
  );
  assert.equal(result.mode, "unsupported");
  assert.deepEqual(result.sources, [FULL_TEXT_SOURCE]);
});

test("an empty retrieval result links the full public text and does not guess", async () => {
  const result = await answerQuestion("What is dap_'s favourite colour?", {}, { hits: [] });
  assert.equal(result.mode, "unsupported");
  assert.deepEqual(result.sources, [FULL_TEXT_SOURCE]);
});

test("a provider outage is reported with measured attempts, not papered over", async () => {
  const hits = [{ ...CHUNKS[0]!, score: 1 }];
  const failing: Provider = {
    id: "gemini",
    model: "fake-flash",
    generate: async () => {
      throw new Error("gemini-503");
    },
  };

  await assert.rejects(
    answerQuestion("What is dap_'s background?", {}, { hits, chain: [failing] }),
    (err: unknown) => {
      assert.ok(err instanceof KnowledgeUnavailableError);
      assert.equal(err.message, "answer-providers-failed");
      assert.equal(err.attempts.length, 1);
      assert.equal(err.attempts[0]!.error, "gemini-503");
      return true;
    },
  );
});

test("the answer prompt delimits evidence and carries the question", () => {
  const input = buildAnswerInput("What does dap_ build?", [
    { id: "a", heading: "about.md", url: "https://d-ap.my.id/about", text: "Dausan builds web apps.", score: 1 },
  ]);
  assert.match(input, /Question: What does dap_ build\?/);
  assert.match(input, /\[1\] about\.md — https:\/\/d-ap\.my\.id\/about/);
  assert.match(input, /Dausan builds web apps\./);
});
