"use client";

import { publicApiFetch } from "@/lib/http/public-api";
import { defaultInvitationCopy } from "@/lib/invitation-copy";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

type Wish = { id: string; author_name: string; message: string; created_at: string; side?: "groom" | "bride" | null };

function WishTicker({ wishes, variant }: { wishes: Wish[]; variant?: "groom" | "bride" }) {
  const group = useRef<HTMLDivElement>(null);
  const [groupWidth, setGroupWidth] = useState(430);
  const repeatedWishes = Array.from({ length: Math.max(3, wishes.length) }, (_, index) => wishes[index % wishes.length]);

  useEffect(() => {
    if (!group.current) return;
    const observer = new ResizeObserver(([entry]) => setGroupWidth(entry.contentRect.width));
    observer.observe(group.current);
    return () => observer.disconnect();
  }, []);

  return <div className={`wish-scroll-message flex w-max shrink-0 items-center whitespace-nowrap font-serif ${variant === "bride" ? "text-[#ffd1dc]" : variant === "groom" ? "text-[#f4d7a1]" : "text-cream"}`} style={{ animationDuration: `${Math.max(10, groupWidth / 40)}s` }}>
    {[0, 1].map((copy) => <div key={copy} ref={copy === 0 ? group : undefined} aria-hidden={copy === 1 ? true : undefined} className="flex min-w-[430px] shrink-0 items-center justify-around">
      {repeatedWishes.map((wish, index) => <span key={`${wish.id}-${index}`} aria-hidden={index >= wishes.length ? true : undefined} className="inline-flex shrink-0 items-center">
        <span className="px-5">{wish.author_name}{wish.side === "groom" ? " (Nhà trai)" : wish.side === "bride" ? " (Nhà gái)" : ""}: {wish.message}</span>
        <span aria-hidden="true" className="inline-flex h-8 w-8 shrink-0 items-center justify-center"><Image src={variant === "bride" ? "/assets/monogram-mh-bride.png" : variant === "groom" ? "/assets/monogram-mh-groom.png" : "/assets/monogram-mh-preview.png"} alt="" width={24} height={24} /></span>
      </span>)}
    </div>)}
  </div>;
}

