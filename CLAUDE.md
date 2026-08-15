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
```

There is no test suite/runner in this project — don't go looking for one.

Before considering a change done, run `npm run check` and `npm run lint`
(both must be clean; CI in `.github/workflows/deploy.yml` runs lint,
format:check, check, and build on every push to `main`).

## Deployment

Push to `main` → GitHub Actions (`.github/workflows/deploy.yml`) lints,
type-checks, builds, and publishes `dist/` to GitHub Pages. See `README.md`
for one-time repo setup.
