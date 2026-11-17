/**
 * Live creator-knowledge evaluation. `npm run eval:rag`.
 *
 * This is the optional network check that the offline `npm run eval` deliberately is not:
 *   1. fetch the real public corpus from https://d-ap.my.id/llms-full.txt and /llms.txt;
 *   2. verify every chunk keeps a public d-ap.my.id URL;
 *   3. check that retrieval is deterministic;
 *   4. ask real creator questions through the same `answerQuestion()` the route uses;
 *   5. require an honest "not on record" for a question the public site cannot answer.
 *
 * With provider keys it exercises the live Gemini → Groq answer chain. Without keys it runs the extractive
 * Demo Mode path and still validates retrieval. It exits non-zero if any check fails, so it can gate a release.
 * It never prints a key or a raw corpus dump.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { OWL, VESPER } from "../lib/identity";
import { answerChain } from "../lib/providers";
import { answerQuestion, identityAnswer, KnowledgeUnavailableError } from "../lib/rag/answer";
import { buildIndex, search } from "../lib/rag/bm25";
import { getCorpus } from "../lib/rag/corpus";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

/** A tiny, dependency-free `.env.local` reader. It skips malformed lines instead of failing the whole run. */
function loadEnvFile(name: string) {
  const path = join(root, name);
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const assignment = trimmed.replace(/^export\s+/, "");
    const separator = assignment.indexOf("=");
    if (separator < 0) continue;
    const key = assignment.slice(0, separator).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    let value = assignment.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadEnvFile(".env.local");
loadEnvFile(".env");

type Check = {
  name: string;
  question: string;
  /** A fact that must appear in a successful answer. Absent for the honest-failure case. */
  expect?: RegExp;
  /** Force the expected mode, used for the unprovable question. */
  mode?: "unsupported";
};

const CHECKS: Check[] = [
  { name: "build", question: "What does dap_ build?", expect: /\b(web|app|dashboard|landing|stream|llm|ai)\b/i },
  { name: "skills", question: "What are dap_'s skills?", expect: /(react|typescript|rails|laravel|next|frontend|backend)/i },
  { name: "location", question: "Where is dap_ based?", expect: /jakarta/i },
  { name: "location-id", question: "Di mana dap_ tinggal?", expect: /jakarta/i },
  { name: "contact", question: "How can I contact dap_?", expect: /(whatsapp|halo@d-ap\.my\.id|email)/i },
  { name: "projects", question: "Show me dap_'s projects", expect: /(forge|modula|autofailover|stack|luca|afrizal|queice|point)/i },
  { name: "education", question: "What degree does dap_ have?", expect: /(computer science|borobudur|bachelor|b\.?sc)/i },
  { name: "skills-id", question: "Apa keahlian dap_?", expect: /(react|typescript|rails|laravel|next|frontend|backend)/i },
  { name: "unprovable", question: "What is dap_'s favourite pizza topping?", mode: "unsupported" },
];

/** The eight permanent identity acceptance cases. Deterministic: no corpus and no provider are needed. */
const IDENTITY_CHECKS: { name: string; question: string; include: RegExp[]; exclude?: RegExp[] }[] = [
  { name: "self", question: "Who are you?", include: [new RegExp(VESPER.name), new RegExp(VESPER.id)] },
  { name: "not-owl", question: "Are you Owl?", include: [new RegExp(VESPER.id), new RegExp(OWL.id), /separate/] },
  { name: "owl", question: "Who is Owl?", include: [new RegExp(OWL.name), new RegExp(OWL.id), /separate/, /no live Owl integration/] },
  { name: "creator", question: "Who created you?", include: [/dap_/, /Dausan Adam Parikesit/, /d-ap\.my\.id/] },
  { name: "not-dap", question: "Are you dap_?", include: [/human creator/, new RegExp(VESPER.name)], exclude: [/^Yes/] },
  { name: "provider", question: "Which AI provider are you?", include: [/Gemini/, /Groq/, /not my identity/] },
  { name: "not-replace", question: "Can you replace Owl?", include: [/separate roles/, new RegExp(OWL.name), new RegExp(VESPER.name)] },
  { name: "meet-owl", question: "Where can I meet Owl?", include: [/no live Owl integration/, /d-ap\.my\.id/] },
];

const excerpt = (text: string, max = 190) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

async function main() {
  const failures: string[] = [];
  const corpus = await getCorpus();
  const index = buildIndex(corpus.chunks);
  const chain = answerChain(process.env);

  console.log("Vesper Notch — live creator knowledge evaluation\n");
  console.log("Corpus");
  console.log(`  endpoints        ${corpus.endpoints.join("  ")}`);
  console.log(`  chunks           ${corpus.chunks.length}`);
  console.log(`  pages            ${new Set(corpus.chunks.map((chunk) => chunk.heading)).size}`);
  console.log(`  sample           ${corpus.chunks[0]?.heading} → ${corpus.chunks[0]?.url}`);
  console.log(`  ai answer chain  ${chain.length > 0 ? chain.map((p) => `${p.id}/${p.model}`).join(" → ") : "Demo Mode (extractive)"}`);

  if (corpus.chunks.length < 10) failures.push(`corpus too small (${corpus.chunks.length} chunks)`);
  for (const chunk of corpus.chunks) {
    if (!chunk.url.startsWith("https://d-ap.my.id")) failures.push(`non-public chunk URL: ${chunk.url}`);
    if (!chunk.text.trim()) failures.push(`empty chunk: ${chunk.id}`);
  }

  console.log("\nIdentity (deterministic)");
  for (const check of IDENTITY_CHECKS) {
    const result = identityAnswer(check.question);
    const missing = check.include.filter((re) => !result || !re.test(result.answer));
    const forbidden = (check.exclude ?? []).filter((re) => result && re.test(result.answer));
    const ok = !!result && result.mode === "identity" && missing.length === 0 && forbidden.length === 0;
    if (!ok) failures.push(`${check.name}: identity answer failed${missing.length ? ` (missing ${missing.join(", ")})` : ""}`);
    for (const source of result?.sources ?? []) {
      if (!source.url.startsWith("https://d-ap.my.id")) failures.push(`${check.name}: non-public identity source ${source.url}`);
    }
    console.log(`  ${ok ? "✓" : "✗"} ${check.name.padEnd(13)} ${result?.mode ?? "missing"}`);
    console.log(`      ${excerpt(result?.answer ?? "missing")}`);
  }

  console.log("\nAnswers");
  for (const check of CHECKS) {
    const first = search(index, check.question, 4).map((hit) => hit.id).join(",");
    const second = search(index, check.question, 4).map((hit) => hit.id).join(",");
    if (first !== second) failures.push(`${check.name}: retrieval is not deterministic`);

    try {
      const result = await answerQuestion(check.question, process.env, { corpus, index });
      const mark = check.mode ? result.mode === check.mode : result.mode !== "unsupported" && (!check.expect || check.expect.test(result.answer));
      if (!mark) failures.push(`${check.name}: mode=${result.mode} answer did not meet the expectation`);
      if (!result.answer.trim()) failures.push(`${check.name}: empty answer`);
      if (result.sources.length === 0) failures.push(`${check.name}: no sources`);
      for (const source of result.sources) {
        if (!source.url.startsWith("https://d-ap.my.id")) failures.push(`${check.name}: non-public source ${source.url}`);
      }
      if (result.mode === "grounded" && result.attempts.length > 0 && !result.attempts.some((attempt) => attempt.ok)) {
        failures.push(`${check.name}: grounded answer with no successful provider attempt`);
      }

      const provider = result.provider === "local" ? `${result.mode} (local)` : `${result.provider}/${result.model}`;
      console.log(`  ${mark ? "✓" : "✗"} ${check.name.padEnd(13)} ${result.mode.padEnd(11)} ${provider.padEnd(34)} ${String(result.latencyMs).padStart(5)} ms  ${result.sources.length} src`);
      console.log(`      ${excerpt(result.answer)}`);
    } catch (err) {
      const attempts = err instanceof KnowledgeUnavailableError ? err.attempts : [];
      failures.push(`${check.name}: ${err instanceof Error ? err.message : "answer failed"} (${attempts.map((a) => `${a.provider}:${a.error ?? "ok"}`).join(", ") || "no attempts"})`);
      console.log(`  ✗ ${check.name.padEnd(13)} failed`);
    }
  }

  console.log("");
  if (failures.length > 0) {
    console.log("Failures:");
    for (const failure of failures) console.log(`  - ${failure}`);
    process.exit(1);
  }
  console.log(`All live checks pass (${CHECKS.length} questions, ${corpus.chunks.length} public chunks).`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
