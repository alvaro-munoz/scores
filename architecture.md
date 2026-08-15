# Architecture

How Scores is put together — read this before changing anything that spans
more than one file. For _why_ it ended up this way, including approaches
that were tried and reverted, see [`decisions.md`](decisions.md).

## No router — one view-state variable

There is no client-side router. `src/App.svelte` owns a single `view`
discriminated union (`home` / `new` / `game` / `summary`) and swaps it with
plain functions (`goHome`, `goNew`, `goGame`, `goSummary`). Each screen in
`src/views/` is a dumb, prop-driven component — it receives callbacks like
`onOpenGame`, `onFinish`, `onCreated` instead of importing any navigation
primitive, and `GamePlay`/`Scoreboard` take `gameId: number` as a plain prop
rather than parsing a route param. When adding a new screen, wire it into
`App.svelte`'s view union and pass it callbacks the same way — don't reach
for a router.

One consequence: there's no browser history, so the in-app back arrow in the
header always goes to `home`, not to "the previous screen".

## Data layer (`src/lib/db.ts`, `src/lib/types.ts`)

Dexie database `scores-db` with a **single** `games` table. A `Game` embeds
both its `players: Player[]` (player ids are UUIDs scoped to that one game,
not shared across games) and its `rounds: Round[]` directly — there's no
separate `rounds` table, no `recentPlayers` table, and no player-name
autocomplete. If you're tempted to add a table back for something that's
always fetched alongside its parent game, embed it instead.

The Dexie class declares two schema versions: `version(1)` (the old
`games`/`rounds`/`recentPlayers` shape, kept so Dexie can still open a
browser's existing v1 database) and `version(2)` (the current single-table
shape), with an `.upgrade()` step on v2 that folds each game's rows from the
old `rounds` table into `games[i].rounds` before dropping the old stores.
Keep both versions declared even though the code only ever touches the v2
shape — removing `version(1)` would break upgrades for anyone still on it.
If you change the schema again, add a `version(3)` with its own
`.upgrade()`; don't edit `version(2)` in place.

Round identity is just its 1-based `index` within the game (no separate
round id) — `updateRound`/`deleteRound` take `(gameId, index, ...)`, and
deleting a round re-numbers the rest so indices stay contiguous.

Every mutation in `db.ts` that meaningfully touches a game (add/edit/delete a
round, finish, reopen, rename) also bumps that game's `updatedAt`. Keep this
invariant when adding new mutations — `GameCard`'s "Updated ..." text
depends on it.

`computeTotals(game)` is the single source of truth for standings: it sums
each player's scores across `game.rounds`, ranks them per
`game.winCondition` (`'highest'` or `'lowest'` wins), handles ties (equal
totals share a rank), and — importantly — returns results in `game.players`
order, not rank order. Callers that need a leaderboard sort it themselves
(`[...totals].sort((a, b) => a.rank - b.rank)`); callers that need a stable
column order (the `GamePlay` grid) rely on the original order.

## Reactivity bridge (`src/lib/liveQuery.svelte.ts`)

`liveQueryState(querierFn, initial)` wraps a Dexie `liveQuery` in a Svelte 5
rune so components can read `.value` reactively without manual
subscribe/unsubscribe. It must be called during component initialization,
like any other rune. Screens query `db.games` this way (`Home` for the list,
`GamePlay`/`Scoreboard` for a single game via `db.games.get(gameId)`) and
then just read `game.value.rounds`/`game.value.players` off the result —
since rounds are embedded, nothing needs its own separate live query for
them.

## GamePlay's merged scoreboard grid

