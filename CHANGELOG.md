# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [1.0.0] - 2026-08-15

### Added

- Create a game with a fixed set of players and a win condition (most points
  or fewest points wins).
- Log a score per player each round, with running totals and standings
  updated live.
- Edit or delete any past round before the game is finished.
- Finish a game to lock it and reveal the final scoreboard; reopen it again
  later if needed.
- Share the finished scoreboard as an image.
- Install the app and use it offline — it's a full PWA.
- On-device storage only (IndexedDB via Dexie) — no account, no server.
