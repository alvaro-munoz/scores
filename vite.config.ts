import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ command, isPreview }) => ({
  // Project pages are served from https://<user>.github.io/scores/, so the
  // build (and its local `vite preview`) needs that sub-path as its base.
  // Plain `vite`/`npm run dev` also reports command "serve", so isPreview is
  // what actually distinguishes it from `vite preview`.
  base: command === 'build' || isPreview ? '/scores/' : '/',
  plugins: [
    tailwindcss(),
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon.png', 'icons/apple-touch-icon.png'],
      manifest: {
        id: '/scores/',
        name: 'Scores',
        short_name: 'Scores',
        description: 'Track scores for your card games, round by round.',
        lang: 'en',
        // Relative to the manifest's own URL so this works unchanged both in
        // local dev (base "/") and once deployed under a GitHub Pages
        // sub-path (base "/scores/").
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'any',
        theme_color: '#0b1220',
        background_color: '#0b1220',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          {
            name: 'New game',
            short_name: 'New game',
            description: 'Start tracking a new game',
            url: '.#/new',
            icons: [{ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
          },
        ],
      },
      workbox: {
        // Hash-based routing means every "page" is the same index.html, so a
        // simple precache of the built assets is enough for full offline use.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        // Lets `npm run dev` register a real service worker too, so PWA
        // behavior (install prompt, offline) can be checked without a build.
        enabled: true,
        type: 'module',
      },
    }),
  ],
}))
