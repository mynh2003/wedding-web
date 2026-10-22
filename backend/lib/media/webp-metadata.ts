// WebP RIFF container: https://developers.google.com/speed/webp/docs/riff_container
// Keep compressed pixels, alpha and color profile without another lossy encode.
export function stripWebpMetadata(bytes: Uint8Array) {
  const input = Buffer.from(bytes);
  if (input.length < 20 || input.toString("ascii", 0, 4) !== "RIFF" || input.toString("ascii", 8, 12) !== "WEBP" || input.readUInt32LE(4) + 8 !== input.length) throw new Error("Invalid WebP container");
  const chunks: Buffer[] = [];
  const seen = new Set<string>();
  const allowed = new Set(["VP8X", "ICCP", "ALPH", "VP8 ", "VP8L"]);
  let offset = 12, count = 0, frames = 0;
  while (offset < input.length) {
    if (offset + 8 > input.length || ++count > 512) throw new Error("Invalid WebP chunks");
    const name = input.toString("ascii", offset, offset + 4);
    const size = input.readUInt32LE(offset + 4);
    const end = offset + 8 + size + (size % 2);
    if (end > input.length) throw new Error("Invalid WebP chunk length");
    if (name === "ANIM" || name === "ANMF") throw new Error("Animated image");
    if (allowed.has(name)) {
      if (seen.has(name)) throw new Error("Duplicate WebP chunk");
      seen.add(name);
      const chunk = Buffer.from(input.subarray(offset, end));
      if (name === "VP8X") {
        if (size !== 10) throw new Error("Invalid extended WebP header");
        chunk[8] &= ~0x0c; // Clear EXIF and XMP presence flags.
      }
      if (name === "VP8 " || name === "VP8L") frames++;
      chunks.push(chunk);
    }
    offset = end;
  }
  if (frames !== 1) throw new Error("Invalid WebP frame count");
  const header = Buffer.from(input.subarray(0, 12));
  const output = Buffer.concat([header, ...chunks]);
  output.writeUInt32LE(output.length - 8, 4);
  return output;
}
