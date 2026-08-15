# Decisions

A running log of notable decisions made on this project, including
approaches that were tried and reverted — so we don't re-litigate settled
choices or re-attempt something that already didn't work. For the resulting
current-state architecture, see [`architecture.md`](architecture.md). New
entries go at the bottom, in the order they happened.

## Plain Svelte + Vite, not SvelteKit

The user asked for "Svelte + Vite" specifically. Confirmed explicitly rather
than assumed: offered SvelteKit + adapter-static as the alternative (more
common for GitHub-Pages-deployed PWAs), but the user's wording was precise
enough, and the app small enough, that plain Vite plus a hand-rolled view
switcher (see "Router removed" below) was the right call.

## Hash-based routing, then no router at all

Started with `svelte-spa-router` and hash-based routes (`/#/new`,
`/#/game/:id`, ...), chosen so GitHub Pages (a static host) wouldn't need
server-side rewrite rules, and so the PWA's service worker could precache a
single `index.html` with no `navigateFallback` allowlist to maintain.

Later removed entirely: the user pointed out the app didn't really need
routing for four screens and asked for everything to live in one view with
simpler state instead. `App.svelte` now owns a single `view` discriminated
union and swaps it with plain functions; screens moved from `src/routes/` to
`src/views/` and take callback props instead of importing navigation
primitives. Trade-off accepted: there's no browser history, so the in-app
back button always returns to `home` rather than stepping back one screen.
See `architecture.md`'s "No router" section for the resulting shape.

## Dexie schema: three tables down to one

Originally `games`, `rounds`, and `recentPlayers` (the last powering
player-name autocomplete on the new-game form). The user asked to simplify:
a game's rounds are always loaded and saved together with it anyway, so a
separate table just meant joins for no benefit, and the autocomplete wasn't
worth a whole table either. Collapsed to a single `games` table with
`rounds: Round[]` embedded directly; `recentPlayers` and the autocomplete
feature were removed outright rather than folded in.

Because this was a real schema change (not just a rewrite of an unreleased
prototype), it went through a proper Dexie `version(2)` with an `.upgrade()`
step that migrates any existing `rounds`-table rows into their parent game
before dropping the old stores — verified against a hand-built legacy v1
database (games + rounds + recentPlayers) to confirm the upgrade path
actually works, not just the fresh-install path.

## Round entry: modal → inline card → merged grid

Three stages:

1. Originally a modal dialog (`RoundFormDialog`) for both adding and editing
   a round.
2. The user found that "cumbersome" and asked to keep it simple — replaced
   with an inline card directly on the `GamePlay` page: Enter chains between
   score fields and submits on the last one, and tapping a past round edits
   it in the same card instead of opening a dialog.
3. The user then found the standings display and the round list "busy" and
   asked to merge them — the standings chips, the entry card, and the round
   history list became a single grid: player-name header, a bold Totals
   row, an always-editable "next round" row, and round history below
   (newest first, so the entry row never needs the history scrolled out of
   the way).

Implementation note: step 3 was first built with an HTML `<table>` and
`position: sticky` on the frozen round-number column. That hit a real
cross-browser bug — content bled through the sticky column even with an
explicit `z-index`. The root cause turned out to be a missing background
class on two sticky cells introduced during the rewrite, not a
table-vs-grid issue per se — but the fix landed as a switch to CSS Grid
anyway, since it sidesteps sticky-cell quirks that are common with
`<table>` layouts generally, not just the specific bug hit here.

## Round-entry confirmation flow: tried, then reverted

Attempted a follow-up UX change: (a) Enter on the last score field would
move focus to the "Add round" button instead of auto-submitting, so saving
a round was always a distinct confirm step; and (b) "Finish game" would
become "Add round & finish" and save the in-progress round as part of
finishing, when there was one, instead of requiring add-then-finish as two
separate steps. Both were implemented and verified working in the browser.

The user's response was "It looks exactly the same, just undo the changes,"
and the change was reverted via `git checkout`. Whatever the user's actual
concern with the entry flow was, this specific fix didn't address it —
don't re-attempt this exact approach without new input from the user on
what "exactly the same" meant.

## Confirmation dialogs kept only for genuinely destructive actions

Finishing a game and reopening a game each used to open a `ConfirmDialog`
("Finish game?" / "Reopen game?"). The user pointed out that finishing
isn't final (you can always reopen) and reopening isn't risky either, so
confirming either one was friction with no real safety benefit. Both are
now a single direct tap. `ConfirmDialog` remains only for `Home`'s "Delete
game?", the one action that actually loses data.

## `updatedAt` and locale-aware relative time

Added an `updatedAt` field to `Game`, bumped by every mutation (see
`architecture.md`), so `GameCard` could show "Updated 5m ago" alongside
"Created <date>". Used `Intl.RelativeTimeFormat` rather than hand-rolled
English strings so the phrasing follows the user's system locale, and
capped relative phrasing at one week before falling back to a plain date —
"12d ago" stops being a useful at-a-glance unit.

