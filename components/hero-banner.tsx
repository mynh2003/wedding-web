"use client";

import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { useEffect, useState } from "react";

const TEXT_SEQUENCE_MS = 2200;

export function HeroBanner({ groomName, brideName, date, imageUrl }: { groomName: string; brideName: string; date: string; imageUrl?: string | null }) {
  const [coverCleared, setCoverCleared] = useState(false);
  const [imageReady, setImageReady] = useState(false);
  const [started, setStarted] = useState(false);
  const [opening, setOpening] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const revealImage = () => setOpening(true);
    window.addEventListener("wedding:opened", revealImage);
    return () => window.removeEventListener("wedding:opened", revealImage);
  }, []);

  useEffect(() => {
    if (imageReady) window.dispatchEvent(new Event("wedding:hero-image-ready"));
  }, [imageReady]);

  useEffect(() => {
    const startHeroText = () => setCoverCleared(true);
    window.addEventListener("wedding:cover-cleared", startHeroText);
    return () => window.removeEventListener("wedding:cover-cleared", startHeroText);
  }, []);

  useEffect(() => {
    if (coverCleared && imageReady) setStarted(true);
  }, [coverCleared, imageReady]);

  useEffect(() => {
    if (!started) return;
    const timeout = window.setTimeout(() => window.dispatchEvent(new Event("wedding:hero-ready")), reduceMotion ? 0 : TEXT_SEQUENCE_MS);
    return () => window.clearTimeout(timeout);
  }, [started, reduceMotion]);

  const textMotion = {
    initial: { opacity: 0, y: 22 },
    animate: started ? { opacity: 1, y: 0 } : { opacity: 0, y: 22 },
    transition: { duration: reduceMotion ? 0 : .75, ease: "easeOut" as const },
  };

  return (
    <section aria-label="Thiệp cưới" data-hero-image-ready={imageReady} className="hero-section relative isolate flex aspect-[9/16] w-full items-center justify-center overflow-hidden bg-[#777] px-6 py-20 text-center text-white">
      <motion.div
        className="absolute inset-0 -z-20"
        initial={false}
        animate={{ filter: opening ? "blur(0px)" : "blur(12px)", scale: opening ? 1 : 1.04 }}
        transition={{ duration: reduceMotion ? 0 : 1.15, ease: "easeOut" }}
      >
      <Image
        src={!imageFailed && imageUrl ? imageUrl : "/placeholders/hero-gray.svg"}
        alt=""
        fill
        priority
        sizes="(max-width: 430px) 100vw, 430px"
        className="object-cover"
        onLoad={async (event) => {
          const image = event.currentTarget;
          await image.decode().catch(() => {});
          setImageReady(true);
        }}
        onError={() => {
          if (!imageFailed && imageUrl) setImageFailed(true);
          else setImageReady(true);
        }}
      />
      </motion.div>
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-b from-black/15 via-black/5 to-black/25" />
      <div className="relative flex w-full max-w-md flex-col items-center">
        <motion.p {...textMotion} transition={{ ...textMotion.transition, delay: .1 }} className="relative -top-[3svh] w-[calc(100%+1rem)] whitespace-nowrap text-center font-flavinda text-[clamp(2.65rem,14vw,3.75rem)] leading-[1.25] text-white">Wedding Day</motion.p>
        <div className="relative top-6 mt-auto pt-[40svh]">
          <motion.h1 {...textMotion} transition={{ ...textMotion.transition, delay: .65 }} className="type-couple relative w-full text-center text-[clamp(2.125rem,10vw,3rem)] font-bold uppercase text-white drop-shadow-md">
            <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-48 w-48 -translate-x-1/2 -translate-y-1/2 opacity-40">
              <Image src="/assets/Heart.png" alt="" fill sizes="192px" className="object-contain" />
            </span>
            <span className="relative z-10">{groomName}<br />{brideName}</span>
          </motion.h1>
        </div>
        <motion.p {...textMotion} transition={{ ...textMotion.transition, delay: 1.05 }} className="hero-wedding-date relative top-6 mt-8">{date}</motion.p>
      </div>
    </section>
  );
}



