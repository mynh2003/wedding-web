"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";
import Image, { type ImageProps } from "next/image";
import { Reveal } from "@/components/reveal";
import { bindPageImagePreload } from "@/lib/page-image-preload";

export function PageImagePreloader() {
  const marker = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const page = marker.current?.closest<HTMLElement>(".mobile-landing");
    if (!page || !window.IntersectionObserver || !window.MutationObserver) return;
    return bindPageImagePreload(page);
  }, []);
  return <span ref={marker} hidden aria-hidden="true" />;
}

// A solid paper placeholder costs no extra image request. Keep the frame in
// layout and fade the decoded image in; never blur text or the whole section.
export function ProgressiveImage({ alt, className = "", onLoad, onError, ...props }: ImageProps) {
  const [readySource, setReadySource] = useState<ImageProps["src"] | null>(null);
  return <Image {...props} alt={alt} decoding="async" loading={props.priority ? undefined : props.loading ?? "lazy"}
    data-image-ready={readySource === props.src ? "true" : "false"}
    className={`invitation-image ${className}`}
    onLoad={(event) => { setReadySource(props.src); onLoad?.(event); }}
    onError={(event) => { setReadySource(props.src); onError?.(event); }} />;
}

export function ScrollImage({ alt, ...props }: ImageProps) {
  return <Reveal effect="fade" className="absolute inset-0"><ScrollZoom parallax={.035}><ProgressiveImage {...props} alt={alt} /></ScrollZoom></Reveal>;
}

// Transform only the image layer, preserving borders, masks, sticky positions
// and tap targets. Motion shares scroll measurements for the invitation frame.
export function ScrollZoom({ children, className = "absolute inset-0", amount = .06, parallax = 0 }: {
  children: ReactNode;
  className?: string;
  amount?: number;
  parallax?: number;
}) {
  const target = useRef<HTMLDivElement>(null);
  const container = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ container, target, offset: ["start end", "end start"] });
  const scale = useTransform(scrollYProgress, [0, 1], [1 + parallax * 2, 1 + parallax * 2 + amount]);
  const y = useTransform(scrollYProgress, [0, 1], [`${-parallax * 100}%`, `${parallax * 100}%`]);

  return (
    <div ref={(node) => {
      target.current = node;
      container.current = node?.closest<HTMLElement>(".mobile-landing") ?? null;
    }} className={`scroll-zoom ${className}`}>
      <motion.div className="scroll-zoom__image absolute inset-0" style={{ scale: reduced ? 1 : scale, y: reduced ? 0 : y }}>
        {children}
      </motion.div>
    </div>
  );
}
