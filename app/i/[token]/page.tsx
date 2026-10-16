import { createClient } from "@/lib/supabase/server";
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
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("resolve_invitation_token", { input_token_hash: hashInvitationToken(token) }).maybeSingle();
  if (error || !data) notFound();
  return (
    <main className="grid min-h-screen place-items-center bg-cream px-6 text-center">
      <section className="w-full max-w-2xl rounded-3xl border border-wine/10 bg-white/60 px-7 py-16 shadow-soft md:px-16">
        <p className="text-xs uppercase tracking-[.35em] text-gold">Thiệp mời riêng</p>
        <p className="mt-8 font-display text-3xl italic text-wine">Trân trọng kính mời</p>
        <h1 className="mt-3 font-display text-5xl text-wine md:text-7xl">{data.guest_name}</h1>
        <p className="mx-auto mt-8 max-w-md text-sm leading-7 text-ink/65">đến chung vui trong ngày hạnh phúc của Bình Minh và Ninh Thị Huệ.</p>
        <p className="mt-8 text-xs uppercase tracking-[.25em] text-wine/60">Chủ Nhật · 22 tháng 11 năm 2026 · 09:30</p>
        <a href="/" className="mt-10 inline-flex rounded-full bg-wine px-6 py-3 text-sm font-semibold text-cream">Mở thiệp</a>
      </section>
    </main>
  );
}
