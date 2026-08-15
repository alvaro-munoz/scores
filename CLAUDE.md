# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project summary

Scores is a mobile-first PWA for tracking card game scores: a fixed set of
players, one score per round, running totals, and a shareable scoreboard at
the end. Everything is stored on-device (Dexie/IndexedDB) — there is no
backend and no user accounts. See `README.md` for the feature-level pitch.

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

## Architecture

### No router — one view-state variable

There is no client-side router (svelte-spa-router was deliberately removed).
`src/App.svelte` owns a single `view` discriminated union (`home` / `new` /
`game` / `summary`) and swaps it with plain functions (`goHome`, `goNew`,
`goGame`, `goSummary`). Each screen in `src/views/` is a dumb, prop-driven
component — it receives callbacks like `onOpenGame`, `onFinish`, `onCreated`
instead of importing any navigation primitive, and `GamePlay`/`Scoreboard`
take `gameId: number` as a plain prop rather than parsing a route param. When
adding a new screen, wire it into `App.svelte`'s view union and pass it
callbacks the same way — don't reach for a router.

One consequence: there's no browser history, so the in-app back arrow in the
header always goes to `home`, not to "the previous screen".

### Data layer (`src/lib/db.ts`, `src/lib/types.ts`)

Dexie database `scores-db` with three tables: `games`, `rounds`,
`recentPlayers` (the last one just powers the player-name autocomplete on the
new-game form). A `Game` embeds its `players: Player[]` directly (player ids
are UUIDs scoped to that one game, not shared across games) — there's no
separate players table.

Every mutation in `db.ts` that meaningfully touches a game (add/edit/delete a
round, finish, reopen, rename) also bumps that game's `updatedAt`. Keep this
invariant when adding new mutations — `GameCard` and any future
"last activity" UI depends on it.

`computeTotals(game, rounds)` is the single source of truth for standings: it
sums each player's scores, ranks them per `game.winCondition`
(`'highest'` or `'lowest'` wins), handles ties (equal totals share a rank),
and — importantly — returns results in `game.players` order, not rank order.
Callers that need a leaderboard sort it themselves
(`[...totals].sort((a, b) => a.rank - b.rank)`); callers that need a stable
column order (the `GamePlay` grid) rely on the original order.

### Reactivity bridge (`src/lib/liveQuery.svelte.ts`)

`liveQueryState(querierFn, initial)` wraps a Dexie `liveQuery` in a Svelte 5
rune so components can read `.value` reactively without manual
subscribe/unsubscribe. It must be called during component initialization,
like any other rune. This is how every screen/component stays live-updated
against IndexedDB (no manual refetching anywhere).

### GamePlay's merged scoreboard grid

`src/views/GamePlay.svelte` renders standings, the next-round entry row, and
round history as a single CSS **grid** (not an HTML `<table>`) with a
sticky first column for the round number. This was a deliberate choice after
hitting real cross-browser bugs with `position: sticky` on `<td>`/`<th>`
elements (content bleeding through the frozen column even with an explicit
`z-index`). If you touch that grid, keep every sticky cell's background class
explicit (don't rely on inherited/table backgrounds) — that's what broke last
time.

The same grid also doubles as the round-editing UI: tapping a past round
turns that row into input cells in place (`editingRound` state) rather than
opening a modal. Score entry supports Enter-to-next-field keyboard chaining
(see `handleScoreKeydown`) and submits on Enter from the last field.

### PWA & the dev/build/preview base-path split

`vite.config.ts`'s `base` is `/scores/` for `vite build` and `vite preview`,
but `/` for plain `vite`/`npm run dev`. This matters because `vite preview`
reports `command: 'serve'` (same as dev) — only the `isPreview` flag tells it
apart from `npm run dev`. Get this wrong and `vite preview` will 404 on every
built asset (index.html references `/scores/...` but the dev-base preview
server serves from `/`). The GitHub Pages base path (`/scores/`) must match
the repo name if the repo is ever renamed.

`vite-plugin-pwa`'s `devOptions.enabled` is intentionally left **off** — it
registers a second service worker under `dev-dist/` that has nothing real to
precache and logs a spurious "glob pattern doesn't match any files" warning
on every dev server start. Use `npm run build && npm run preview` to test
actual PWA/offline/install behavior against the real service worker.

`src/lib/pwa.svelte.ts` wraps `virtual:pwa-register` and the
`beforeinstallprompt` event in a small rune-based API (`pwa.needRefresh`,
`pwa.canInstall`, `pwa.reload()`, `pwa.install()`) consumed by `App.svelte`
(update toast) and `Home.svelte` (install banner).

App icons (`public/icons/`, `public/favicon.*`) are generated by
`scripts/generate-icons.mjs` from an inline SVG path, via `sharp` (a
devDependency used only by this script — not part of the app build).

### Skeleton/Tailwind gotchas

- Skeleton `Dialog` usages here (`ConfirmDialog`, used for delete/finish/reopen
  confirmations) are controlled from outside with no `Dialog.Trigger`, so they
  set `closeOnInteractOutside={false}`. Without it, the same click that flips
  `open` to `true` gets treated as an "outside click" by Zag's dismissable
  layer and immediately closes the dialog again. Apply the same fix to any
  new dialog opened the same way (a plain button setting `open = true`).
- The toast region (`src/lib/toaster.ts`) sets explicit `offsets.top` so
  toasts clear the sticky app header instead of overlapping it.
- Date/relative-time formatting (`src/lib/format.ts`) uses
  `toLocaleDateString`/`Intl.RelativeTimeFormat` with no explicit locale, so
  it follows the user's system locale — don't hardcode English strings for
  dates/times.

## Deployment

Push to `main` → GitHub Actions (`.github/workflows/deploy.yml`) lints,
type-checks, builds, and publishes `dist/` to GitHub Pages. See `README.md`
for one-time repo setup.
