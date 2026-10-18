import { createClient } from "@/lib/supabase/server";
import { GiftDialog, type GiftRecipient } from "@/components/gift-dialog";

export async function WeddingGift({ variant, weddingSlug, groomName, brideName }: { variant?: "bride" | "groom"; weddingSlug?: string; groomName: string; brideName: string }) {
  let content: Record<string, unknown> = {};
  const imageUrls: Record<string, string> = {};
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    const supabase = await createClient();
    const { data: wedding } = await supabase.from("weddings").select("id").eq("slug", weddingSlug ?? process.env.NEXT_PUBLIC_WEDDING_SLUG ?? "binh-minh-ninh-hue").eq("is_published", true).maybeSingle();
    if (wedding) {
      const [{ data: giftContent }, { data: allAssets }] = await Promise.all([
        supabase.from("wedding_content").select("content").eq("wedding_id", wedding.id).eq("section_key", "gifts").eq("is_published", true).maybeSingle(),
        supabase.from("media_assets").select("id, storage_path").eq("wedding_id", wedding.id).eq("is_public", true),
      ]);
      content = (giftContent?.content ?? {}) as Record<string, unknown>;
      const ids = [content.groom_qr_media_id, content.bride_qr_media_id, content.gift_banner_media_id, content.groom_banner_media_id, content.bride_banner_media_id].filter((id): id is string => typeof id === "string");
      await Promise.all(ids.map(async (id) => {
        const asset = allAssets?.find((item) => item.id === id);
        if (!asset) return;
        const { data: signed } = await supabase.storage.from("wedding-private").createSignedUrl(asset.storage_path, 3600);
        if (signed?.signedUrl) imageUrls[id] = signed.signedUrl;
      }));
    }
  }
  const text = (key: string) => typeof content[key] === "string" ? (content[key] as string).trim() : "";
  const image = (key: string) => { const value = text(key); return /^(https:\/\/|\/(?!\/))/.test(value) ? value : ""; };
  const sharedBanner = imageUrls[text("gift_banner_media_id")] || image("gift_banner_url") || imageUrls[text("groom_banner_media_id")] || imageUrls[text("bride_banner_media_id")] || image("groom_banner_url") || image("bride_banner_url") || "/placeholders/ring-wide.svg";
  const recipients: GiftRecipient[] = (variant ? [variant] : ["groom", "bride"] as const).map((side) => ({
    side, name: side === "bride" ? brideName : groomName,
    banner: sharedBanner,
    qr: imageUrls[text(`${side}_qr_media_id`)] || image(`${side}_qr_url`), bank: text(`${side}_bank_name`),
    accountName: text(`${side}_account_name`) || (side === "bride" ? brideName : groomName),
    accountNumber: text(`${side}_account_number`),
  }));
  return <GiftDialog recipients={recipients} />;
}
