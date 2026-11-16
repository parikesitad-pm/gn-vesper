# Vesper pilot briefing

Pilot: dap_. Agents are copilots; product decisions belong to the pilot.

## Mission

Vesper (GN-013) is a compact natural-language interface for safe page actions and creator answers with public sources. Owl (GN-011) is a separate conversational assistant.

## Current work

Replace the presentation with an interactive Dracula experience using GSAP, ScrollTrigger, Lenis, and Three.js. Keep ACT/KNOW behavior, source links, bilingual copy, and the observable execution trace.

## Decisions

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
