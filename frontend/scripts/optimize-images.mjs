import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

// Explicit input list avoids recompressing an existing optimized image on reruns.
// Run from frontend: npm run optimize:images -- public/path/image.png [...]
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const inputs = process.argv.slice(2);
if (!inputs.length) throw new Error("Provide raster files inside public/. Outputs are WebP; originals are kept until references are verified.");

for (const input of inputs) {
  const file = path.resolve(root, input);
  const relative = path.relative(path.join(root, "public"), file);
  if (relative.startsWith("..") || path.isAbsolute(relative) || !/\.(png|jpe?g|webp|avif)$/i.test(file)) throw new Error(`Invalid public image: ${input}`);
  const source = await readFile(file);
  const image = sharp(source, { limitInputPixels: 40_000_000, animated: false });
  const metadata = await image.metadata();
  if ((metadata.pages ?? 1) > 1) throw new Error(`Animated image is not supported: ${input}`);
  const output = file.replace(/\.(png|jpe?g|webp|avif)$/i, ".optimized.webp");
  const bytes = await image.rotate().webp({ quality: 90, effort: 6, alphaQuality: 100, lossless: /mask|monogram|Heart/i.test(path.basename(file)) }).toBuffer();
  if (bytes.length >= source.length) { console.log(`Unchanged: ${input} (${source.length} bytes)`); continue; }
  await writeFile(output, bytes);
  const verified = await sharp(output).metadata();
  const rotated = metadata.orientation >= 5;
  if (verified.width !== (rotated ? metadata.height : metadata.width) || verified.height !== (rotated ? metadata.width : metadata.height) || verified.hasAlpha !== metadata.hasAlpha) throw new Error(`Image geometry/alpha changed: ${input}`);
  console.log(`${input}: ${source.length} -> ${bytes.length} bytes (${Math.round((1-bytes.length/source.length)*100)}% smaller) => ${path.relative(root, output)}`);
}
