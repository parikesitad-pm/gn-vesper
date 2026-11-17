# Vesper pilot briefing

Pilot: dap_. Agents are copilots; product decisions belong to the pilot.

Read and apply `../persona-tujuh/pilot.md` before implementation. Rule 1: dap is the pilot. The shared rules govern communication and engineering; this briefing records project decisions.

## Mission

Vesper (GN-013) is a compact natural-language interface for safe page actions and creator answers with public sources. Owl (GN-011) is a separate conversational assistant.

## Current work

Build the repository watcher inside the island, with a full inbox at `/vesper` and integration documentation at `/docs/github`. Keep ACT/KNOW behavior, the original Vesper character, source links, and the Dracula presentation.

## Decisions

- 2026-11-17: Pilot authorized production deployment to Vercel. Target: `gn-vesper` in the creator's Vercel team; GitHub account features remain unavailable until server credentials and PostgreSQL are configured.

- 2026-11-17: Pilot authorized completing repository watching, persistent account settings, PR/activity views, notifications, documentation, and environment examples before providing service keys. Public mode must work without keys; configured services require later live verification.

- 2026-11-17: Pilot requested the personal_branding island interaction as the reference: continuous surface transition, no ×, Escape and outside click dismiss.

- 2026-11-17: Pilot explicitly requires the shared footer on home and docs: `crafted by dap_ · a modula project · © <year>`, with the year supplied by the server.

- 2026-11-16: Pilot requested adaptive 3D quality, cancel/retry, contextual suggestions, saved preferences, and undo before proposing expanded Groq capabilities.

- 2026-11-16: Show actual KNOW provider/model beside answers in both console and island, label local answers honestly, and provide bilingual `/docs` with usage and integration guidance. Keyboard navigation, visible focus, target sizes, and WCAG 2.2 AA automated checks are part of UI verification.

- 2026-11-16: Pilot clarified Dracula means a red-led dark palette, not purple. Use red for primary accents, vessel lighting, and Vesper assets across theme variants.

- 2026-11-16: Pilot authorized the UI redesign, animation dependencies, Claude skill reuse, browser testing, and a running local dev server.
- 2026-11-16: Dracula replaces Tokyo Night across page tokens, alternate themes, 3D lighting, and Vesper assets.
- 2026-11-16: Only the Vesper icon is visible at rest. Hovering the icon or Wake Vesper button previews the command island; leaving returns to the icon without stealing focus. Click, Super/Command+K, or Ctrl+K pins it open for typing.
- 2026-11-16: Casual Vesper/Owl comparisons receive deterministic identity answers before retrieval.
- 2026-11-16: Pilot explicitly directed: **IGNORE NOIR until I say otherwise.** This remains active until the pilot revokes it.

## Boundaries

- Keep provider keys on the server. Never turn retrieved text or model output into arbitrary actions.
- Preserve the existing RAG answer and knowledge-test edits.
- Respect reduced motion; pause WebGL off-screen and while motion is disabled.
- Do not publish, push, or commit unless requested.
- Ignore Noir checks and guard requirements until the pilot says otherwise. Do not change or uninstall Noir itself.

## One story per site

All routes share the same identity, role, skills, projects, numbers, contact, dates, voice, and delivery theme. Update shared facts together. Only an existing colophon may use a separate reference to the creator's initials.
