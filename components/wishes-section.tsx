"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Wish = { id: string; author_name: string; message: string; created_at: string };
const slug = process.env.NEXT_PUBLIC_WEDDING_SLUG ?? "binh-minh-ninh-hue";

export function WishesSection() {
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [authorName, setAuthorName] = useState("");
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [toast, setToast] = useState<Wish | null>(null);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let active = true;
    void fetch("/api/wishes", { cache: "no-store" }).then((response) => response.json()).then((result: { data?: Wish[] }) => { if (active) setWishes(result.data ?? []); }).catch(() => undefined);
    const channel = supabase.channel("public-wishes").on("postgres_changes", { event: "INSERT", schema: "public", table: "public_wishes", filter: `wedding_slug=eq.${slug}` }, (payload) => {
      const wish = payload.new as Wish;
      setWishes((current) => current.some((item) => item.id === wish.id) ? current : [wish, ...current].slice(0, 50));
      if (document.visibilityState === "visible") { setToast(wish); window.setTimeout(() => setToast((current) => current?.id === wish.id ? null : current), 5000); }
    }).subscribe();
    return () => { active = false; void supabase.removeChannel(channel); };
  }, [supabase]);

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setNotice("");
    const response = await fetch("/api/wishes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ authorName, message }) });
    const result = await response.json() as { error?: string; message?: string };
    if (!response.ok) { setNotice(result.error ?? "Không thể gửi lời chúc."); return; }
    setAuthorName(""); setMessage(""); setNotice(result.message ?? "Đã gửi lời chúc.");
  }

  return <div className="relative">
    {toast && <div role="status" aria-live="polite" className="fixed right-4 top-4 z-50 max-w-xs rounded-xl border border-gold/40 bg-cream px-4 py-3 text-sm text-ink shadow-xl"><p className="font-semibold text-wine">Lời chúc mới vừa được duyệt</p><p className="mt-1 line-clamp-2">{toast.author_name}: {toast.message}</p></div>}
    <form onSubmit={submit} className="rounded-2xl border border-wine/10 bg-white/50 p-6 text-left shadow-soft">
      <label className="text-xs font-semibold uppercase tracking-[.2em] text-wine/60">Tên của bạn<input value={authorName} onChange={(event) => setAuthorName(event.target.value)} required maxLength={120} className="mt-3 w-full rounded-lg border border-wine/10 bg-cream px-4 py-3 text-sm outline-none" placeholder="Nguyễn An" /></label>
      <label className="mt-6 block text-xs font-semibold uppercase tracking-[.2em] text-wine/60">Lời chúc<textarea value={message} onChange={(event) => setMessage(event.target.value)} required maxLength={2000} rows={4} className="mt-3 w-full resize-none rounded-lg border border-wine/10 bg-cream px-4 py-3 text-sm outline-none" placeholder="Chúc hai bạn trăm năm hạnh phúc..." /></label>
      <button className="mt-6 w-full rounded-full bg-wine px-6 py-3 text-sm font-semibold text-cream transition hover:bg-ink">Gửi lời chúc</button>
      {notice && <p role="status" className="mt-4 text-center text-sm text-ink/65">{notice}</p>}
    </form>
    {wishes.length > 0 && <div className="mt-10 space-y-3 text-left"><p className="text-xs uppercase tracking-[.2em] text-wine/50">Những lời chúc đã được gửi</p>{wishes.slice(0, 6).map((wish) => <article key={wish.id} className="rounded-xl border border-wine/10 bg-white/50 p-5"><p className="font-semibold text-wine">{wish.author_name}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-ink/70">{wish.message}</p></article>)}</div>}
  </div>;
}
