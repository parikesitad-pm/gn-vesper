# Vesper Notch

> Vesper turns a line of natural language into a safe, structured action — right from the notch.

A small, standalone showcase of **Vesper**, a natural-language command interface that lives
inside a compact glass notch. Type a short instruction, and Vesper classifies the intent,
validates it against an explicit allow-list, and runs one small demo action on the page.

It is **not** a chatbot and **not** a portfolio. There is no chat history, no RAG, no document
retrieval, and no general-purpose assistant. Vesper understands a *command*, not a conversation.

- **Demo Mode works with zero configuration.** No API key, no network — local deterministic rules
  answer the obvious lines.
- **AI mode is optional and server-side.** If you add a key, unrecognised lines may be sent to a
  classifier through this app's own route. The key never reaches the browser.
- **The model cannot execute anything.** Its reply is one line of text that is validated like any
  other candidate. Anything outside the allow-list is rejected.

---

## The idea

The notch is the product. At rest it is quiet and unobtrusive; when you open it, the compact
island expands downward into its tray as **one continuous glass surface**, not a detached modal.
It stays top-centred, springs open and closed, and behaves the same at phone widths.

The interaction language:

| State | What you see |
| --- | --- |
| Idle | A small resting island with a sleeping Vesper face |
| Open / input | The input appears; Vesper wakes up |
| Interpreting | A short, honest "Interpreting…" status |
| Result | One line describing the action that ran |
| Uncertain / help | "Not sure what you meant" — never a guessed action |
| Handoff | "That reads as a question, not a command" |
| Error | "Vesper could not reach a classifier. Local rules still work." |

Keyboard: **⌘K / Ctrl+K** opens or focuses the notch, **Escape** closes it, and focus returns to
whatever had it before. Motion respects `prefers-reduced-motion`, and the status is announced
through an `aria-live` region so it is not animation-dependent.

## Try it

```bash
npm install
npm run dev
# open http://localhost:3000
```

Then open the notch and try one of these (click a chip on the page, or type your own):

```
Make it neon              Buat neon
Switch to Indonesian      Ganti ke bahasa Inggris
Pause the motion          Jeda animasi
Show the architecture     Tampilkan arsitektur
Go back                   Kembali
Help                      Bantuan
```

The same action should be reachable through several phrasings, in English and Indonesian, and
typos like `neonn` or `lihgt mode` should still land.

## How it works

One line, one path, no hidden steps. Everything below is observable in the on-page inspector.

```
input → normalize → local rules → optional AI classification
      → schema validation → allow-listed demo action → visible result
```

1. **Normalise** — trim, fold case, strip zero-width noise. The text stays data; it never becomes
   instructions.
2. **Local rules** — deterministic English/Indonesian rules answer the obvious lines with no model
   call. This is Demo Mode.
3. **AI classification** — optional. Only runs when no rule matched, and only through this app's
   own `/api/classify` route. The model returns one line.
4. **Validate** — the reply is parsed into an action and an argument and checked against a fixed
   allow-list (`lib/intent/types.ts`). Anything else is rejected.
5. **Execute** — one allow-listed adapter runs (`lib/actions/registry.ts`), and it can only touch
   this page. The result is written to a `Trace` the inspector renders.

The action vocabulary is deliberately small:

```ts
type VesperAction =
  | { action: "theme";    arg: "dark" | "light" | "neon" }
  | { action: "language"; arg: "en" | "id" }
  | { action: "navigate"; arg: "playground" | "architecture" | "feedback" }
  | { action: "motion";   arg: "toggle" }
  | { action: "back";     arg: "" }
  | { action: "help";     arg: "" }
  | { action: "handoff";  arg: "question" };
```

## Project layout

```
app/
  page.tsx                 page shell; discloses whether AI mode is on
  api/classify/route.ts    the only server route (server-side key, rate-limited)
components/
  notch/                   notch shell, input, status, Vesper face
  playground/              page content, example chips, intent inspector
lib/
  intent/                  types + allow-list, normalise, rules, validate, pipeline, prompt
  actions/                 safe demo action adapters
  providers/               optional model provider interface + Gemini/OpenAI adapters
  copy.ts                  EN/ID copy table
eval/
  cases.json               phrase cases, model replies, expected outcomes
  run.ts                   evaluation runner
tests/
  intent.test.ts           unit tests for the intent layer
```

