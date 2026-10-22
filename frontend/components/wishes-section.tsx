"use client";

import { publicApiFetch } from "@/lib/http/public-api";
import { defaultInvitationCopy } from "@/lib/invitation-copy";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { observePublicWishes } from "@/lib/public-wishes-client";
import { nextTickerWish, sameWishes, type PublicWish as Wish } from "@/lib/wish-ticker";

function WishTicker({ wishes, variant, active }: { wishes: Wish[]; variant?: "groom" | "bride"; active: boolean }) {
  const track = useRef<HTMLDivElement>(null);
  const latest = useRef(wishes);
  const seen = useRef(new Set(wishes.slice(0, 2).map((wish) => wish.id)));
  const [slots, setSlots] = useState(() => [wishes[0], wishes[1] ?? wishes[0]]);
  const reduceMotion = useReducedMotion();
  const activeRef = useRef(active);
  const runningAnimation = useRef<Animation | null>(null);

  useLayoutEffect(() => {
    activeRef.current = active;
    const animation = runningAnimation.current;
    if (!animation) return;
    if (!active || document.hidden) animation.pause();
    else animation.play();
  }, [active]);

  useEffect(() => {
    latest.current = wishes;
  }, [wishes]);

  useLayoutEffect(() => {
    const element = track.current;
    if (!element || reduceMotion) return;
    let cancelled = false;
    let animation: Animation | undefined;
    // Measure after fonts settle so the first run uses the final text width.
    void document.fonts.ready.then(() => {
      if (cancelled) return;
      const width = element.firstElementChild!.getBoundingClientRect().width;
      if (width <= 0) return;
      const viewportWidth = Math.max(430, element.parentElement?.clientWidth ?? 0);
      const bufferedWidth = Array.from(element.children).slice(1)
        .reduce((total, child) => total + child.getBoundingClientRect().width, 0);
      // Natural-width messages can be shorter than the viewport. Queue enough
      // items to cover the frame even when the first item has fully exited.
      if (bufferedWidth < viewportWidth) {
        setSlots([...slots, nextTickerWish(latest.current, seen.current, slots[slots.length - 1].id)]);
        return;
      }
      animation = element.animate([
        { transform: "translateX(0)" },
        { transform: `translateX(-${width}px)` },
      ], { duration: width / 40 * 1000, easing: "linear", fill: "forwards" });
      runningAnimation.current = animation;
      animation.onfinish = () => {
        if (cancelled || latest.current.length === 0) return;
        // Promote the already-visible remaining slots unchanged. Only append new
        // content beyond the viewport, keeping both text and velocity stable.
        setSlots([...slots.slice(1), nextTickerWish(latest.current, seen.current, slots[slots.length - 1].id)]);
      };
      const pauseWhenHidden = () => {
        if (!activeRef.current || document.hidden) animation?.pause();
        else animation?.play();
      };
      pauseWhenHidden();
      document.addEventListener("visibilitychange", pauseWhenHidden);
      removeVisibilityListener = () => document.removeEventListener("visibilitychange", pauseWhenHidden);
    });
    let removeVisibilityListener = () => {};
    return () => { cancelled = true; animation?.cancel(); runningAnimation.current = null; removeVisibilityListener(); };
  }, [slots, reduceMotion]);

  return <div ref={track} className={`wish-scroll-message flex w-max shrink-0 items-center whitespace-nowrap font-serif ${variant === "bride" ? "text-[#ffd1dc]" : variant === "groom" ? "text-[#f4d7a1]" : "text-cream"}`}>
      {(reduceMotion ? wishes : slots).map((wish, index) => <span key={index} className="inline-flex shrink-0 items-center gap-4 pr-4">
        <span>{wish.author_name}{wish.side === "groom" ? " (Nhà trai)" : wish.side === "bride" ? " (Nhà gái)" : ""}: {wish.message}</span>
        <span aria-hidden="true" className="inline-flex h-8 w-8 shrink-0 items-center justify-center"><Image src={wish.side === "bride" ? "/assets/monogram-mh-bride.optimized.webp" : wish.side === "groom" ? "/assets/monogram-mh-groom.optimized.webp" : "/assets/monogram-mh-preview.optimized.webp"} alt="" width={24} height={24} /></span>
      </span>)}
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
  const showTicker = invitationOpened && heroScrolledOut && scrollingUp;

  useEffect(() => {
    const revealToast = () => setInvitationOpened(true);
    window.addEventListener("wedding:cover-cleared", revealToast);
    return () => window.removeEventListener("wedding:cover-cleared", revealToast);
  }, []);

  useEffect(() => {
    if (!invitationOpened) return;
    const hero = document.querySelector<HTMLElement>(".hero-section");
    if (!hero) return;
    const scrollContainer = document.querySelector<HTMLElement>(".mobile-landing");
    let previousScrollTop = scrollContainer?.scrollTop ?? window.scrollY;
    let frame: number | undefined;
    const updateScroll = () => {
      frame = undefined;
      const scrollTop = Math.max(0, scrollContainer?.scrollTop ?? window.scrollY);
      if (Math.abs(scrollTop - previousScrollTop) >= 4) {
        setScrollingUp(scrollTop < previousScrollTop);
        previousScrollTop = scrollTop;
      }
      updateHeroVisibility();
    };
    const trackScroll = () => {
      if (frame === undefined) frame = window.requestAnimationFrame(updateScroll);
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
      if (frame !== undefined) window.cancelAnimationFrame(frame);
      scrollTarget.removeEventListener("scroll", trackScroll);
      window.removeEventListener("resize", updateHeroVisibility);
    };
  }, [invitationOpened]);

  useEffect(() => {
    if (!invitationOpened) return;
    return observePublicWishes((next) => setWishes((previous) => sameWishes(previous, next) ? previous : next));
  }, [invitationOpened]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setNotice(""); setSubmitting(true);
    try {
      const response = await publicApiFetch("/api/wishes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ authorName, message, side: variant, attendance, invitationToken }) });
      const result = await response.json() as { error?: string; message?: string };
      if (!response.ok) { setNotice(result.error ?? "Không thể gửi lời chúc."); return; }
      setAuthorName(""); setMessage(""); setNotice(result.message ?? "Lời chúc đã được gửi thành công. Cảm ơn bạn đã gửi lời chúc đến chúng mình!");
    } catch { setNotice("Không thể kết nối. Vui lòng thử lại."); }
    finally { setSubmitting(false); }
  }

  return <div className="relative">
    <p className="mx-auto mb-10 max-w-[377px] whitespace-pre-line break-words text-center wedding-description invitation-copy text-[16px] font-normal leading-[1.4] text-wine">{introduction}</p>
    {wishes.length > 0 && typeof document !== "undefined" && createPortal(
      <motion.div initial={false} animate={{ opacity: showTicker ? 1 : 0, y: showTicker || reduceMotion ? 0 : -48 }} transition={{ duration: reduceMotion ? 0 : .38, ease: [.22, 1, .36, 1] }} aria-hidden={!showTicker} inert={!showTicker} style={{ pointerEvents: showTicker ? "auto" : "none" }} role="status" aria-live="off" className={`fixed inset-x-0 top-0 z-[100] mx-auto w-full max-w-[430px] overflow-hidden bg-wine text-[13px] shadow-[0_5px_18px_rgba(56,18,18,0.35)]`}>
        <div tabIndex={reduceMotion ? 0 : undefined} aria-label="Lời chúc từ khách mời" className={`flex h-9 items-center ${reduceMotion ? "overflow-x-auto" : "overflow-hidden"}`}>
          <WishTicker wishes={wishes} variant={variant} active={showTicker} />
        </div>
      </motion.div>,
      document.body,
    )}
    <form onSubmit={submit} className="wish-form text-left">
      <div className="relative">
        <input id="wish-author" value={authorName} onChange={(event) => setAuthorName(event.target.value)} required maxLength={120} placeholder=" " className="peer h-12 w-full rounded-[20px] border border-wine bg-cream px-4 py-3 font-serif text-sm text-wine outline-none transition-colors focus:border-wine" />
        <label htmlFor="wish-author" className="pointer-events-none absolute left-3 top-1/2 origin-left wish-floating-label px-1 -translate-y-1/2 font-serif text-sm text-wine transition-all duration-200 ease-out peer-focus:top-0 peer-focus:left-3 peer-focus:text-xs peer-focus:text-wine peer-[&:not(:placeholder-shown)]:top-0 peer-[&:not(:placeholder-shown)]:left-3 peer-[&:not(:placeholder-shown)]:text-xs">Tên của bạn</label>
      </div>
      <div className="relative mt-3">
        <textarea id="wish-message" value={message} onChange={(event) => setMessage(event.target.value)} required maxLength={2000} rows={4} placeholder=" " className="peer w-full resize-none rounded-[20px] border border-wine bg-cream px-4 pb-3 pt-6 font-serif text-sm text-wine outline-none transition-colors focus:border-wine" />
        <label htmlFor="wish-message" className="pointer-events-none absolute left-3 top-5 origin-left wish-floating-label px-1 -translate-y-1/2 font-serif text-sm text-wine transition-all duration-200 ease-out peer-focus:top-0 peer-focus:left-3 peer-focus:text-xs peer-focus:text-wine peer-[&:not(:placeholder-shown)]:top-0 peer-[&:not(:placeholder-shown)]:left-3 peer-[&:not(:placeholder-shown)]:text-xs">Lời chúc</label>
      </div>
      <div className="relative mt-3">
        <select id="wish-attendance" aria-label="Bạn sẽ tham dự chứ?" value={attendance} onChange={(event) => setAttendance(event.target.value)} required className="block w-full appearance-none rounded-[20px] border border-wine bg-cream py-3 pl-4 pr-12 font-serif text-sm text-wine outline-none transition-colors focus:border-wine">
        <option value="" disabled>Bạn sẽ tham dự chứ?</option>
        <option value="attending">Mình chắc chắn sẽ đến!</option>
        <option value="not-attending">Xin lỗi mình bận rồi!</option>
        </select>
        <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-wine"><path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </div>
      <button disabled={submitting} className="button-outline mt-6 w-full !font-serif text-base">{submitting ? "Đang gửi…" : "Gửi lời chúc"}</button>
      {notice && <p role="status" className="mx-auto mt-4 max-w-[377px] whitespace-pre-line break-words text-center wedding-description invitation-copy text-[16px] font-normal leading-[1.4] text-wine">{notice}</p>}
    </form>
    {gift}
  </div>;
}