The card layout for this went through two follow-up passes at the user's
request: "Created" first moved to the right side stacked under the status
badge and delete button, then to be inline before the badge on the same
line.

## ESLint + Prettier added

Flat ESLint config (`typescript-eslint` + `eslint-plugin-svelte` +
`eslint-config-prettier` so lint rules don't fight formatting) and Prettier
(`prettier-plugin-svelte` + `prettier-plugin-tailwindcss` for automatic
Tailwind class sorting). Wired into CI alongside the existing type-check, so
a badly-formatted or lint-failing push doesn't silently deploy.

## PWA dev-mode service worker disabled

`devOptions.enabled` in `vite-plugin-pwa` was initially on so `npm run dev`
would register a real service worker for testing. Removed after hitting a
spurious "glob pattern doesn't match any files" warning on every dev
server start — the dev-mode SW's `dev-dist/` output has nothing meaningful
to precache in the first place. Real PWA/offline/install testing now goes
through `npm run build && npm run preview` instead.

## Removed the "ready to work offline" toast

The user pointed out that a PWA being available offline is the baseline
expectation, not something worth interrupting the user to announce. The
"update available" toast stayed, since that one requires an actual user
decision (reload now or keep working on the old version).

## Split CLAUDE.md into three docs

The original single `CLAUDE.md` grew to cover commands, current-state
architecture, and decision rationale all in one file. Split into
`CLAUDE.md` (concise — commands and pointers), `architecture.md`
(current-state structural reference), and this file (why things are the
way they are, including reverted attempts), so each stays focused and
skimmable on its own.

## Added a test suite: Vitest, real Dexie over mocks, deliberately partial component coverage

Chose Vitest over other runners since it's Vite-native and needed no
separate transform/module pipeline to wire up. `db.ts` — the actual
business logic (round CRUD, `computeTotals`'s ranking/tie behavior, the
`version(1)` → `version(2)` migration) — gets exhaustive unit tests, run
against a real Dexie instance backed by `fake-indexeddb` rather than a
mocked data layer, so the migration test genuinely exercises Dexie's real
upgrade machinery instead of asserting against a hand-rolled fake of it.
`ScoresDB` was exported (previously only the `db` singleton was) purely so
that migration test could open a second, differently-named instance without
colliding with the one every other test uses.

Component tests (`@testing-library/svelte`) were added for `GameCard`,
`ConfirmDialog`, `NewGame`, and `Home` — chosen because each has either
real conditional logic (GameCard's Created/Updated display, ConfirmDialog's
controlled-open behavior) or protects a bug that was actually hit and fixed
earlier in this project (NewGame's placeholder-as-default-name fallback).
`GamePlay` and `Scoreboard` were deliberately left without their own
component tests: their real logic is already covered at the `db.ts` level,
and the remaining surface is UI wiring around a fairly involved CSS grid,
where component tests would likely be more fragile than valuable right now.
This isn't a permanent boundary — worth revisiting if `GamePlay` grows more
of its own logic rather than just calling into `db.ts`.

Two real, non-obvious problems came up getting the component tests green
and are now handled in `src/test/setup.ts` and `vitest.config.ts` rather
than worked around per-test:

- jsdom has no `ResizeObserver`, which Skeleton's `SegmentedControl` (used
  by `NewGame`) calls into via Zag — every component test using it failed
  until a no-op stub was added.
- `vite-plugin-pwa`'s `virtual:pwa-register` module doesn't exist outside
  an actual Vite build with that plugin loaded, so any test rendering a
  component that imports `src/lib/pwa.svelte.ts` (`Home`, `App`) failed to
  resolve it — aliased to a stub module instead of pulling the whole PWA
  plugin into the test config.
- A genuinely intermittent one: `userEvent.click()` on `NewGame`'s submit
  button resolves before the component's own `await createGame(...)`
  finishes, so asserting on the `onCreated` callback immediately after the
  click was a real race, not a flaky test to shrug off — fixed by wrapping
  those assertions in `waitFor(...)`.

## Tests wired into CI, gating PRs too

`.github/workflows/deploy.yml` gained a `test` step (`npm run test`)
alongside the existing lint/format/check/build steps. The workflow was also
renamed to `CI` and given a `pull_request` trigger (previously it only ran
on push to `main`), since a check that only runs after merging isn't
actually gating anything — the `deploy` job stays conditioned on
`github.event_name == 'push'` so a PR run never publishes unmerged code.
The concurrency group was changed from a single shared `pages` group to one
scoped per branch/PR (`${{ github.workflow }}-${{ github.ref }}`), since the
old shared group would have let an unrelated push cancel a PR's in-progress
checks.
