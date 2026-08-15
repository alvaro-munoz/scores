# Scores

> 🤖 **This app is vibecoded.** It was built by prompting [Claude
> Code](https://claude.com/claude-code) — describing what it should do and
> reviewing the results — rather than by hand-writing the implementation.

A simple, mobile-first PWA for tracking scores in card games. Add players,
log a score per round, and finish with a shareable scoreboard — all stored
locally on your device, no account or server required.

## What it does

- Set up a game with a fixed list of players and a win condition (highest or
  lowest total wins).
- Log a score per player each round; running totals and standings update
  live as you go.
- Edit or delete any past round — nothing is locked in until you finish the
  game.
- Finish a game to lock it and reveal the final scoreboard; reopen it again
  later if you need to.
- Share the finished scoreboard as an image, straight from your phone's
  share sheet (or as a download on desktop).
- Install it like a native app and keep using it offline — it's a full PWA.
- Everything lives on your device via IndexedDB. Nothing is sent anywhere.

## Built with

- [Svelte 5](https://svelte.dev/) + [Vite](https://vitejs.dev/)
- [Dexie](https://dexie.org/) for local storage on top of IndexedDB
- [Skeleton](https://www.skeleton.dev/) (Tailwind CSS v4) for the design
  system
- [Lucide](https://lucide.dev/) for icons
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) for offline/installable
  support

## Contributing / development

This is a Claude Code project. See [CLAUDE.md](CLAUDE.md) for setup and
commands, [architecture.md](architecture.md) for how it's put together, and
[decisions.md](decisions.md) for why it's built the way it is.
