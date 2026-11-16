Read `PILOT.md` before working in this repository.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project facts

- Next.js 16 App Router, React 19, TypeScript, colocated CSS.
- Motion: GSAP, ScrollTrigger, Lenis on the GSAP ticker, one Three.js WebGL scene.
- `components/`: atoms, molecules, organisms. `hooks/`: intent controller and reduced-motion preference.
- `data/showcase.ts`: EN/ID page copy. `lib/gsap/`: scoped motion hooks. `lib/three/`: scene construction and disposal.
- Design tokens: `app/globals.css`; Dracula is the default.
- Commands: `npm run dev`, `npm run check`, `npm run build`.
- Verify UI in Chrome at 360, 768, 1280, and 1920 pixels; check dark/light, reduced motion, icon hover, keyboard shortcut, commands, and knowledge answers.
- Preserve uncommitted work; never read credential files. Provider credentials remain server-side.
