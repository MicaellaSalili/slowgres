/**
 * Slowgres Icon Generation Script
 *
 * Generates production-ready PNG and ICO favicon assets for Slowgres.
 *
 * How to re-run:
 * 1. Install temporary dependencies (avoids bloating app package.json):
 *    mkdir -p /tmp/icon-gen && cd /tmp/icon-gen && npm init -y && npm install sharp png-to-ico
 * 2. Run this script:
 *    node scripts/generate-icons.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const publicDir = path.join(rootDir, "public");

// Resolve modules from /tmp/icon-gen or local node_modules
let require;
try {
  require = createRequire(import.meta.url);
  require.resolve("sharp");
} catch {
  require = createRequire("/tmp/icon-gen/package.json");
}

const sharp = require("sharp");
const rawPngToIco = require("png-to-ico");
const pngToIco = rawPngToIco.default || rawPngToIco;

// SVG definitions:
// Standard rounded icon (for favicon & standard manifest icons)
const standardSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="512" height="512">
  <rect fill="#18181B" width="32" height="32" rx="7"/>
  <path fill="#F59E0B" d="M18.5 4 8 17.5H15L13.5 28 24 14H17Z"/>
</svg>
`.trim();

// Full-bleed background (rx=0) for apple-touch-icon and maskable icon
// Bolt coordinates: x from 8 to 24 (50% width), y from 4 to 28 (75% height)
// This gives ~18.75% padding on average and fits safely within the 80% safe zone
const fullBleedSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="512" height="512">
  <rect fill="#18181B" width="32" height="32" rx="0"/>
  <path fill="#F59E0B" d="M18.5 4 8 17.5H15L13.5 28 24 14H17Z"/>
</svg>
`.trim();

async function generate() {
  console.log("Generating icon set for Slowgres in", publicDir);

  // 1. apple-touch-icon.png (180x180, full canvas background rx=0, ~20% padding)
  await sharp(Buffer.from(fullBleedSvg))
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, "apple-touch-icon.png"));
  console.log("Created apple-touch-icon.png (180x180)");

  // 2. icon-192.png (192x192 for webmanifest)
  await sharp(Buffer.from(standardSvg))
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, "icon-192.png"));
  console.log("Created icon-192.png (192x192)");

  // 3. icon-512.png (512x512 for webmanifest)
  await sharp(Buffer.from(standardSvg))
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, "icon-512.png"));
  console.log("Created icon-512.png (512x512)");

  // 4. icon-512-maskable.png (512x512, background fills canvas rx=0, bolt inside 80% safe zone)
  await sharp(Buffer.from(fullBleedSvg))
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, "icon-512-maskable.png"));
  console.log("Created icon-512-maskable.png (512x512)");

  // 5. favicon.ico (containing 16x16, 32x32, 48x48)
  const ico16 = await sharp(Buffer.from(standardSvg)).resize(16, 16).png().toBuffer();
  const ico32 = await sharp(Buffer.from(standardSvg)).resize(32, 32).png().toBuffer();
  const ico48 = await sharp(Buffer.from(standardSvg)).resize(48, 48).png().toBuffer();

  const icoBuf = await pngToIco([ico16, ico32, ico48]);
  fs.writeFileSync(path.join(publicDir, "favicon.ico"), icoBuf);
  console.log("Created favicon.ico (16x16, 32x32, 48x48)");

  console.log("Icon set generation complete!");
}

generate().catch((err) => {
  console.error("Error generating icons:", err);
  process.exit(1);
});
