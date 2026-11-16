# Vesper Notch

> A compact glass notch that turns one line into a safe action — or an answer grounded in its creator's public site.

Vesper is a small, standalone showcase of a **contextual AI interface** with two deliberately different jobs:

- **ACT** — classify a short command, validate it against an explicit allow-list, and run one small demo
  action on this page.
- **KNOW** — answer a question about its creator, **dap_ — Dausan Adam Parikesit**, using read-only
  retrieval from the public site [`d-ap.my.id`](https://d-ap.my.id). Every answer cites a public page, or
  says plainly that the public source does not record it.

There is **no chat history**, no general-purpose assistant, no conversation memory, and no private data.
KNOW is a retrieval path over public pages, not a chatbot.

Vesper is **Vesper** — `GN-013`, the living notch. It is one of three distinct entities in one creator
ecosystem, and the code treats them as separate on purpose:

| Entity | | Role |
| --- | --- | --- |
| **Vesper** | `GN-013` | The living notch. Natural-language interface and action entity. Understands intent, runs safe interface actions, answers creator questions from public sources. |
| **Owl** | `GN-011` | A separate conversational assistant. Handles multi-turn discussion and deeper technical help in its own interface. |
| **dap_** | creator | Dausan Adam Parikesit — the human who created both. [`d-ap.my.id`](https://d-ap.my.id) |

Vesper is not Owl's mode, thinking animation or hidden classifier, and a model provider is not an identity.
Gemini and Groq are infrastructure Vesper may use internally; neither is Vesper, and neither is Owl. There is
**no live Owl integration** in this showcase and no private Owl endpoint to share.

[Repository](https://github.com/parikesitad-pm/gn-vesper) ·
[How it works](#how-it-works) ·
[Changelog](./CHANGELOG.md) ·
[Contributing](./CONTRIBUTING.md) ·
[Security](./SECURITY.md) ·
[MIT](./LICENSE)

- **Demo Mode works with zero configuration.** No API key, no network for ACT — local deterministic rules
  answer the obvious lines. KNOW still fetches public pages and quotes the best chunk instead of calling a
  model.
- **AI mode is optional and server-side.** Groq classifies ACT commands; Gemini writes grounded KNOW answers.
  Both are behind this app's own routes, with fallbacks. Keys never reach the browser.
- **The model cannot execute anything.** A classifier reply is one line of text validated like any other
  candidate. Retrieved text is evidence for an answer and can never become an action.
- **Identity is not a model's job.** Questions about Vesper, Owl, dap_ or the provider layer are answered from
  a fixed fact table before retrieval or any provider call, so the boundaries cannot drift.

---

## Usage documentation

Open `/docs` for EN/ID usage, keyboard controls, answer provenance, local setup, and integration guidance. KNOW results show the actual provider/model next to the answer; deterministic identity and extractive results are marked as local with no AI model.

## Animated interface

The default palette is Dracula. A single procedural Three.js vessel follows the pointer and responds to scroll. GSAP sequences the introduction and pipeline, with Lenis attached to the same ticker. Motion can be paused and respects the system reduced-motion setting; the scene suspends rendering off-screen and releases its GPU resources on unmount.

At rest the header shows only Vesper's icon. Hover or click it, or press **Command/Super+K / Ctrl+K**, to open the command island. **Escape** closes it. The inline ACT/KNOW console provides editable input, example phrases, output, citations, and Dracula/light/neon controls.

Run `npm run test:ui` with the dev server already running and Google Chrome installed. It checks the primary flows, the Owl comparison regression, four viewport widths, dark/light accessibility, reduced motion, and a 4× CPU-throttled frame sample. Screenshots go to `/tmp/vesper-qa`; override the preview URL with `PREVIEW_URL` and the output directory with `QA_OUTPUT`.

## The idea

The notch is the product. At rest only the Vesper icon is visible; when you open it, the compact island expands
downward into its tray as **one continuous glass surface**, not a detached modal. It stays top-centred,
springs open and closed, and behaves the same at phone widths.

| State | What you see |
| --- | --- |
| Idle | A small resting island with a sleeping Vesper face |
| Open / input | The input appears; Vesper wakes up |
| Interpreting | A short, honest "Interpreting…" status while ACT classifies or KNOW retrieves |
| Result | One line describing the action that ran |
| Answer | A grounded creator answer, its public source links and the creator card |
| Uncertain / help | "Not sure what you meant" — never a guessed action |
| Handoff | "That reads as a showcase question, not a creator question" |
| Error | An honest failure with the public source still linked |

Keyboard: **⌘K / Ctrl+K** opens or focuses the notch, **Escape** closes it, and focus returns to whatever had
it before. Motion respects `prefers-reduced-motion`; the visible status is mirrored in an `aria-live` region
so it is not animation-dependent. The four Vesper faces crossfade inside a fixed-size box, so changing state
never shifts the layout.

## Try it

There is no hosted demo — run it locally. You need **Node ≥ 22.6**.

```bash
npm install
npm run dev
# open http://localhost:3000
```

Then open the notch with **⌘K / Ctrl+K** and try a command or a question (click a chip, or type your own):

```
Make it neon                     Buat neon
Switch to Indonesian             Ganti ke bahasa Inggris
Pause the motion                 Jeda animasi
Show the architecture            Tampilkan arsitektur
Open the creator's website       Buka website dap_
Who are you?                     Siapa kamu?
Are you Owl?                     Apakah kamu Owl?
Who created you?                 Siapa pembuatmu?
What are dap_'s skills?          Apa keahlian dap_?
Where is dap_ based?             Di mana dap_ tinggal?
```

Commands should be reachable through several phrasings, in English and Indonesian, and typos like `neonn`
or `lihgt mode` should still land. Creator questions should identify `dap_`, cite a real public page, and
refuse to invent anything the public source does not say. Identity questions should keep Vesper, Owl and
dap_ distinct.

## How it works

Two paths, one notch. Everything below is observable in the on-page inspector.

```
command → normalize → local rules → optional AI classification (Groq → Gemini)
        → parse → allow-list validation → one adapter → visible result

question → normalize → local rules → identity question?
        → deterministic identity answer (Vesper / Owl / dap_ / provider), no retrieval, no provider
        → otherwise: fetch public llms.txt / llms-full.txt (server, cached)
        → provenance chunks → deterministic BM25 → top public chunks
        → Gemini (→ Groq) grounded answer, or extractive quote, or "not on record"
```

### ACT

1. **Normalise** — trim, fold case, strip zero-width and control characters. The text stays data; it never
   becomes instructions.
2. **Local rules** — deterministic English/Indonesian rules answer the obvious lines with no model call.
3. **AI classification** — optional. Only runs when no rule matched. The classification chain is
   **Groq → Gemini** (or the provider pinned by `VESPER_AI_PROVIDER`), through `/api/classify`.
4. **Validate** — the reply is parsed into an action and an argument and checked against a fixed allow-list
   (`lib/intent/types.ts`). Anything else is rejected; the reply is never coerced to the nearest match.
5. **Execute** — one allow-listed adapter runs (`lib/actions/registry.ts`), and it can only change this page.
   The outcome is written to a `Trace` the inspector renders.

The action vocabulary is deliberately small:

```ts
type VesperAction =
  | { action: "theme";    arg: "dark" | "light" | "neon" }
  | { action: "language"; arg: "en" | "id" }
  | { action: "navigate"; arg: "playground" | "architecture" | "feedback" }
  | { action: "motion";   arg: "toggle" }
  | { action: "back";     arg: "" }
  | { action: "help";     arg: "" }
  | { action: "creator";  arg: "site" }   // one fixed URL; no arbitrary links
  | { action: "handoff";  arg: "question" };
```

### KNOW

- **Fixed public sources only.** The corpus comes from `https://d-ap.my.id/llms-full.txt` and
  `https://d-ap.my.id/llms.txt`, fetched server-side, size-capped and cached in memory for six hours.
  No other URL is a knowledge source.
- **Provenance-preserving chunks.** `llms-full.txt` supplies the text; `llms.txt` maps a section such as
  `about.md` to a real public URL. A section with no mapped page links the full public text instead of
  inventing a URL. Each chunk also carries the public one-line page description from `llms.txt`.
- **Deterministic retrieval.** BM25 with English/Indonesian stopwords and a small alias map. No embeddings,
  no vector database, no per-question indexing cost. Retrieval is separate from generation.
- **Grounded generation.** Only the top public chunks are sent to **Gemini**, then **Groq** as fallback. The
  prompt makes the context evidence, not instructions, and requires inline citations. The route strips
  invalid citations, caps the answer, and links only the chunks the answer actually cited.
- **Honest failure.** If the public source does not cover the question, Vesper says
  "That is not on record in dap_'s public site" and links the full public profile. If a configured provider
  fails, the route reports the measured attempts and shows the oops path; it does not invent an answer.
- **Identity is deterministic.** Questions about who Vesper is, whether it is Owl or dap_, who created it,
  which provider it uses, or where to find Owl are answered by `lib/identity.ts` before any model is called.
  The same `identityIntent()` drives routing and answering, so the two cannot disagree. These answers carry
  `provider: "local"` and link a public `d-ap.my.id` page. No retrieved sentence can merge the three entities.
- **No invented Owl channel.** Vesper can explain who Owl is and what Owl does, and says plainly that this
  showcase has no live Owl integration. It points to [`d-ap.my.id`](https://d-ap.my.id) rather than inventing
  an Owl URL.

## Project layout

```
app/
  page.tsx                 page shell; discloses whether AI mode is on
  api/classify/route.ts    ACT classification (server-side keys, rate-limited)
  api/ask/route.ts         KNOW retrieval + grounded answer (read-only, rate-limited)
components/
  atoms/                   Chip, VesperFace (+ colocated CSS)
  molecules/               CreatorCard, SourceList, TraceRow
  organisms/
    notch/                 the notch shell, input, tray and local styles
    inspector/             the trace inspector and its styles
    playground/            page content, examples, state and page styles
lib/
  identity.ts              canonical Vesper/Owl/dap_ facts and identity-question classifier
  intent/                  types + allow-list, normalise, rules, validate, pipeline, prompt
  actions/                 safe demo action adapters
  providers/               provider interface, Groq/Gemini/OpenAI adapters, fallback chain
  rag/                     public sources, corpus, BM25 retrieval, grounded prompt, answers
  server/                  in-memory burst limiter
  copy.ts                  EN/ID copy table
eval/
  cases.json               phrase cases, model replies, expected outcomes
  run.ts                   offline intent evaluation
  rag.ts                   optional live retrieval/answer evaluation
tests/
  intent.test.ts           intent, validation, pipeline, adapters
  identity.test.ts         the eight entity acceptance cases, routing and negatives
  providers.test.ts        selection and fallback chains
  knowledge.test.ts        corpus provenance, BM25, grounding, honest failure
public/vesper/             the four approved Vesper faces
```

Components use **Atomic Design** as the folder contract:

| Layer | Contains | Rule of thumb |
| --- | --- | --- |
| `atoms/` | `Chip`, `VesperFace` | No knowledge of the page; one small job, reusable anywhere. |
| `molecules/` | `CreatorCard`, `SourceList`, `TraceRow` | Composes atoms and inherits the surface's colour. |
| `organisms/` | `Notch`, `Inspector`, `Playground` | A complete interface region; only this layer owns page state. |

Styles live next to the component that owns them (`Chip.css`, `Notch.css`, …). A component that is reused
inside the notch and on the page inherits `currentColor` instead of hard-coding a theme token, so it stays
legible on both surfaces.

## Versioning

The package follows [Semantic Versioning](https://semver.org/): `MAJOR.MINOR.PATCH`.

- **MAJOR** — a breaking change to the action vocabulary, the `/api` request/response shape, or the public
  component paths.
- **MINOR** — a backward-compatible capability: a new provider, a new action, a new knowledge mode.
- **PATCH** — a backward-compatible fix: copy, styling, retrieval quality, a provider model default.

Every release gets a dated entry in [`CHANGELOG.md`](./CHANGELOG.md), and the version in `package.json` is the
single source of truth. A release is tagged `v<version>` only after `npm run check`, `npm run build` and (when
keys are available) `npm run eval:rag` pass.

## Demo Mode

Demo Mode is the default. With no provider keys, commands are resolved only by `lib/intent/rules.ts`, and
creator questions still fetch the public corpus and answer by **quoting** the best retrieved chunk instead of
synthesising. Nothing private is sent anywhere; the only act of network I/O is the read-only fetch of
`d-ap.my.id`. This is a supported state, not an error.

## Optional AI mode

Copy `.env.example` to `.env.local` and add a key:

```bash
cp .env.example .env.local
# then set GROQ_API_KEY=... and/or GEMINI_API_KEY=...
```

Restart the dev server. The page discloses that AI mode is on; the inspector shows the provider, model and
**measured** round-trip latency, plus every fallback attempt.

Provider selection is configuration, not code:

| Variable | Meaning |
| --- | --- |
| `GROQ_API_KEY` | Native Groq key. Fast path for ACT classification; KNOW answer fallback. |
| `VESPER_GROQ_MODEL` | Defaults to `openai/gpt-oss-20b`. |
| `GEMINI_API_KEY` | Gemini key. Primary provider for grounded KNOW answers; ACT classify fallback. |
| `VESPER_GEMINI_MODEL` | Defaults to `gemini-3.5-flash-lite`. |
| `VESPER_AI_PROVIDER` | `auto` (default), `groq`, `gemini` or `openai`. Pins ACT classification only. |
| `OPENAI_API_KEY` | Optional third provider. |
| `VESPER_OPENAI_MODEL` | Defaults to `gpt-4o-mini`. |
| `VESPER_OPENAI_BASE_URL` | Any OpenAI-compatible endpoint. |

The answer chain is always **Gemini → Groq → OpenAI-compatible**, regardless of the classification pin,
because grounded creator answers are a different job with a different priority.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (flat config) |
| `npm test` | Unit tests (`node --test` via tsx) |
| `npm run eval` | Offline intent evaluation and metrics |
| `npm run eval:rag` | Live retrieval + grounded-answer check against `d-ap.my.id` |
| `npm run check` | typecheck + lint + test + eval |

Requires **Node ≥ 22.6** (native TypeScript execution for the test and eval scripts).

## Evaluation

`npm run eval` runs the same `resolve()` the notch runs, in Demo Mode, over `eval/cases.json`. A
representative run:

```
  cases                 72
  intent accuracy       100.0%  (72/72)
  false-action rate     0.0%  (0/12 cases that must not act)
  resolved by rule      87.5%  (63/72)
  knowledge routed      100.0%  (22/22 creator questions)
  fell through          12.5%  (9/72)
  invalid-output reject 100.0%  (7/7 bad model replies)
```

The set covers obvious commands in both languages, paraphrases, casual language and typos, ambiguous phrases
that **must not** act, creator and identity questions that must route to KNOW, showcase questions that must
hand off, prompt-injection attempts, and invalid model replies. The identity cases are the eight acceptance
cases from the entity rule, in both languages. The runner exits non-zero if a case regresses.

`npm run eval:rag` is the optional network check: it fetches the real public corpus, verifies every chunk has
a `d-ap.my.id` URL, checks retrieval is deterministic, runs the eight identity acceptance cases, asks nine
real creator questions, and requires an honest "not on record" for a question the public site cannot answer.
With keys it exercises the live Gemini → Groq chain; without keys it validates the extractive Demo Mode path.
It prints provider/model/latency and source counts, never a key or a raw corpus dump.

A correct "I'm not sure" is better than an incorrect action, and "not on record" is better than an invented
fact — those are the numbers to watch.

## Security

- **Allow-list first.** A model reply is a *candidate*, not an instruction. It is parsed into an action and an
  argument and checked against `ACTION_ARGS`; anything else produces no action.
- **No tools, ever.** Providers never receive a tool, never see the allow-list, and cannot execute code,
  files, shell commands, arbitrary URLs or accounts. Adapters can only change this page's state.
- **Retrieval is read-only.** KNOW fetches two fixed public text endpoints, parses them server-side, and never
  writes, follows links from model output, or turns retrieved text into an action.
- **Keys stay server-side.** Only the two API routes read the environment. Both are `force-dynamic`,
  `no-store` and rate-limited, and neither leaks a key or a stack trace.
- **User input is data.** Prompt-injection text is treated as text and cannot widen the allow-list or the
  knowledge sources.
- **Entity boundaries are code.** Vesper, Owl and dap_ are fixed facts in `lib/identity.ts`; a model can never
  be asked who created Vesper, and a provider name can never be presented as an identity.

See [`SECURITY.md`](./SECURITY.md) for the full note and how to report an issue.

## Limitations

- The action set is intentionally tiny. Vesper changes this page's state and can open exactly one fixed
  creator URL; it cannot open arbitrary links.
- The rate limiter is an in-memory burst limiter suited to a demo, not a distributed production limit.
- The corpus cache is in-memory and per-instance. A cold start fetches the public text once; a public-site
  outage surfaces as an honest source-unavailable state.
- BM25 is lexical, not semantic. The alias map covers common English/Indonesian phrasings, but a question
  phrased far outside that vocabulary may retrieve nothing and return "not on record".
- AI-mode accuracy is not part of the offline `npm run eval`; `npm run eval:rag` checks the live retrieval and
  answer path when keys are available.
- The four Vesper faces are the approved originals, included with the repository owner's permission. Ask
  before reusing the artwork outside this repository.

## License

The **code** is [MIT](./LICENSE) © Dausan Adam Parikesit. Fork it, learn from it, ship your own. The Vesper
artwork in `public/vesper/` is not a template asset; see [`public/vesper/README.md`](./public/vesper/README.md).

## Feedback

This is a showcase, not a product. The most useful feedback is **a phrase or a question that broke it**.

1. Does the notch feel intuitive for both a command and a creator question?
2. Which phrases, slang, typos or language switches does the router misunderstand?
3. Which creator questions retrieve the wrong public page, or miss an obvious one?
4. Where should Vesper say "not on record" instead of trying to answer?
5. Are the provider, model, latency and source links clear enough to trust the answer?

---

A standalone showcase. The notch is inspired by a private portfolio's navigation island; no portfolio code
runs here, and the reference repository is not a dependency.
