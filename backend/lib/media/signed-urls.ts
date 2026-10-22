import type { SupabaseClient } from "@supabase/supabase-js";

const SIGNED_URL_LIFETIME_SECONDS = 3600;

// Sign a batch once, including when several media records share the same file.
// URLs are intentionally not cached beyond the current request.
export async function getSignedMediaUrls(client: Pick<SupabaseClient, "storage">, paths: string[]) {
  const uniquePaths = [...new Set(paths)];
  const urls = new Map<string, string>();
  if (!uniquePaths.length) return urls;

  const { data } = await client.storage.from("wedding-private")
    .createSignedUrls(uniquePaths, SIGNED_URL_LIFETIME_SECONDS);
  for (const item of data ?? []) {
    if (!item.error && item.path && item.signedUrl) urls.set(item.path, item.signedUrl);
  }
  return urls;
}
