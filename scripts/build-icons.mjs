// Generates app icon + splash PNG variants from the brand SVGs.
// Run with:  node scripts/build-icons.mjs
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "..");
const assets = path.join(root, "assets");

async function render(svgPath, outPath, size) {
  const svg = await fs.readFile(svgPath);
  await sharp(svg, { density: 384 })
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(outPath);
  console.log(`✓ ${path.relative(root, outPath)} (${size}x${size})`);
}

const iconSvg = path.join(assets, "brand-icon.svg");
const splashSvg = path.join(assets, "brand-splash.svg");

await render(iconSvg, path.join(assets, "icon.png"), 1024);
await render(iconSvg, path.join(assets, "adaptive-icon.png"), 1024);
await render(iconSvg, path.join(assets, "favicon.png"), 196);
await render(splashSvg, path.join(assets, "splash-icon.png"), 1024);

console.log("\nDone. Reference these in app.json:");
console.log("  icon:          ./assets/icon.png");
console.log("  android.adaptiveIcon.foregroundImage: ./assets/adaptive-icon.png");
console.log("  web.favicon:   ./assets/favicon.png");
console.log("  splash plugin: ./assets/splash-icon.png");
