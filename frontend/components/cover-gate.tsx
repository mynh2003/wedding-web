"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { loadElementFonts } from "@/lib/font-readiness";
import { prepareOpeningImage } from "@/lib/opening-readiness";
import envelopeTexture from "@/public/envelope-burgundy-weave.optimized.webp";
import waxSeal from "@/public/wax-seal-monogram-mh-384.optimized.webp";

const EXIT_DURATION = 1.15;
const BUTTON_FADE_DURATION = 0.3;

export function CoverGate({ guestName }: { guestName?: string }) {
  const title = useRef<HTMLHeadingElement>(null);
  const guest = useRef<HTMLDivElement>(null);
  const [fontsReady, setFontsReady] = useState(false);
  const [assetsReady, setAssetsReady] = useState(false);
  const [assetsFailed, setAssetsFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [coverRemoved, setCoverRemoved] = useState(false);
  const [heroReady, setHeroReady] = useState(false);
  const [imageReady, setImageReady] = useState(false);
  const [sealFaded, setSealFaded] = useState(false);
  const [phase, setPhase] = useState<"idle" | "fading" | "opening">("idle");
  const opening = phase === "opening";
  const reduceMotion = useReducedMotion();
  const ready = fontsReady && assetsReady && imageReady;
  const failed = assetsFailed;

  useEffect(() => {
    let active = true;
    setAssetsReady(false);
    setAssetsFailed(false);
    const page = document.querySelector<HTMLElement>(".mobile-landing");
    const images = page?.querySelectorAll<HTMLImageElement>(".hero-details img, .wedding-quote-section img") ?? [];
    if (attempt > 0) {
      for (const image of images) {
        if (image.complete && !image.naturalWidth) image.src = image.currentSrc || image.src;
      }
    }
    void Promise.all([
      loadElementFonts(page?.querySelectorAll<HTMLElement>(".hero-section h1, .hero-section p, .wedding-quote-section blockquote") ?? []),
      ...Array.from(images, prepareOpeningImage),
    ]).then(() => { if (active) setAssetsReady(true); })
      .catch(() => { if (active) setAssetsFailed(true); });
    return () => { active = false; };
  }, [attempt]);

  useEffect(() => {
    let active = true;
    const heading = title.current;
    if (heading) {
      void loadElementFonts([heading, ...heading.querySelectorAll<HTMLElement>("span"), ...guest.current?.querySelectorAll<HTMLElement>("p") ?? []])
        .then(() => { if (active) setFontsReady(true); });
    }
    return () => { active = false; };
  }, [guestName]);

  useEffect(() => {
    const page = document.querySelector<HTMLElement>(".mobile-landing");
    const previousBodyOverflow = document.body.style.overflow;
    const previousPageOverflowY = page?.style.overflowY ?? "";

    // Keep the document stationary and scroll the invitation frame itself.
    document.body.style.overflow = "hidden";
    if (page) page.style.overflowY = heroReady ? "scroll" : "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      if (page) page.style.overflowY = previousPageOverflowY;
    };
  }, [heroReady]);

  useEffect(() => {
    const markImageReady = () => setImageReady(true);
    window.addEventListener("wedding:hero-image-ready", markImageReady);
    if (document.querySelector('[data-hero-image-ready="true"]')) markImageReady();
    return () => window.removeEventListener("wedding:hero-image-ready", markImageReady);
  }, []);

  useEffect(() => {
    if (phase !== "fading" || !sealFaded || !imageReady) return;
    setPhase("opening");
    window.dispatchEvent(new Event("wedding:opened"));
  }, [phase, sealFaded, imageReady]);

  useEffect(() => {
    if (!opening) return;
    const timeout = window.setTimeout(() => setCoverRemoved(true), reduceMotion ? 30 : EXIT_DURATION * 1000);
    return () => window.clearTimeout(timeout);
  }, [opening, reduceMotion]);

  useEffect(() => {
    if (phase !== "fading") return;
    const timeout = window.setTimeout(() => setSealFaded(true), reduceMotion ? 0 : BUTTON_FADE_DURATION * 1000);
    return () => window.clearTimeout(timeout);
  }, [phase, reduceMotion]);

  useEffect(() => {
    const unlockScroll = () => setHeroReady(true);
    window.addEventListener("wedding:hero-ready", unlockScroll);
    return () => window.removeEventListener("wedding:hero-ready", unlockScroll);
  }, []);

  function openInvitation() {
    if (phase !== "idle" || !ready) return;
    // Start audio within the click gesture, before asynchronous reveal work.
    window.dispatchEvent(new Event("wedding:open-requested"));
    setPhase("fading");
  }

  return (
    <>
    <link rel="preload" as="image" href={envelopeTexture.src} fetchPriority="high" />
    <AnimatePresence onExitComplete={() => window.dispatchEvent(new Event("wedding:cover-cleared"))}>
      {!coverRemoved && (
        <motion.div
          className="mobile-cover fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-transparent text-center text-wine"
          style={{ "--envelope-texture": `url("${envelopeTexture.src}")` } as React.CSSProperties}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: reduceMotion ? 0 : .3 } }}
        >
          <motion.div
            className="envelope-panel envelope-panel-top pointer-events-none absolute left-0 top-0 z-20 w-full"
            initial={false}
            animate={opening ? { y: "-100%" } : { y: 0 }}
            transition={{ duration: reduceMotion ? 0 : EXIT_DURATION, ease: [0.65, 0, 0.35, 1] }}
          >
            <div className="envelope-top-shadow absolute inset-0" aria-hidden="true">
              <div className="envelope-fabric envelope-top-surface absolute inset-0" />
            </div>
            <div className="envelope-save-date absolute z-30 text-[#f1eadb]">
              <h1 ref={title} className="envelope-save-date-title" data-entrance-ready={fontsReady} style={{ visibility: fontsReady ? "visible" : "hidden" }} aria-label="Save the Date">
                <span className="envelope-save-word">SAVE</span>
                <span className="envelope-date-line"><span className="envelope-the-word">the</span><span className="envelope-date-word">DATE</span></span>
              </h1>
            </div>
            {guestName?.trim() && <div ref={guest} className="envelope-guest" style={{ visibility: fontsReady ? "visible" : "hidden" }}>
              <motion.div initial={{ opacity: 0, y: reduceMotion ? 0 : 14 }} animate={{ opacity: fontsReady ? 1 : 0, y: fontsReady || reduceMotion ? 0 : 14 }} transition={{ duration: reduceMotion ? 0 : .85, delay: reduceMotion ? 0 : .42 }}>
                <p className="envelope-guest-label">TRÂN TRỌNG KÍNH MỜI:</p>
                <p className="envelope-guest-name">{guestName.trim()}</p>
              </motion.div>
            </div>}
            <div className="pointer-events-auto absolute -bottom-9 left-1/2 z-40 -translate-x-1/2">
              <div className="envelope-seal-entrance" data-entrance-ready={fontsReady}>
              <motion.button
                onClick={openInvitation}
                disabled={phase !== "idle" || !ready}
                aria-busy={!ready && !failed}
                aria-describedby={ready || failed ? "invitation-loading-status" : undefined}
                initial={false}
                animate={phase === "idle" ? { opacity: 1, scale: 1 } : { opacity: 0, scale: .88 }}
                transition={{ duration: reduceMotion ? 0 : BUTTON_FADE_DURATION, ease: "easeOut" }}
                aria-label="Mở thiệp"
                title="Mở thiệp"
                className="type-button block h-[7.5rem] w-[7.5rem] rounded-full disabled:cursor-wait"
              >
                <Image src={waxSeal} alt="" width={384} height={384} sizes="120px" unoptimized priority className={`${phase === "idle" ? "envelope-seal-pulse " : ""}h-full w-full object-contain drop-shadow-[0_4px_6px_rgba(22,9,7,.4)]`} />
              </motion.button>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="envelope-panel envelope-panel-bottom absolute bottom-0 left-0 z-10 w-full"
            initial={false}
            animate={opening ? { y: "100%" } : { y: 0 }}
            transition={{ duration: reduceMotion ? 0 : EXIT_DURATION, ease: [0.65, 0, 0.35, 1] }}
          >
            <div className="envelope-fabric absolute inset-0" aria-hidden="true" />
          </motion.div>

          {phase === "idle" && (ready || failed) && <motion.div initial={{ opacity: 0, y: reduceMotion ? 0 : 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduceMotion ? 0 : .65, ease: [.22, 1, .36, 1] }} className="absolute inset-x-6 bottom-8 z-30 text-sm text-[#f1eadb]">
            <p id="invitation-loading-status" role="status" aria-live="polite" style={{ fontFamily: "var(--font-lora), Georgia, serif" }}>
              {failed ? "Tải thiệp chưa xong. Vui lòng thử lại." : "ẤN DẤU SÁP ĐỂ MỞ"}
            </p>
            {failed && <motion.button initial={{ opacity: 0, scale: reduceMotion ? 1 : .96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: reduceMotion ? 0 : .45, delay: reduceMotion ? 0 : .1 }} type="button" className="mt-2 rounded-full border border-current px-4 py-2" onClick={() => {
              setAttempt((value) => value + 1);
              window.dispatchEvent(new Event("wedding:preload-retry"));
            }}>Thử tải lại</motion.button>}
          </motion.div>}

        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}
