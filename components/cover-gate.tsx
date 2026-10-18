"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { useEffect, useState } from "react";

const EXIT_DURATION = 1.15;
const BUTTON_FADE_DURATION = 0.3;

export function CoverGate() {
  const [coverRemoved, setCoverRemoved] = useState(false);
  const [heroReady, setHeroReady] = useState(false);
  const [imageReady, setImageReady] = useState(false);
  const [sealFaded, setSealFaded] = useState(false);
  const [phase, setPhase] = useState<"idle" | "fading" | "opening">("idle");
  const opening = phase === "opening";
  const reduceMotion = useReducedMotion();

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
    if (phase !== "idle") return;
    setPhase("fading");
  }

  return (
    <AnimatePresence onExitComplete={() => window.dispatchEvent(new Event("wedding:cover-cleared"))}>
      {!coverRemoved && (
        <motion.div
          className="mobile-cover fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-transparent text-center text-wine"
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
              <h1 className="envelope-save-date-title" aria-label="Save the Date">
                <span className="envelope-save-word">SAVE</span>
                <span className="envelope-date-line"><span className="envelope-the-word">the</span><span className="envelope-date-word">DATE</span></span>
              </h1>
            </div>
            <div className="pointer-events-auto absolute -bottom-9 left-1/2 z-40 -translate-x-1/2">
              <div className="envelope-seal-entrance">
              <motion.button
                onClick={openInvitation}
                disabled={phase !== "idle"}
                initial={false}
                animate={phase === "idle" ? { opacity: 1, scale: 1 } : { opacity: 0, scale: .88 }}
                transition={{ duration: reduceMotion ? 0 : BUTTON_FADE_DURATION, ease: "easeOut" }}
                aria-label="Mở thiệp"
                title="Mở thiệp"
                className="type-button block h-[7.5rem] w-[7.5rem] rounded-full disabled:cursor-wait"
              >
                <Image src="/wax-seal-monogram-mh.png" alt="" width={1254} height={1254} priority className={`${phase === "idle" ? "envelope-seal-pulse " : ""}h-full w-full object-contain drop-shadow-[0_4px_6px_rgba(22,9,7,.4)]`} />
              </motion.button>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="envelope-panel envelope-panel-bottom absolute bottom-0 left-0 z-10 w-full"
            initial={false}
            animate={opening ? { y: "100%" } : { y: 0 }}
            transition={{ duration: reduceMotion ? 0 : EXIT_DURATION, ease: [0.65, 0, 0.35, 1] }}
            aria-hidden="true"
          >
            <div className="envelope-fabric absolute inset-0" />
          </motion.div>

        </motion.div>
      )}
    </AnimatePresence>
  );
}
