# Contributing to Vesper Notch

Thanks for wanting to help. This is a small showcase, so the best contributions are small and sharp: a phrase
that breaks the router, a creator question that retrieves the wrong public page, a clearer status line, or a
test that pins down a case nobody thought of.

Before anything else, please read [`SECURITY.md`](./SECURITY.md). The whole design rests on one rule:
**model output can never execute anything that is not on the allow-list, and retrieved text can never become
an action.**

## Getting set up

```bash
npm install
npm run dev      # http://localhost:3000
npm run check    # typecheck + lint + test + eval — run this before opening a PR
```

Node ≥ 22.6 is required. You do **not** need an API key to develop: Demo Mode is the default and the reference
path for tests and the offline eval. `npm run eval:rag` is optional and does need the public network; it uses
live keys only if they are present.

## The two paths

| Path | What it does | Where it lives |
| --- | --- | --- |
| **ACT** | normalise → rules → optional classifier → allow-list → one adapter | `lib/intent/`, `lib/actions/` |
| **KNOW** | normalise → rules → fixed public corpus → BM25 → grounded answer | `lib/rag/`, `app/api/ask/` |

Keep them separate. A command must never reach retrieval; retrieved text must never reach `execute()`.

## The one rule that keeps ACT safe

A line of natural language becomes exactly one value from a fixed union. That union, and the exact arguments
each action accepts, live in **one place**:

```
lib/intent/types.ts       →  VesperAction + ACTION_ARGS (the allow-list)
lib/actions/registry.ts   →  one adapter per action
```

If a change would let a model, a rule, or a user reach code, a file, an arbitrary URL, or an account, it does
not belong in this project. Adapters may only change the state of this page, plus the one fixed creator URL.

## How to add a phrase (the most useful contribution)

Most feedback is "Vesper didn't understand X". Here is how to fix that safely:

1. Add the case to `eval/cases.json` first, with the action you expect — `"expect": "knowledge"` for a creator
   question, or `"expect": null` if the line must **not** trigger anything.
2. Run `npm run eval` and watch it fail. Good: that is the bug, written down.
3. Teach `lib/intent/rules.ts` the phrase. Prefer a small, explicit pattern over a broad one. Rules run on the
   *normalised* line and must return a concrete action, a read-only `knowledge` request, or `ambiguous` —
   never a guess.
4. Re-run `npm run eval` and `npm test`. Add a unit test in `tests/intent.test.ts` if the case is subtle
   (mixed language, typo, near-miss, injection).
5. If the phrase is genuinely ambiguous ("change the theme" without saying to what), make it `ambiguous`.
   Vesper should ask, not assume.

Keep English and Indonesian roughly in step. A phrase that works in one language and not the other is a bug
worth fixing in the same change.

## How to improve a creator answer

1. Add the question to the `CHECKS` list in `eval/rag.ts` only if it asserts a fact that is genuinely in the
   public source. Run `npm run eval:rag`.
2. If retrieval misses, improve the alias/stopword map in `lib/rag/bm25.ts`. Do not add embeddings or a vector
   database: the corpus is small and deterministic lexical retrieval is a feature.
3. If the wrong page is retrieved, fix the heading → URL mapping or the page description handling in
   `lib/rag/corpus.ts`. Never fabricate a URL; fall back to `llms-full.txt`.
4. If the answer is ungrounded, tighten the prompt in `lib/rag/prompt.ts`. The model must answer only from the
   numbered context, cite it, and say "not on record" when the context is insufficient.
5. Add a unit test in `tests/knowledge.test.ts` that injects chunks and a fake provider; never make a test
   depend on the live site.

Do not add a source outside `lib/rag/sources.ts`. The public site is the only knowledge origin.

## How to add an action

Widening what Vesper can do is a deliberate decision, so keep it small and justified.

1. **Widen the allow-list** in `lib/intent/types.ts`: add the variant to `VesperAction` and the exact allowed
   arguments to `ACTION_ARGS`. This is the contract.
2. **Add an adapter** in `lib/actions/registry.ts`. It must return an `Execution` with a `key` the UI can
   localise. Do not build prose inside the adapter.
3. **Add copy** for both languages in `lib/copy.ts` (a missing translation should be a type error).
4. **Wire the state** in `components/organisms/playground/Playground.tsx` if the action needs new page state.
5. **Add eval cases and tests**: at least one obvious phrasing per language, one paraphrase, and one ambiguous
   input that must **not** trigger it.
