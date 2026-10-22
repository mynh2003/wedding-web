import { cache } from "react";
import { createPublicClient } from "@/lib/supabase/public-server";
import { getSignedMediaUrls } from "@/lib/media/signed-urls";
import type { PublicWedding } from "@/lib/wedding-types";

// React cache shares this work within one render only. Published content and
// signed URLs are refreshed on the next request, including personalized links.
const loadWedding = cache(async (slug: string): Promise<PublicWedding | null> => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) return null;
  const supabase = createPublicClient();
  const { data: wedding, error: weddingError } = await supabase.from("weddings")
    .select("id,groom_name,bride_name,wedding_date")
    .eq("slug", slug).eq("is_published", true).maybeSingle();
  if (weddingError) throw new Error("Unable to load published wedding");
  if (!wedding) return null;

  const { data: rows, error: contentError } = await supabase.from("wedding_content")
    .select("section_key,content").eq("wedding_id", wedding.id).eq("is_published", true);
  if (contentError) throw new Error("Unable to load published wedding content");
  const content = Object.fromEntries((rows ?? []).map((row) => [row.section_key, row.content ?? {}])) as Record<string, Record<string, unknown>>;
  const ids = [...new Set(Object.values(content).flatMap((section) => Object.values(section)
    .filter((value): value is string => typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value))))];
  const imageUrls: Record<string, string> = {};
  if (ids.length) {
    const { data: assets, error: mediaError } = await supabase.from("media_assets").select("id,storage_path")
      .eq("wedding_id", wedding.id).eq("is_public", true).in("id", ids);
    if (mediaError) throw new Error("Unable to load public wedding media");
    if (assets?.length) {
      const urlsByPath = await getSignedMediaUrls(supabase, assets.map((asset) => asset.storage_path));
      for (const asset of assets) {
        const url = urlsByPath.get(asset.storage_path);
        if (url) imageUrls[asset.id] = url;
      }
    }
  }
  return { wedding, content, imageUrls };
});

export function getPublicWedding(weddingSlug?: string) {
  return loadWedding(weddingSlug ?? process.env.NEXT_PUBLIC_WEDDING_SLUG ?? "binh-minh-ninh-hue");
}
