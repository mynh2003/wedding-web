import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

// React cache shares this work within one render only. Published content and
// signed URLs are refreshed on the next request, including personalized links.
const loadWedding = cache(async (slug: string) => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) return null;
  const supabase = await createClient();
  const { data: wedding } = await supabase.from("weddings")
    .select("id,groom_name,bride_name,wedding_date")
    .eq("slug", slug).eq("is_published", true).maybeSingle();
  if (!wedding) return null;

  const { data: rows } = await supabase.from("wedding_content")
    .select("section_key,content").eq("wedding_id", wedding.id).eq("is_published", true);
  const content = Object.fromEntries((rows ?? []).map((row) => [row.section_key, row.content ?? {}])) as Record<string, Record<string, unknown>>;
  const ids = [...new Set(Object.values(content).flatMap((section) => Object.values(section)
    .filter((value): value is string => typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value))))];
  const imageUrls: Record<string, string> = {};
  if (ids.length) {
    const { data: assets } = await supabase.from("media_assets").select("id,storage_path")
      .eq("wedding_id", wedding.id).eq("is_public", true).in("id", ids);
    if (assets?.length) {
      const paths = [...new Set(assets.map((asset) => asset.storage_path))];
      const { data: signed } = await supabase.storage.from("wedding-private").createSignedUrls(paths, 3600);
      const urlsByPath = new Map((signed ?? []).filter((item) => !item.error && item.signedUrl)
        .map((item) => [item.path, item.signedUrl]));
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
