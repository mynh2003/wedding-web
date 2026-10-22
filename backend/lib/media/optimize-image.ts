import "server-only";
import sharp from "sharp";
import { stripWebpMetadata } from "@/lib/media/webp-metadata";

export const MAX_IMAGE_PIXELS = 40_000_000;
export const MAX_IMAGE_EDGE = 2560;

export async function optimizeUploadedImage(bytes: Uint8Array, mimeType: string) {
  const image = sharp(bytes, { limitInputPixels: MAX_IMAGE_PIXELS, animated: false, failOn: "warning" });
  const metadata = await image.metadata();
  // Reject animation/multi-page images rather than silently changing their content.
  if (!metadata.width || !metadata.height || (metadata.pages ?? 1) > 1) throw new Error("Unsupported image");
  if (metadata.format === "webp" && metadata.width <= MAX_IMAGE_EDGE && metadata.height <= MAX_IMAGE_EDGE && (metadata.orientation ?? 1) === 1) {
    await image.clone().stats(); // Validate the entire pixel stream before storage.
    return stripWebpMetadata(bytes);
  }
  return image.rotate().resize({ width: MAX_IMAGE_EDGE, height: MAX_IMAGE_EDGE, fit: "inside", withoutEnlargement: true })
    // Keep QR codes, lettering and transparency lossless; JPEG photos use q84.
    .webp({ quality: 84, alphaQuality: 100, effort: 4, lossless: mimeType === "image/png" })
    .toBuffer();
}
