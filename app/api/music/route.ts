import { randomInt } from "node:crypto";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

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
  const files = await readdir(path.join(process.cwd(), "public", "music"), { withFileTypes: true });
  const tracks = files.filter((file) => file.isFile() && /\.mp3$/i.test(file.name));
  if (!tracks.length) {
    return NextResponse.json({ error: "Chưa có bài hát." }, { status: 404, headers });
  }
  const previous = new URL(request.url).searchParams.get("previous");
  const alternatives = tracks.filter((track) => `/music/${encodeURIComponent(track.name)}` !== previous);
  const candidates = alternatives.length ? alternatives : tracks;
  const file = candidates[randomInt(candidates.length)].name;
  const name = trackTitles[file] ?? file.replace(/\.mp3$/i, "").replace(/[-_]+/g, " ").trim();
  const title = name.charAt(0).toLocaleUpperCase("vi-VN") + name.slice(1);
  return NextResponse.json(
    { track: { title, src: `/music/${encodeURIComponent(file)}` } },
    { headers },
  );
}
