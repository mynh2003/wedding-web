"use client";

import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { loadElementFonts } from "@/lib/font-readiness";

export function HeroBanner({ groomName, brideName, date, imageUrl }: { groomName: string; brideName: string; date: string; imageUrl?: string | null }) {
  const section = useRef<HTMLElement>(null);
  const [fontsReady, setFontsReady] = useState(false);
  const [coverCleared, setCoverCleared] = useState(false);
  const [imageReady, setImageReady] = useState(false);
  const [started, setStarted] = useState(false);
  const [opening, setOpening] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    let active = true;
    setFontsReady(false);
    const elements = section.current?.querySelectorAll<HTMLElement>("h1, p") ?? [];
    void loadElementFonts(elements).then(() => { if (active) setFontsReady(true); });
    return () => { active = false; };
  }, [groomName, brideName, date]);

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
    if (coverCleared && imageReady && fontsReady) setStarted(true);
  }, [coverCleared, imageReady, fontsReady]);

  const textMotion = {
    initial: { opacity: 0, y: 22 },
    animate: started ? { opacity: 1, y: 0 } : { opacity: 0, y: 22 },
    transition: { duration: reduceMotion ? 0 : .75, ease: "easeOut" as const },
  };

  return (
    <section ref={section} aria-label="Thiệp cưới" data-hero-image-ready={imageReady} data-hero-fonts-ready={fontsReady} className="hero-section relative isolate w-full overflow-hidden bg-[#777] text-center text-white">
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
      <div className="absolute inset-0">
        <motion.p {...textMotion} transition={{ ...textMotion.transition, delay: reduceMotion ? 0 : .1 }} className="hero-wedding-title absolute inset-x-0 top-[5%] w-full whitespace-nowrap text-center font-flavinda text-[clamp(3.4rem,18cqw,4.9rem)] leading-[1.25] text-white">Wedding day</motion.p>
        <div className="hero-details absolute inset-x-6 bottom-[6%] flex flex-col items-center">
          <motion.h1 {...textMotion} transition={{ ...textMotion.transition, delay: reduceMotion ? 0 : .65 }} className="type-couple relative w-full text-center text-[clamp(2.125rem,10cqw,3rem)] font-bold uppercase text-white drop-shadow-md">
            <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-48 w-48 -translate-x-1/2 -translate-y-1/2 opacity-40">
              <Image src="/assets/Heart.png" alt="" fill sizes="192px" className="object-contain" />
            </span>
            <span className="relative z-10">{groomName}<br />{brideName}</span>
          </motion.h1>
          <motion.p {...textMotion} transition={{ ...textMotion.transition, delay: reduceMotion ? 0 : 1.05 }} onAnimationComplete={() => { if (started) window.dispatchEvent(new Event("wedding:hero-ready")); }} className="hero-wedding-date relative mt-8">{date}</motion.p>
        </div>
      </div>
    </section>
  );
}



