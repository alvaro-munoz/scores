// One-off icon generator: renders the app's spade mark to PNGs for the PWA
// manifest and favicons. Run with `node scripts/generate-icons.mjs`.
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const BG = '#0b1220'; // matches the app's dark surface background
const FG = '#00b7d6'; // Skeleton "rocket" theme primary-500

// Original, simple parametric spade silhouette (not traced from any icon set).
const spadePath =
  'M50 3 C24 26 4 45 4 64 C4 83 21 95 37 88 C41 86 45 82 47 77 L39 97 L61 97 L53 77 C55 82 59 86 63 88 C79 95 96 83 96 64 C96 45 76 26 50 3 Z';

function svg(size, { withBackground = true, padding = 0 } = {}) {
  const inner = size - padding * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    ${withBackground ? `<rect width="${size}" height="${size}" rx="${size * 0.22}" fill="${BG}"/>` : ''}
    <g transform="translate(${padding}, ${padding})">
      <svg width="${inner}" height="${inner}" viewBox="0 0 100 100">
        <path d="${spadePath}" fill="${FG}"/>
      </svg>
    </g>
  </svg>`;
}

const outDir = new URL('../public/icons/', import.meta.url);
mkdirSync(outDir, { recursive: true });

const targets = [
  // Standard app icons (a little breathing room around the glyph)
  { name: 'icon-192.png', size: 192, padding: 30 },
  { name: 'icon-512.png', size: 512, padding: 80 },
  // Maskable icons need the glyph inside the ~80% safe-zone circle
  { name: 'icon-maskable-192.png', size: 192, padding: 40 },
  { name: 'icon-maskable-512.png', size: 512, padding: 106 },
  // Apple touch icon (no rounding needed, iOS applies its own mask)
  { name: 'apple-touch-icon.png', size: 180, padding: 28 },
];

for (const t of targets) {
  const buf = Buffer.from(svg(t.size, { padding: t.padding }));
  await sharp(buf).png().toFile(fileURLToPath(new URL(t.name, outDir)));
  console.log('wrote', t.name);
}

// Favicon (transparent background, no rounded rect, browser chrome provides that)
const faviconSvg = svg(64, { withBackground: true, padding: 8 });
writeFileSync(fileURLToPath(new URL('../public/favicon.svg', import.meta.url)), faviconSvg);
await sharp(Buffer.from(svg(48, { padding: 6 }))).png().toFile(
  fileURLToPath(new URL('../public/favicon.png', import.meta.url)),
);

console.log('done');
