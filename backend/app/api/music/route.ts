import { randomInt } from "node:crypto";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import musicCatalog from "@/lib/music-catalog.generated.json";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const headers = { "Cache-Control": "no-store, max-age=0" };
const trackTitles: Record<string, string> = {
  "a-thousand-years.mp3": "A thousand years",
  "hon-ca-yeu.mp3": "Hơn cả yêu",
  "le-duong.mp3": "Lễ đường",
  "mot-doi.mp3": "Một đời",
  "vay-cuoi.mp3": "Váy cưới",
};

export async function GET(request: Request) {
  // The catalog belongs to this service; MP3 files belong to the invitation.
  // An explicit development asset directory is optional, never a sibling app.
  let tracks: string[] = musicCatalog;
  if (process.env.NODE_ENV !== "production" && process.env.WEDDING_PUBLIC_DIR) {
    try {
      const publicDirectory = process.env.WEDDING_PUBLIC_DIR || path.join(process.cwd(), "public");
      const files = await readdir(path.join(publicDirectory, "music"), { withFileTypes: true });
      tracks = files.filter((file) => file.isFile() && /\.mp3$/i.test(file.name)).map((file) => file.name);
    } catch (error) {
      const missing = typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
      return NextResponse.json(
        { error: missing ? "Chưa có bài hát." : "Không thể tải bài hát." },
        { status: missing ? 404 : 500, headers },
      );
    }
  }
  if (!tracks.length) {
    return NextResponse.json({ error: "Chưa có bài hát." }, { status: 404, headers });
  }
  const previous = new URL(request.url).searchParams.get("previous");
  const alternatives = tracks.filter((track) => `/music/${encodeURIComponent(track)}` !== previous);
  const candidates = alternatives.length ? alternatives : tracks;
  const file = candidates[randomInt(candidates.length)];
  const name = trackTitles[file] ?? file.replace(/\.mp3$/i, "").replace(/[-_]+/g, " ").trim();
  const title = name.charAt(0).toLocaleUpperCase("vi-VN") + name.slice(1);
  return NextResponse.json(
    { track: { title, src: `/music/${encodeURIComponent(file)}` } },
    { headers },
  );
}
