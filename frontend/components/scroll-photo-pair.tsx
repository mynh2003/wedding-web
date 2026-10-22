"use client";


import { motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { useEffect, useRef } from "react";
import { ProgressiveImage as Image, ScrollZoom } from "@/components/scroll-zoom";
import { Reveal } from "@/components/reveal";

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
    <div ref={pairRef} className="scroll-photo-pair" data-image-preload-group role="group" aria-label="Hai ảnh kỷ niệm của chúng mình">
      <motion.div className="scroll-photo-pair__frame" style={{ y: reduceMotion ? 0 : leftY }}>
        <Reveal effect="image" className="scroll-photo-pair__image" viewportInset={0}>
          <ScrollZoom>
          <Image src={images[0] || "/placeholders/image.svg"} alt="Khoảnh khắc tình yêu của đôi uyên ương" fill loading="eager" sizes="(max-width: 430px) 43vw, 180px" className="object-cover" />
          </ScrollZoom>
        </Reveal>
      </motion.div>
      <motion.div className="scroll-photo-pair__frame scroll-photo-pair__frame--right" style={{ y: reduceMotion ? 0 : rightY }}>
        <Reveal effect="image" className="scroll-photo-pair__image" viewportInset={0}>
          <ScrollZoom>
          <Image src={images[1] || "/placeholders/image.svg"} alt="Chi tiết nhẫn cưới và lời hẹn ước" fill loading="eager" sizes="(max-width: 430px) 43vw, 180px" className="object-cover" />
          </ScrollZoom>
        </Reveal>
      </motion.div>
    </div>
  );
}