`src/views/GamePlay.svelte` renders standings, the next-round entry row, and
round history as a single CSS **grid** (not an HTML `<table>`) with a
sticky first column for the round number. Keep every sticky cell's
background class explicit (don't rely on inherited/table backgrounds) — a
missing one is what broke this last time.

The same grid also doubles as the round-editing UI: tapping a past round
turns that row into input cells in place (`editingRound` state) rather than
opening a modal. Score entry supports Enter-to-next-field keyboard chaining
(see `handleScoreKeydown`) and submits on Enter from the last field.

Finishing and reopening a game are both a single direct tap — no
confirmation dialog. The only confirmation dialog left in the app is
`Home`'s "Delete game?" (`ConfirmDialog`), since that's the one genuinely
hard-to-undo action.

## PWA & the dev/build/preview base-path split

`vite.config.ts`'s `base` is `/scores/` for `vite build` and `vite preview`,
but `/` for plain `vite`/`npm run dev`. This matters because `vite preview`
reports `command: 'serve'` (same as dev) — only the `isPreview` flag tells it
apart from `npm run dev`. Get this wrong and `vite preview` will 404 on every
built asset (index.html references `/scores/...` but the dev-base preview
server serves from `/`). The GitHub Pages base path (`/scores/`) must match
the repo name if the repo is ever renamed.

`vite-plugin-pwa`'s `devOptions.enabled` is **on**, with `suppressWarnings:
true`. It needs to be on because `vite-plugin-pwa` injects a
`<link rel="manifest">` tag into the dev HTML regardless of this setting —
with it off, that URL isn't served, so Vite's SPA fallback returns
`index.html` there and DevTools reports "manifest is not valid JSON data".
`suppressWarnings` avoids the reason it was off in the first place: without
it, the dev-mode service worker (registered under `dev-dist/`, which has
nothing real to precache) logs a spurious "glob pattern doesn't match any
files" warning on every dev server start. This dev-mode service worker is
still not the real one — use `npm run build && npm run preview` to test
actual PWA/offline/install behavior against the production service worker.

`src/lib/pwa.svelte.ts` wraps `virtual:pwa-register` and the
`beforeinstallprompt` event in a small rune-based API (`pwa.needRefresh`,
`pwa.canInstall`, `pwa.reload()`, `pwa.install()`) consumed by `App.svelte`
(update toast) and `Home.svelte` (install banner).

App icons (`public/icons/`, `public/favicon.*`) are generated by
`scripts/generate-icons.mjs` from an inline SVG path, via `sharp` (a
devDependency used only by this script — not part of the app build).

## Skeleton/Tailwind gotchas

- Skeleton `Dialog` usages here (`ConfirmDialog`, used only for deleting a
  game) are controlled from outside with no `Dialog.Trigger`, so they set
  `closeOnInteractOutside={false}`. Without it, the same click that flips
  `open` to `true` gets treated as an "outside click" by Zag's dismissable
  layer and immediately closes the dialog again. Apply the same fix to any
  new dialog opened the same way (a plain button setting `open = true`).
- The toast region (`src/lib/toaster.ts`) sets explicit `offsets.top` so
  toasts clear the sticky app header instead of overlapping it.
- Date/relative-time formatting (`src/lib/format.ts`) uses
  `toLocaleDateString`/`Intl.RelativeTimeFormat` with no explicit locale, so
  it follows the user's system locale — don't hardcode English strings for
  dates/times.

## Testing (`vitest.config.ts`, `src/test/`)

Vitest, with its own config file separate from `vite.config.ts` — that
file's base-path/PWA-plugin setup exists to serve the real app and isn't
relevant under test. `*.test.ts` files live next to what they test
(`src/lib/db.test.ts`, `src/lib/components/GameCard.test.ts`, ...), not in a
parallel `tests/` tree.

`db.ts` is tested against a **real** Dexie instance backed by
`fake-indexeddb` (wired up in `src/test/setup.ts`), not a mocked one — that
includes the `version(1)` → `version(2)` migration, exercised by hand-building
a legacy v1 database (see `ScoresDB`'s exported class, used to open a second,
differently-named instance for that one test) and asserting the upgrade
folds its data correctly. Component tests (`@testing-library/svelte`) render
against that same real Dexie/fake-indexeddb backend rather than mocking
`db.ts` — only genuinely external browser integrations get mocked:

- `virtual:pwa-register` (a build-time virtual module from `vite-plugin-pwa`
  that doesn't exist under Vitest) is aliased to a stub in
  `src/test/mocks/virtual-pwa-register.ts`.
- jsdom has no `ResizeObserver`, which Skeleton's Zag-based components (e.g.
  `SegmentedControl`) call — stubbed in `src/test/setup.ts`.

One easy trap when testing a component whose click handler `await`s a Dexie
write (e.g. `NewGame`'s submit button, which awaits `createGame`):
`userEvent.click(...)` resolves once the event has been dispatched, not
once unrelated async work it triggered has finished. Asserting on a callback
immediately after the `await userEvent.click(...)` line is a real, genuinely
intermittent race — wrap that assertion in `waitFor(...)` instead.

Component test coverage is intentionally not exhaustive: `GamePlay.svelte`
and `Scoreboard.svelte` don't have their own component tests. Their actual
logic (round CRUD, `computeTotals`) is already covered thoroughly at the
`db.ts` level; what's left in those two components is largely UI wiring
around a fairly involved CSS grid, which would cost more in test fragility
than it would add in regression coverage for now.
