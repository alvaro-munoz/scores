# Scores

A simple, mobile-first PWA for tracking scores in card games. Add players, log a
score per round, and finish with a shareable scoreboard — all stored locally on
your device, no account or server required.

- **Svelte 5 + Vite** — the app itself
- **Dexie** — local storage on top of IndexedDB
- **Skeleton** — design system (Tailwind CSS v4)
- **Lucide** — icons
- **vite-plugin-pwa** — installable, offline-capable PWA

## How it works

- A game has a fixed set of players and a win condition: most points or fewest
  points wins.
- Each round records a score per player; running totals update live.
- Finishing a game locks it and shows a scoreboard that can be shared as an
  image (native share sheet on mobile, download elsewhere).
- Everything is stored on-device with Dexie/IndexedDB — there is no backend.

## Development

```bash
npm install
npm run dev
```

Other scripts:

```bash
npm run build    # production build to dist/
npm run preview  # serve the production build locally
npm run check    # type-check (svelte-check + tsc)
```

## Deployment

Pushing to `main` builds the app and publishes `dist/` to GitHub Pages via the
workflow in [.github/workflows/deploy.yml](.github/workflows/deploy.yml). The
first time you set this up on a repo, enable it once in **Settings → Pages →
Source → GitHub Actions**; after that every push to `main` deploys
automatically.

The app is built with `base: /scores/` (see `vite.config.ts`), matching this
repo's name as a GitHub Pages project site
(`https://<user>.github.io/scores/`). If you rename the repo, update that base
path to match.
