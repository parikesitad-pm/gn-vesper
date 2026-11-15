/**
 * Evaluation runner. `npm run eval`.
 *
 * It runs the same `resolve()` the notch runs, in Demo Mode, over the cases in `cases.json`, and reports the
 * numbers the handover asks for: intent accuracy, false-action rate (an action taken where none was expected),
 * rule coverage, and the invalid-output rejection rate. It exits non-zero if a case regresses, so it can gate a
 * change.
 *
 * AI mode is deliberately not exercised here: it needs a key and a network, and the point of this set is the
 * deterministic path. A provider's own accuracy would be measured against the same cases with a real key.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolve } from "../lib/intent/pipeline";
import { readIntent } from "../lib/intent/validate";

type Case = { input: string; expect: string | null; class: string };
type Reply = { reply: string; expect: "ok" | "reject"; class: string };
type Data = { cases: Case[]; modelReplies: Reply[] };

const here = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(here, "cases.json"), "utf8")) as Data;

const pct = (n: number, d: number) => (d === 0 ? "n/a" : `${((n / d) * 100).toFixed(1)}%`);
const render = (i: { action: string; arg: string } | null) => (i ? `${i.action}${i.arg ? ` ${i.arg}` : ""}` : null);

let correct = 0;
let falseActions = 0;
let noActionCases = 0;
let rulePath = 0;
let fallbackPath = 0;
const failures: string[] = [];

for (const c of data.cases) {
  const { intent, trace } = await resolve(c.input, { aiAvailable: false });
  const actual = render(intent);
  if (trace.path === "rule") rulePath++;
  if (trace.path === "fallback") fallbackPath++;
  if (c.expect === null) noActionCases++;

  if (actual === c.expect) {
    correct++;
  } else {
    failures.push(`  [${c.class}] "${c.input}" → ${actual ?? "no action"} (expected ${c.expect ?? "no action"})`);
  }
  if (c.expect === null && actual !== null) falseActions++;
}

let rejected = 0;
let rejectCases = 0;
const replyFailures: string[] = [];
for (const r of data.modelReplies) {
  const v = readIntent(r.reply);
  if (r.expect === "reject") rejectCases++;
  const ok = r.expect === "ok" ? v.ok : !v.ok;
  if (ok) {
    if (r.expect === "reject") rejected++;
  } else {
    replyFailures.push(`  [${r.class}] ${JSON.stringify(r.reply)} → ${v.ok ? "accepted" : "rejected"} (expected ${r.expect})`);
  }
}

const total = data.cases.length;
console.log("Vesper Notch — intent evaluation (Demo Mode, local rules)\n");
console.log(`  cases                 ${total}`);
console.log(`  intent accuracy       ${pct(correct, total)}  (${correct}/${total})`);
console.log(`  false-action rate     ${pct(falseActions, noActionCases)}  (${falseActions}/${noActionCases} cases that must not act)`);
console.log(`  resolved by rule      ${pct(rulePath, total)}  (${rulePath}/${total})`);
console.log(`  fell through          ${pct(fallbackPath, total)}  (${fallbackPath}/${total})`);
console.log(`  invalid-output reject ${pct(rejected, rejectCases)}  (${rejected}/${rejectCases} bad model replies)`);
console.log(`  provider latency      n/a in Demo Mode (no classifier call)`);

if (failures.length || replyFailures.length) {
  console.log("\nFailures:");
  for (const f of [...failures, ...replyFailures]) console.log(f);
  process.exit(1);
}
console.log("\nAll cases pass.");
