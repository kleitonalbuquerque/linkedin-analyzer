# Repository Guidelines

## Project Structure & Module Organization
This repository has two runnable parts:

- `extension/`: Chrome extension built with Vite, React, and TypeScript. Main UI lives in `src/`, static extension assets and manifests live in `public/`, and Chrome Web Store packaging scripts live in `scripts/`.
- `backend/`: Express API used to analyze captured LinkedIn profile data. Routes are in `src/routes/`, service logic is in `src/services/`, and app bootstrap is in `src/server.js`.
- `docs/`: static files for the published privacy policy.

Keep new tests next to the code they cover, following the existing `*.test.ts`, `*.test.tsx`, and `*.test.js` pattern.

## Build, Test, and Development Commands
- `cd extension && npm run dev`: starts the extension UI with the development manifest.
- `cd extension && npm run build:dev`: creates a local development build.
- `cd extension && npm run build:store`: creates the Chrome Web Store build, removes dev artifacts, and audits the bundle for policy risks.
- `cd extension && npm run lint`: runs ESLint on TypeScript and React files.
- `cd extension && npm test`: runs Vitest with coverage.
- `cd backend && npm start`: starts the API on port `3000`.
- `cd backend && npm test`: runs backend Vitest tests with coverage.

## Coding Style & Naming Conventions
Use the existing style in each package:

- Frontend TypeScript/React uses double quotes, semicolons, and PascalCase component names such as `App.tsx`.
- Backend JavaScript uses ESM imports, double quotes, semicolons, and camelCase function names such as `createApp`.
- Keep utility modules in `extension/src/lib/` and route-specific logic in `backend/src/routes/`.

Prefer small, explicit helpers over large inline blocks. Run `npm run lint` in `extension/` before submitting UI changes.

## Testing Guidelines
Vitest is used in both packages. Frontend tests run in `jsdom` with Testing Library; backend tests use route and service tests. Coverage thresholds are enforced at `90%` for the extension, and contributors should keep backend coverage at the same standard already documented in the repo. Add regression tests for profile extraction, PDF generation, and `/analyze` behavior when fixing bugs.

## Commit & Pull Request Guidelines
Recent history follows short, imperative commit subjects, often with a scope, for example `refactor(extension): ...` or `Ignore social proof badges in profile capture`. Prefer:

- `feat(extension): ...`
- `fix(backend): ...`
- `refactor(extension): ...`

PRs should state the user-visible change, list commands run for validation, and include screenshots or PDFs when modifying extension UI, profile capture, or exported reports.

## Security & Release Notes
Do not commit real secrets. Use `backend/.env` and `extension/.env` locally. For store releases, only submit artifacts generated from `cd extension && npm run build:store`; this flow swaps in `manifest.store.json` and runs the Chrome Web Store compliance audit automatically.
