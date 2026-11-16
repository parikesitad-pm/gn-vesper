# Changelog

All notable changes to Vesper Notch are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.0] — 2026-11-16

### Added

- GSAP and ScrollTrigger presentation motion, Lenis scrolling, and a procedural Three.js vessel with pointer response.
- A bilingual inline command console with ACT/KNOW examples, output, citations, and theme controls.
- A Vesper icon that opens the command island on hover, click, or Command/Super+K / Ctrl+K.
- Pause, reduced-motion, off-screen rendering suspension, WebGL fallback, and resource cleanup.

### Changed

- Replaced Tokyo Night with Dracula across surfaces, alternate themes, lighting, and pixel assets.
- Split page presentation into hero, command lab, architecture, and vessel organisms; moved the controller into a hook.

### Fixed

- Casual Vesper/Owl comparison questions now route to a deterministic identity answer.
- Superseded classification and knowledge requests cannot overwrite newer input results.

## [0.2.0] — 2026-11-15

The contextual AI interface release: Vesper now KNOWS as well as ACTS, without becoming a chatbot.

### Added

- **KNOW path** — grounded creator answers from the public `d-ap.my.id` corpus, fetched server-side, cached,
  chunked with provenance, and retrieved with deterministic BM25. Every answer cites a public page or says the
  source does not record it.
- **Canonical entity boundary** — `lib/identity.ts` defines Vesper (`GN-013`), Owl (`GN-011`) and the creator
  `dap_ — Dausan Adam Parikesit` as three distinct entities. Identity questions short-circuit before retrieval
  or any provider call.
- **Groq provider** — native Groq adapter and fallback chains: Groq → Gemini for ACT classification,
  Gemini → Groq → OpenAI-compatible for KNOW answers. Every attempt is measured and reported.
- **Creator site action** — one fixed, allow-listed URL (`https://d-ap.my.id`); no arbitrary links.
- **Knowledge UI** — answer tray, public source pills, creator card, identity example chips, and inspector
  fields for provider attempts, knowledge mode, sources and retrieval scores.
- **Live RAG evaluation** — `npm run eval:rag` validates the real corpus, the eight identity acceptance cases,
  nine creator questions and the honest "not on record" path.
- **Atomic Design structure** — components now live in `atoms/`, `molecules/` and `organisms/`, with styles
  colocated next to the component that owns them.
- **Semantic versioning** — this changelog, a versioning policy in the README, and `package.json` as the single
  source of truth.

### Changed

- The provider interface is now one `generate()` shape serving both classification and grounded answers.
- Questions are routed before theme/language/navigation rules, so "how do I change the theme?" cannot act.
- The grounded-answer prompt answers as Vesper and explicitly forbids claiming to be `dap_`, Owl, Gemini or
  Groq.
- Creator attribution now inherits the surrounding surface colour, so it is legible in the notch and on the
  themed page.
- Documentation now states the permanent entity boundaries and that no live Owl integration exists.

### Fixed

- Provider fallbacks record a failed attempt instead of hiding it.
- Invalid citations, markdown wrappers and invented source links are stripped from model answers.
- Identity questions can no longer reach a provider, so the creator/entity facts cannot be hallucinated.

## [0.1.0] — 2026-11-15

### Added

- Standalone notch showcase: compact top-centred glass surface, continuous spring expansion, keyboard
  (`⌘K` / `Ctrl+K`, `Escape`), focus restore, reduced-motion support and an `aria-live` status.
- ACT path: normalise → local English/Indonesian rules → optional AI classification → strict allow-list
  validation → one safe adapter.
- Allow-listed actions: theme, language, navigate, motion, back, help, handoff.
- Optional Gemini / OpenAI-compatible providers behind server routes, with Demo Mode as a first-class state.
- Visible intent inspector showing only observable facts: path, raw reply, parsed intent, validation, adapter,
  measured latency and outcome.
- Four approved Vesper faces in `public/vesper/`.
- Unit tests, offline intent evaluation and the security note.

[Unreleased]: https://github.com/parikesitad-pm/gn-vesper/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/parikesitad-pm/gn-vesper/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/parikesitad-pm/gn-vesper/releases/tag/v0.1.0
