import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const repositoryRoot = path.resolve(path.dirname(scriptPath), "../..");

// Optional maintenance for this combined checkout, never an app build step.
// Separate repositories update the versioned backend catalog explicitly.
export async function generateMusicManifest(projectRoot = repositoryRoot) {
  const musicDirectory = path.join(projectRoot, "frontend", "public", "music");
  const manifestPath = path.join(projectRoot, "backend", "lib", "music-catalog.generated.json");
  const entries = await readdir(musicDirectory, { withFileTypes: true });
  const tracks = entries.filter((entry) => entry.isFile() && /\.mp3$/i.test(entry.name))
    .map((entry) => entry.name).sort();
  const source = `${JSON.stringify(tracks, null, 2)}\n`;
  let previous;
  try {
    previous = await readFile(manifestPath, "utf8");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  if (previous !== source) {
    await mkdir(path.dirname(manifestPath), { recursive: true });
    await writeFile(manifestPath, source, "utf8");
  }
  return tracks;
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  await generateMusicManifest();
}
