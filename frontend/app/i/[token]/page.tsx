import { resolveInvitation } from "@/lib/wedding-data";
import { WeddingPage } from "@/components/wedding-page";
import { hashInvitationToken, isInvitationToken } from "@/lib/invitations/token";
import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = { referrer: "no-referrer" };

export default async function PersonalInvitation({ params }: { params: Promise<{ token: string }> }) {
  noStore();
  const { token } = await params;
  if (!isInvitationToken(token)) notFound();
  const data = await resolveInvitation(hashInvitationToken(token));
  if (!data) notFound();
  if (data.guest_group !== "groom" && data.guest_group !== "bride") notFound();
  return <WeddingPage guestName={data.guest_name} variant={data.guest_group} weddingSlug={data.wedding_slug} invitationToken={token} />;
}
