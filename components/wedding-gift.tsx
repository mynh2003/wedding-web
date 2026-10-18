import { getPublicWedding } from "@/lib/wedding-public";
import { GiftDialog, type GiftRecipient } from "@/components/gift-dialog";

export async function WeddingGift({ variant, weddingSlug, groomName, brideName }: { variant?: "bride" | "groom"; weddingSlug?: string; groomName: string; brideName: string }) {
  const loaded = await getPublicWedding(weddingSlug);
  const content = loaded?.content.gifts ?? {};
  const imageUrls = loaded?.imageUrls ?? {};
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