6. **Document it** in `README.md` (the action snippet and the vocabulary section).

If an action needs confirmation, a non-fixed network call, or anything outside this page, stop and open an
issue first — it likely belongs in a different project.

## How to change the notch UI

The notch is the product, so visual changes are welcome but held to the interaction language in the README:
one continuous glass surface, compact by default, top-centred, spring-like expansion, keyboard support,
reduced-motion support, accessible controls.

- Components follow Atomic Design. Put the smallest reusable pieces in `components/atoms/`, compositions of those
  pieces in `components/molecules/`, and complete interface regions in `components/organisms/`. The notch itself
  is `components/organisms/notch/` and its styles are local (`Notch.css`), using local design tokens — do
  **not** import any external or portfolio stylesheet.
- Keep a component's styles next to it and let it inherit colour from its surface (`currentColor`) so the same
  atom or molecule works in the notch and on the themed page. Do not reach across into another layer's CSS.
- Keep it responsive at phone widths; reflow text and controls rather than overflowing. The notch scrolls
  vertically when its tray is taller than the viewport.
- Test the keyboard path (`⌘K`/`Ctrl+K`, `Escape`, focus restore), the reduced-motion path, and the knowledge
  tray at a narrow width.
- Keep the faces decorative: the `aria-live` status, not the artwork, must convey state.

## How to change the providers

- Providers live behind one interface: `lib/providers/types.ts`. A provider's only job is
  `system + one text block in → one text block out`. It never receives a tool and never sees the allow-list.
- Add or swap a provider by adding an adapter and wiring it in `lib/providers/index.ts`. Provider choice
  should stay configurable via environment variables, and every attempt must be recorded.
- The classification order is Groq → Gemini (respecting an explicit pin). The answer order is always
  Gemini → Groq → OpenAI-compatible. Do not merge the two priorities.
- The server routes are the only places a key may be read. Never expose a key to the browser, and never log a
  key or a stack trace.
- Update the prompts carefully: the classifier must ask for **one line** in the exact `action arg` shape; the
  answer prompt must require grounding, citations and an honest refusal.

## Tests, eval, and style

- `npm test` — unit tests for intent, providers and knowledge.
- `npm run eval` — offline phrase evaluation; it exits non-zero on regression, so treat a red eval as a broken
  build.
- `npm run eval:rag` — optional live retrieval/answer check against `d-ap.my.id`.
- `npm run check` — typecheck + lint + test + eval. Please run it before opening a pull request.
- Match the surrounding style: TypeScript strict mode, small focused modules, comments that explain *why*
  rather than restating the code, **no new dependencies** without a very good reason.

## Releasing

This project follows Semantic Versioning; see [`CHANGELOG.md`](./CHANGELOG.md) for the format and
[`README.md`](./README.md#versioning) for the policy.

1. Decide the bump: **MAJOR** for a breaking action/API/component-path change, **MINOR** for a new capability,
   **PATCH** for a compatible fix.
2. Update `version` in `package.json` and `package-lock.json`, and move the `[Unreleased]` entries into a dated
   section in `CHANGELOG.md`.
3. Run `npm run check` and `npm run build`; run `npm run eval:rag` when keys are available.
4. Commit the release, tag it `v<version>` and push the commit and tag together.

```bash
npm version 0.2.0 --no-git-tag-version   # writes package.json + package-lock.json
git add package.json package-lock.json CHANGELOG.md
git commit -m "chore(release): v0.2.0"
git tag -a v0.2.0 -m "v0.2.0"
```

Do not tag a tree that has not passed the checks above.

## Scope

This showcase deliberately does **not** include: a chat UI, chat history or conversation memory, a
general-purpose assistant, write access to any external service, arbitrary URLs or JavaScript, unrestricted
tool calling, or anything that depends on private infrastructure. KNOW is a read-only retrieval path over two
fixed public endpoints and one fixed corpus, not a general RAG platform.

## Reporting a phrase or question that broke it

The most valuable issue is a phrase or a question. Include: the exact input, the language, what you expected,
and what actually happened. That is often enough to turn into an eval case and a fix.

## License

The code is released under the [MIT License](./LICENSE). By contributing, you agree that your contribution is
licensed under the same terms. The Vesper artwork in `public/vesper/` is separate; ask before reusing it.
