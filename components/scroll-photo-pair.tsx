"use client";

import Image from "next/image";
import { motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { useEffect, useRef } from "react";

export function ScrollPhotoPair({ images = [] }: { images?: (string | undefined)[] }) {
  const pairRef = useRef<HTMLDivElement>(null);
  const progress = useMotionValue(0);
  const reduceMotion = useReducedMotion();
  const leftY = useTransform(progress, [0, 1], [80, -80]);
  const rightY = useTransform(progress, [0, 1], [-80, 80]);

  useEffect(() => {
    const pair = pairRef.current;
    const scroller = pair?.closest<HTMLElement>(".mobile-landing");
    if (!pair || !scroller || reduceMotion) return;

    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const bounds = pair.getBoundingClientRect();
        const viewport = scroller.getBoundingClientRect();
        const travel = viewport.height + bounds.height;
        progress.set(Math.max(0, Math.min(1, (viewport.bottom - bounds.top) / Math.max(1, travel))));
      });
    };
    scroller.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
    return () => {
      cancelAnimationFrame(frame);
      scroller.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [progress, reduceMotion]);

  return (
    <div ref={pairRef} className="scroll-photo-pair" role="group" aria-label="Hai ảnh kỷ niệm của chúng mình">
      <motion.div className="scroll-photo-pair__frame" style={{ y: reduceMotion ? 0 : leftY }}>
        <div className="scroll-photo-pair__image">
          <Image src={images[0] || "/placeholders/ring-portrait.svg"} unoptimized={!!images[0]} alt="Khoảnh khắc tình yêu của đôi uyên ương" fill sizes="(max-width: 430px) 43vw, 180px" className="object-cover" />
        </div>
      </motion.div>
      <motion.div className="scroll-photo-pair__frame scroll-photo-pair__frame--right" style={{ y: reduceMotion ? 0 : rightY }}>
        <div className="scroll-photo-pair__image">
          <Image src={images[1] || "/placeholders/ring-detail.svg"} unoptimized={!!images[1]} alt="Chi tiết nhẫn cưới và lời hẹn ước" fill sizes="(max-width: 430px) 43vw, 180px" className="object-cover" />
        </div>
      </motion.div>
    </div>
  );
}
