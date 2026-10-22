"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

import { DRESS_CODE_PLACEHOLDER, resolveDressCodeColors } from "@/lib/dress-code";
import { ProgressiveImage } from "@/components/scroll-zoom";

export function DressCode({ imageUrl, colors }: { imageUrl?: string; colors?: unknown }) {
  const palette = resolveDressCodeColors(colors);
  const ref = useRef<HTMLDivElement>(null);
  const scrollContainer = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ container: scrollContainer, target: ref, offset: ["start end", "end end"] });
  // Match Impact's central aperture and image movement, with a final palette beat.
  const progress = useTransform(scrollYProgress, [0, .72], [0, 1], { clamp: true });
  const clipPath = useTransform(progress, (p) => {
    const eased = p * p;
    return `inset(${37 * (1 - eased)}% ${37 * (1 - eased)}% ${41 * (1 - eased)}% ${37 * (1 - eased)}%)`;
  });
  const scale = useTransform(scrollYProgress, [0, .72, 1], [1.4, 1, 1.045]);
  const x = useTransform(progress, [0, 1], ["-10%", "0%"]);
  const y = useTransform(progress, [0, 1], ["-1.5%", "0%"]);
  const opacity = useTransform(progress, [0, .25, 1], [0, 1, 1]);
  const paletteY = useTransform(scrollYProgress, [.76, .94], ["130%", "0%"]);

  return (
    <div ref={(node) => {
      ref.current = node;
      scrollContainer.current = node?.closest<HTMLElement>(".mobile-landing") ?? null;
    }} className="dress-code-reveal" data-reduced-motion={reduced ? "true" : undefined}>
      <div className="dress-code-stage">
        <motion.div className="dress-code-title" style={{ opacity: reduced ? 1 : opacity }}>
          <h2>DRESS CODE</h2>
        </motion.div>
        <motion.div className="dress-code-image-clipper" style={{ clipPath: reduced ? "inset(0)" : clipPath }} aria-hidden="true">
          <motion.div className="dress-code-background" style={{ scale: reduced ? 1 : scale, x: reduced ? 0 : x, y: reduced ? 0 : y }}>
            {imageUrl && <ProgressiveImage src={imageUrl} alt="" fill sizes="(max-width: 430px) 100vw, 430px" className="object-cover" />}
          </motion.div>
          <div className="dress-code-shade" />
        </motion.div>
        <motion.div className="dress-code-title-mask" style={{ clipPath: reduced ? "inset(0)" : clipPath }} aria-hidden="true">
          <motion.div className="dress-code-title dress-code-title-inside" style={{ opacity: reduced ? 1 : opacity }}>
            <span>DRESS CODE</span>
          </motion.div>
        </motion.div>
        <motion.div className="dress-code-colors" style={{ y: reduced ? 0 : paletteY }}>
          <div className="dress-code-palette">
            {palette.map((color, index) => <span key={index} className="dress-code-swatch" role="img" aria-label={color ? `Màu trang phục ${index + 1}: ${color}` : `Màu trang phục ${index + 1}: chưa chọn`} style={{ backgroundColor: color || DRESS_CODE_PLACEHOLDER }} />)}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
