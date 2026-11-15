# Contributing to Vesper Notch

Thanks for wanting to help. This is a small showcase, so the best contributions are small and
sharp: a phrase that breaks the router, a clearer status line, a new safe demo action, or a test
that pins down a case nobody thought of.

Before anything else, please read [`SECURITY.md`](./SECURITY.md). The whole design rests on one
rule: **model output can never execute anything that is not on the allow-list.**

## Getting set up

```bash
npm install
npm run dev      # http://localhost:3000
npm run check    # typecheck + lint + test + eval — run this before opening a PR
```

Node ≥ 22.6 is required. You do **not** need an API key to develop: Demo Mode (local rules only) is
the default and the reference path for tests and evaluation.

## The one rule that keeps this safe

A line of natural language becomes exactly one value from a fixed union. That union, and the exact
arguments each action accepts, live in **one place**:

```
lib/intent/types.ts   →  VesperAction + ACTION_ARGS (the allow-list)
lib/actions/registry.ts  →  one adapter per action
```

If a change would let a model, a rule, or a user reach code, a file, a URL, or an account, it does
not belong in this project. Adapters may only change the state of this page.

## How to add a phrase (the most useful contribution)

Most feedback is "Vesper didn't understand X". Here is how to fix that safely:

1. Add the case to `eval/cases.json` first, with the action you expect — or `"expect": null` if the
   line must **not** trigger anything.
2. Run `npm run eval` and watch it fail. Good: that is the bug, written down.
3. Teach `lib/intent/rules.ts` the phrase. Prefer a small, explicit pattern over a broad one.
   Rules run on the *normalised* line and must return either a concrete action or an `ambiguous`
   result — never a guess.
4. Re-run `npm run eval` and `npm test`. Add a unit test in `tests/intent.test.ts` if the case is
   subtle (mixed language, typo, near-miss).
5. If the phrase is genuinely ambiguous ("change the theme" without saying to what), make it
   `ambiguous`. Vesper should ask, not assume.

Keep English and Indonesian roughly in step. A phrase that works in one language and not the other
is a bug worth fixing in the same change.

## How to add an action

Widening what Vesper can do is a deliberate decision, so keep it small and justified.

1. **Widen the allow-list** in `lib/intent/types.ts`: add the variant to `VesperAction` and the
   exact allowed arguments to `ACTION_ARGS`. This is the contract.
2. **Add an adapter** in `lib/actions/registry.ts`. It must touch only this page's state and return
   an `Execution` with a `key` the UI can localise. Do not build prose inside the adapter.
3. **Add copy** for both languages in `lib/copy.ts` (a missing translation should be a type error).
4. **Wire the state** in `components/playground/Playground.tsx` if the action needs new page state.
5. **Add eval cases and tests**: at least one obvious phrasing per language, one paraphrase, and one
   ambiguous input that must **not** trigger it.
6. **Document it** in `README.md` (the action table and the vocabulary snippet).

If an action needs confirmation, a network call, or anything outside this page, stop and open an
issue first — it likely belongs in a different project.

## How to change the notch UI

The notch is the product, so visual changes are welcome but held to the interaction language in the
README: one continuous glass surface, compact by default, top-centred, spring-like expansion,
keyboard support, reduced-motion support, accessible controls.

- Component code lives in `components/notch/`. Styles are local (`Notch.css`) and use local design
  tokens — do **not** import any external or portfolio stylesheet.
- Keep it responsive at phone widths; reflow text and controls rather than overflowing.
- Test the keyboard path (`⌘K`/`Ctrl+K`, `Escape`, focus restore) and the reduced-motion path.

## How to change the AI classifier

- Providers live behind one interface: `lib/providers/types.ts`. A provider's only job is
  `system + one line in → one line out`. It never receives a tool and never sees the allow-list.
- Add or swap a provider by adding an adapter and wiring it in `lib/providers/index.ts`. Provider
  choice should stay configurable via environment variables.
- The server route is the only place a key may be read. Never expose a key to the browser, and never
  log a key or a stack trace.
- Update the system prompt in `lib/intent/prompt.ts` carefully: it must ask for **one line** in the
  exact `action arg` shape and must not invite free-form answers.

## Tests, eval, and style

- `npm test` — unit tests for the intent layer.
- `npm run eval` — the phrase evaluation set; it exits non-zero on regression, so treat a red eval
  as a broken build.
- `npm run check` — everything, in order. Please run it before opening a pull request.
- Match the surrounding style: TypeScript strict mode, small focused modules, comments that explain
  *why* rather than restating the code, no new dependencies without a good reason.

## Scope

This showcase deliberately does **not** include: a chat UI, chat history, RAG or document
retrieval, real OS/file/browser/account actions, arbitrary URLs or JavaScript, unrestricted tool
calling, or anything that depends on private infrastructure. If your idea needs one of those, it is
probably a separate project — open an issue and let's talk first.

## Reporting a phrase that broke it

The most valuable issue is a phrase. Use the **New test phrase** issue template and include: the
exact input, the language, what you expected, and what actually happened. That is often enough to
turn into an eval case and a fix.

## License

This project is released under the [MIT License](./LICENSE). By contributing, you agree that your
contribution is licensed under the same terms.
