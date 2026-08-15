# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project summary

Scores is a mobile-first PWA for tracking card game scores: a fixed set of
players, one score per round, running totals, and a shareable scoreboard at
the end. Everything is stored on-device (Dexie/IndexedDB) — there is no
backend and no user accounts. See `README.md` for the feature-level pitch.

For how the app is put together, see [`architecture.md`](architecture.md).
For _why_ it's built that way — including approaches that were tried and
reverted — see [`decisions.md`](decisions.md). Skim both before making a
change that spans more than one file; several choices in there look
arbitrary until you know what they replaced.

## Commands

```bash
npm run dev             # start the dev server (vite)
npm run build            # production build to dist/ (no type-checking — run `check` separately)
npm run preview          # serve the production build (needed to test real PWA/offline behavior)
npm run check            # type-check: svelte-check + tsc
npm run lint             # eslint .
npm run lint:fix         # eslint . --fix
npm run format           # prettier --write .
npm run format:check     # prettier --check .
npm run test             # vitest run — single pass, what CI runs
npm run test:watch       # vitest — reruns on change
npm run test:coverage    # vitest run --coverage
```

To run a single test file or a single test by name:

```bash
npx vitest run src/lib/db.test.ts
npx vitest run -t "gives tied totals the same rank"
```

Before considering a change done, run `npm run check`, `npm run lint`, and
`npm run test` (all must be clean; CI in `.github/workflows/deploy.yml` runs
lint, format:check, check, test, and build on every push to `main` and every
PR against it).

## Working conventions

Never run `git commit` or `git push` without telling the user first, even if
a previous turn in the same session explicitly asked for a commit/push on a
related change — that permission doesn't carry forward. Say what you're
about to commit/push and let the user confirm before doing it, not after.

## Deployment

Push to `main` → GitHub Actions (`.github/workflows/deploy.yml`) lints,
type-checks, tests, builds, and publishes `dist/` to GitHub Pages. The same
workflow also runs (without deploying) on PRs against `main`. One-time setup
on a new repo: enable **Settings → Pages → Source → GitHub Actions**; after
that every push to `main` deploys automatically.

The app is built with `base: /scores/` (see `vite.config.ts`), matching this
repo's name as a GitHub Pages project site
(`https://<user>.github.io/scores/`). If the repo is ever renamed, update
that base path to match.