export function WishesSection({ gift, variant, invitationToken, introduction = defaultInvitationCopy.rsvp_text }: { gift?: React.ReactNode; variant?: "groom" | "bride"; invitationToken?: string; introduction?: string }) {
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [authorName, setAuthorName] = useState("");
  const [attendance, setAttendance] = useState("");
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [invitationOpened, setInvitationOpened] = useState(false);
  const [heroScrolledOut, setHeroScrolledOut] = useState(false);
  const [scrollingUp, setScrollingUp] = useState(false);
  const reduceMotion = useReducedMotion();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const revealToast = () => setInvitationOpened(true);
    window.addEventListener("wedding:cover-cleared", revealToast);
    return () => window.removeEventListener("wedding:cover-cleared", revealToast);
  }, []);

  useEffect(() => {
    const hero = document.querySelector<HTMLElement>(".hero-section");
    if (!hero) return;
    const scrollContainer = document.querySelector<HTMLElement>(".mobile-landing");
    let previousScrollTop = scrollContainer?.scrollTop ?? window.scrollY;
    const trackScroll = () => {
      const scrollTop = Math.max(0, scrollContainer?.scrollTop ?? window.scrollY);
      if (Math.abs(scrollTop - previousScrollTop) >= 4) {
        setScrollingUp(scrollTop < previousScrollTop);
        previousScrollTop = scrollTop;
      }
      updateHeroVisibility();
    };
    const updateHeroVisibility = () => {
      const viewportTop = Math.max(0, scrollContainer?.getBoundingClientRect().top ?? 0);
      setHeroScrolledOut(hero.getBoundingClientRect().bottom <= viewportTop);
    };
    const scrollTarget = scrollContainer ?? window;
    scrollTarget.addEventListener("scroll", trackScroll, { passive: true });
    window.addEventListener("resize", updateHeroVisibility);
    const observer = new ResizeObserver(updateHeroVisibility);
    observer.observe(hero);
    if (scrollContainer) observer.observe(scrollContainer);
    updateHeroVisibility();
    return () => {
      observer.disconnect();
      scrollTarget.removeEventListener("scroll", trackScroll);
      window.removeEventListener("resize", updateHeroVisibility);
    };
  }, []);

  useEffect(() => {
    let active = true;
    let revision = 0;
    const reloadWishes = async () => {
      const currentRevision = ++revision;
      try {
        const response = await publicApiFetch("/api/wishes", { cache: "no-store" });
        if (!response.ok) return;
        const result = await response.json() as { data?: Wish[] };
        if (active && currentRevision === revision) setWishes(result.data ?? []);
      } catch { /* Reconnect and focus will retry loading the current public list. */ }
    };
    void reloadWishes();
    // DELETE events cannot be filtered by wedding_slug; reload the scoped API list.
    const channel = supabase.channel("public-wishes").on("postgres_changes", { event: "*", schema: "public", table: "public_wishes" }, () => { void reloadWishes(); }).subscribe((status) => {
      if (status === "SUBSCRIBED") void reloadWishes();
    });
    window.addEventListener("focus", reloadWishes);
    return () => { active = false; window.removeEventListener("focus", reloadWishes); void supabase.removeChannel(channel); };
  }, [supabase]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setNotice(""); setSubmitting(true);
    try {
      const response = await publicApiFetch("/api/wishes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ authorName, message, side: variant, attendance, invitationToken }) });
      const result = await response.json() as { error?: string; message?: string };
      if (!response.ok) { setNotice(result.error ?? "Không thể gửi lời chúc."); return; }
      setAuthorName(""); setMessage(""); setNotice(result.message ?? "Đã gửi lời chúc.");
    } catch { setNotice("Không thể kết nối. Vui lòng thử lại."); }
    finally { setSubmitting(false); }
  }

  return <div className="relative">
    <p className="mx-auto mb-10 max-w-[377px] whitespace-pre-line break-words text-center wedding-description invitation-copy text-[16px] font-normal leading-[1.4] text-wine">{introduction}</p>
    {wishes.length > 0 && typeof document !== "undefined" && createPortal(
      <AnimatePresence>
      {invitationOpened && heroScrolledOut && scrollingUp && <motion.div initial={{ opacity: 0, y: reduceMotion ? 0 : -48 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduceMotion ? 0 : -48 }} transition={{ duration: reduceMotion ? 0 : .38, ease: [.22, 1, .36, 1] }} role="status" aria-live="off" className={`fixed inset-x-0 top-0 z-[100] mx-auto w-full max-w-[430px] overflow-hidden bg-wine text-[13px] shadow-[0_5px_18px_rgba(56,18,18,0.35)]`}>
        <div className="flex h-9 items-center overflow-hidden">
          <WishTicker wishes={wishes} variant={variant} />
        </div>
      </motion.div>}
      </AnimatePresence>,
      document.body,
    )}
    <form onSubmit={submit} className="text-left">
      <div className="relative">
        <input id="wish-author" value={authorName} onChange={(event) => setAuthorName(event.target.value)} required maxLength={120} placeholder=" " className="peer h-12 w-full rounded-[20px] border border-wine bg-cream px-4 py-3 font-serif text-sm outline-none transition-colors focus:border-wine" />
        <label htmlFor="wish-author" className="pointer-events-none absolute left-3 top-1/2 origin-left wish-floating-label px-1 -translate-y-1/2 font-serif text-sm text-wine transition-all duration-200 ease-out peer-focus:top-0 peer-focus:left-3 peer-focus:text-xs peer-focus:text-wine peer-[&:not(:placeholder-shown)]:top-0 peer-[&:not(:placeholder-shown)]:left-3 peer-[&:not(:placeholder-shown)]:text-xs">Tên của bạn</label>
      </div>
      <div className="relative mt-3">
        <textarea id="wish-message" value={message} onChange={(event) => setMessage(event.target.value)} required maxLength={2000} rows={4} placeholder=" " className="peer w-full resize-none rounded-[20px] border border-wine bg-cream px-4 pb-3 pt-6 font-serif text-sm outline-none transition-colors focus:border-wine" />
        <label htmlFor="wish-message" className="pointer-events-none absolute left-3 top-5 origin-left wish-floating-label px-1 -translate-y-1/2 font-serif text-sm text-wine transition-all duration-200 ease-out peer-focus:top-0 peer-focus:left-3 peer-focus:text-xs peer-focus:text-wine peer-[&:not(:placeholder-shown)]:top-0 peer-[&:not(:placeholder-shown)]:left-3 peer-[&:not(:placeholder-shown)]:text-xs">Lời chúc</label>
      </div>
      <div className="relative mt-3">
        <select id="wish-attendance" aria-label="Bạn sẽ tham dự chứ?" value={attendance} onChange={(event) => setAttendance(event.target.value)} required className={`block w-full appearance-none rounded-[20px] border border-wine bg-cream py-3 pl-4 pr-12 font-serif text-sm outline-none transition-colors focus:border-wine ${attendance ? "text-ink" : "text-wine"}`}>
        <option value="" disabled>Bạn sẽ tham dự chứ?</option>
        <option value="attending">Mình chắc chắn sẽ đến!</option>
        <option value="not-attending">Xin lỗi mình bận rồi!</option>
        </select>
        <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-wine"><path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </div>
      <button disabled={submitting} className="button-outline mt-6 w-full !font-serif text-base">{submitting ? "Đang gửi…" : "Gửi lời chúc"}</button>
      {notice && <p role="status" className="mt-4 text-center text-base text-ink/65">{notice}</p>}
    </form>
    {wishes.length > 0 && <div className="mt-10 space-y-3 text-left"><p className="text-[13px] uppercase tracking-[.05em] text-wine/50">Những lời chúc đã được gửi</p>{wishes.slice(0, 6).map((wish) => <article key={wish.id} className="rounded-xl border border-wine/10 cream-paper p-5"><p className="font-semibold text-wine">{wish.author_name}</p><p className="wedding-description mt-2 whitespace-pre-wrap text-ink/70">{wish.message}</p></article>)}</div>}
    {gift}
  </div>;
}