The UI, classifier, validator, and action adapters are separate on purpose so contributors can
understand and extend each in isolation.

## Demo Mode

Demo Mode is the default. With no environment variables, `lib/providers` returns `null`, the page
discloses "Demo Mode: local rules only", and every command is resolved by
`lib/intent/rules.ts`. Nothing is sent anywhere. This is a supported state, not an error.

## Optional AI mode

Copy `.env.example` to `.env.local` and add a key:

```bash
cp .env.example .env.local
# then set GEMINI_API_KEY=... (or OPENAI_API_KEY=...)
```

Restart the dev server. The page will now disclose that AI mode is on, and unrecognised lines fall
through to the server-side classifier. The inspector shows which provider and model answered, plus
the **measured** round-trip latency. If the provider fails, times out, is rate-limited, or returns
something the allow-list rejects, Vesper says so honestly instead of guessing.

Provider selection is configuration, not code:

- `VESPER_AI_PROVIDER=gemini|openai` pins one provider.
- With it unset, Gemini is preferred, then any OpenAI-compatible key.
- `VESPER_OPENAI_BASE_URL` lets the OpenAI adapter talk to any compatible endpoint.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (flat config) |
| `npm test` | Unit tests (`node --test` via tsx) |
| `npm run eval` | Run the intent evaluation set and print metrics |
| `npm run check` | typecheck + lint + test + eval |

Requires **Node ≥ 22.6** (native TypeScript execution for the test and eval scripts).

## Evaluation

`npm run eval` runs the same `resolve()` the notch runs, in Demo Mode, over `eval/cases.json`, and
reports the numbers that matter. A representative run:

```
  cases                 50
  intent accuracy       100.0%  (50/50)
  false-action rate     0.0%  (0/12 cases that must not act)
  resolved by rule      82.0%  (41/50)
  fell through          18.0%  (9/50)
  invalid-output reject 100.0%  (6/6 bad model replies)
  provider latency      n/a in Demo Mode (no classifier call)
```

The set covers obvious commands in both languages, paraphrases, casual language and typos,
ambiguous phrases that **must not** act, questions that must hand off, prompt-injection attempts,
and invalid model replies (bad arguments, unknown actions, multiple actions, empty output). The
runner exits non-zero if a case regresses, so it can gate a change.

A correct "I'm not sure" is better than an incorrect action — the false-action rate is the number
to watch.

## Security

- **Allow-list first.** A model reply is a *candidate*, not an instruction. It is parsed into an
  action and an argument and checked against `ACTION_ARGS`; anything else produces no action.
- **No tools, ever.** Providers never receive a tool, never see the allow-list, and cannot execute
  code, files, shell commands, URLs, or accounts. Adapters can only change this page's state.
- **Keys stay server-side.** Only `/api/classify` reads the environment. The route is
  `force-dynamic`, `no-store`, and rate-limited, and it never leaks a key or a stack trace.
- **User input is data.** Prompt-injection text is treated as text and cannot widen the allow-list.

See [`SECURITY.md`](./SECURITY.md) for the full note and how to report an issue.

## Limitations

- The action set is intentionally tiny. Vesper changes this page's theme, language, motion and
  scroll position — nothing more.
- The rate limiter is an in-memory burst limiter suited to a demo, not a distributed production
  limit.
- AI-mode accuracy is not part of `npm run eval`; that set exercises the deterministic path. A
  provider's own accuracy would be measured against the same cases with a real key.
- The Vesper faces are **placeholders** (see `public/vesper/README.md`); the original pixel assets
  are not redistributed here.

## License

[MIT](./LICENSE) © Dausan Adam Parikesit. Fork it, learn from it, ship your own.

## Feedback

This is a showcase, not a product. The most useful feedback is **a phrase that broke it**.

Open an issue (see `.github/ISSUE_TEMPLATE/`) with a new phrase, a bug, or a UX idea — or use the
questions in the Feedback section of the running page:

1. Does the notch feel intuitive, or do you need a visible hint to discover it?
2. Which phrases, slang, typos or language switches does the intent router misunderstand?
3. Which action types would make a notch useful beyond themes and navigation?
4. Where should confirmation be required before an action runs?
5. Is the intent inspector clear enough to debug and contribute?

---

A standalone showcase. The notch is inspired by a private portfolio's navigation island; no
portfolio code runs here, and the reference repository is not a dependency.
