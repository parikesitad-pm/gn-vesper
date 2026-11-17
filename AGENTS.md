Read `PILOT.md` before working in this repository.
Then read the shared pilot rules at `../persona-tujuh/pilot.md` before implementation. The filename is lowercase. If that checkout is elsewhere, locate it; do not substitute this repo briefing for the shared rules.

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
- Repository inbox: `/vesper`; GitHub setup/API reference: `/docs/github`. `lib/github/` owns the server integration; `hooks/useRepoWatcher.ts` owns browser state.
- Vercel production: project `gn-vesper`, scope `parikesitadpms-projects`, public origin `https://gn-vesper.vercel.app`. Verify the explicit project before deployment. `.vercelignore` excludes env files, local watcher storage, and test artifacts.
- `npm run test:repos` verifies the inbox in Chrome with fixtures and axe. After building, `npm run test:github` starts an isolated fixture server on port 3002 to verify OAuth, account isolation, webhooks, persistence, and deletion. Neither needs real keys.
- Account persistence uses PostgreSQL (`DATABASE_URL`) or a persistent local directory for one Node process; Vercel requires PostgreSQL. Public watchlists stay in browser storage. Never commit `.vesper/` or use real credentials in fixtures.
- Verify UI in Chrome at 360, 768, 1280, and 1920 pixels; check dark/light, reduced motion, icon hover, keyboard shortcut, commands, and knowledge answers.
- Preserve uncommitted work; never read credential files. Provider credentials remain server-side.

- Performance: `PREVIEW_URL=http://localhost:3001 node scripts/measure-performance.mjs` against a production server; three runs at 4x CPU, software WebGL. Keep the local dev server running separately.

- SonarCloud project: `parikesitad-pm_gn-vesper` (EU). `sonar list issues` and `sonar quality-gate status` read the last cloud analysis; local `sonar analyze` requires Vortex access and must not be reported as passing when files are skipped.
