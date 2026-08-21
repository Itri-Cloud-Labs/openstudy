# OpenStudy development guide

OpenStudy is a local-first terminal study assistant built with Ink, React, and TypeScript. `src` is the source of truth; `dist` is disposable build output.

## Prerequisites

- Node.js 22 or newer. Ink 7 does not support older Node.js releases.
- npm 10 or newer.
- A terminal at least `73x23` for interactive testing.

If you use nvm, run `nvm use`; the repository's `.nvmrc` selects the minimum supported Node.js release.

Install exactly what is recorded in the lockfile:

```bash
npm ci
```

## Daily workflow

```bash
npm run dev
npm test
npm run typecheck
npm run lint
npm run format
npm run check
```

`npm run check` is the same quality gate used by CI. It verifies formatting, lint rules, source and test types, tests, a clean production build, and package metadata.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Run the TypeScript entry point directly with `tsx`. |
| `npm run test` | Run the test suite once with Node's test runner. |
| `npm run test:watch` | Re-run tests while files change. |
| `npm run audit` | Fail on high-severity production dependency advisories. |
| `npm run typecheck` | Type-check both `src` and `tests` without emitting files. |
| `npm run lint` | Run Biome's correctness checks. |
| `npm run format` | Format supported project files in place. |
| `npm run format:check` | Check formatting without changing files. |
| `npm run clean` | Remove generated `dist` output. |
| `npm run build` | Clean `dist` and compile the production CLI. |
| `npm start` | Run the compiled CLI. |
| `npm run package:check` | Check the package entry point and detect stale or missing build files. |
| `npm run reset` | Reset settings while preserving saved sessions and downloaded material. |

To remove every file under `~/.openstudy`, including saved sessions and downloaded material, use the deliberately explicit confirmation:

```bash
npm run reset:all -- --yes
```

## Structure

- `src/index.tsx` owns process signals, terminal restoration, and Ink mounting.
- `src/app` owns routes and composes the application's services and feature screens.
- `src/domain` contains provider, material, preference, and study-session types. It has no React or filesystem code.
- `src/features` groups home, setup, modal management, and study-session code by product feature.
- `src/infrastructure` contains material I/O and JSON persistence.
- `src/shared` contains reusable Ink controls, terminal hooks, theme values, text helpers, and package metadata.
- `src/providers` contains the single `StudyProvider` contract, one adapter per backend, provider metadata, and the factory map in `index.ts`. `prompt` resolves once with the final response text; there is no streaming.
- `src/modals` contains modal state machines and the typed static registry. Manifests describe shortcuts and screen scope.
- `src/commands` contains slash commands and their typed context.
- `src/prompts` contains plain study-mode system prompts. Do not add schemas or runtime code there.
- `tests` contains Node test-runner suites written in TypeScript.
- `scripts` contains cross-platform maintenance and package checks.

Domain modules import no UI or infrastructure code. Infrastructure imports domain contracts, not feature components. Feature code receives side-effecting services through the app layer or narrow compatibility functions. Shared code cannot import features.

## Local data

OpenStudy stores plain JSON documents in `~/.openstudy`: provider credentials in `config.json`, current preferences in `session.json`, and one directory per saved study session. Reads never create files or change timestamps. Writes use a temporary file and same-directory rename.

Provider credentials live only in `config.json`. Saved sessions contain a snapshot of study preferences and mode results, never API keys. Keep the normalization helpers in `src/domain` strict when changing these formats so corrupt or partial files degrade to defaults instead of crashing.

## Build and package invariants

- Never edit or commit `dist`; `npm run build` always recreates it from scratch.
- Runtime code uses Node ESM and includes `.js` extensions in relative imports so compiled output runs without a loader.
- The npm package contains `dist` plus npm's standard README, license, and metadata files; source, tests, and agent notes are excluded.
- `npm pack --dry-run` runs the full prepack quality gate before showing the final package contents.
- AI SDK packages are held to a mutually compatible, audited set. Update them together and run `npm audit`, the provider tests, and a clean build before changing the pin or override.
- Keep settings local under `~/.openstudy`, and never add local configuration or credentials to the repository.
- Keep study prompts in `src/prompts`; schemas, provider calls, and UI logic belong elsewhere.
