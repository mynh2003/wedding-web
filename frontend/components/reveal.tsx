"use client";

import { useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState, type CSSProperties } from "react";

function viewportGate(container: HTMLElement | null, insetOverride?: number) {
  const height = container?.clientHeight || window.innerHeight || 700;
  return { height, inset: insetOverride === undefined ? Math.round(Math.min(112, Math.max(40, height * .14))) : Math.max(0, insetOverride) };
}

export function Reveal({ children, delay = 0, className = "", effect = "rise", viewportInset }: { children?: React.ReactNode; delay?: number; className?: string; effect?: "rise" | "fade" | "image" | "line" | "left" | "right"; viewportInset?: number }) {
  const element = useRef<HTMLDivElement>(null);
  const container = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const node = element.current;
    if (!node || visible) return;
    if (reduced || !window.IntersectionObserver) { setVisible(true); return; }
    const gate = viewportGate(container.current, viewportInset);
    const ratio = Math.min(effect === "image" ? .05 : effect === "fade" ? .15 : .3, (gate.height - gate.inset) * .55 / Math.max(1, node.offsetHeight));
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= ratio)) {
        setVisible(true);
        observer.disconnect();
      }
    }, { root: container.current, rootMargin: `0px 0px -${gate.inset}px 0px`, threshold: ratio });
    observer.observe(node);
    return () => observer.disconnect();
  }, [effect, reduced, viewportInset, visible]);

  useEffect(() => {
    const root = element.current;
    if (!root || reduced || !window.IntersectionObserver || effect === "image" || effect === "line") return;
    // Observe actual text/button positions, not just the section's top edge.
    // A long form can enter well before its submit button reaches the viewport.
    const items = Array.from(root.querySelectorAll<HTMLElement>("h1, h2, h3, p, blockquote, button, a[href], .wish-form > .relative, [data-entrance-item]"))
      .filter((item) => item.closest(".wedding-reveal") === root &&
        !item.closest('.sr-only, [aria-hidden="true"], [data-entrance-skip]') &&
        !item.classList.contains("love-story-description-page") &&
        !item.parentElement?.closest("h1, h2, h3, p, blockquote, button, a[href]"));
    if (!items.length) return;
    root.dataset.revealItems = "true";
    const gate = viewportGate(container.current, viewportInset);
    const ratios = new Map(items.map((item) => [item, Math.min(.45, (gate.height - gate.inset) * .6 / Math.max(1, item.offsetHeight))]));
    const positions = new Map(items.map((item, index) => [item, index]));
    const observer = new IntersectionObserver((entries) => {
      // Stagger the items entering together in DOM order. Items further down
      // start a fresh sequence, rather than inheriting an arbitrary modulo delay.
      const entering = entries.filter((entry) => entry.isIntersecting && entry.intersectionRatio >= ratios.get(entry.target as HTMLElement)!)
        .sort((a, b) => positions.get(a.target as HTMLElement)! - positions.get(b.target as HTMLElement)!);
      entering.forEach((entry, index) => {
        const item = entry.target as HTMLElement;
        item.style.setProperty("--entrance-delay", `${.16 + Math.max(0, Math.min(.32, delay)) + Math.min(index * .16, .48)}s`);
        item.dataset.entrance = "visible";
        observer.unobserve(entry.target);
      });
    }, { root: container.current, rootMargin: `0px 0px -${gate.inset}px 0px`, threshold: [...new Set(ratios.values())] });
    items.forEach((item, index) => {
      if (item.dataset.entrance === "visible") return;
      item.dataset.entrance = "pending";
      item.dataset.entranceKind = item.matches("button, a[href]") ? "button" :
        item.matches(".wish-form > .relative") ? "field" :
        item.matches("h1, h2, h3") ? "heading" : item.matches("blockquote") ? "quote" : "text";
      if (item.dataset.entranceKind === "field") {
        const fieldIndex = items.slice(0, index).filter((previous) => previous.matches(".wish-form > .relative")).length;
        item.style.setProperty("--entrance-x", fieldIndex % 2 === 0 ? "-16px" : "16px");
      }
      observer.observe(item);
    });
    return () => {
      observer.disconnect();
      // Never leave interactive content invisible after an effect is disabled.
      items.forEach((item) => { if (item.dataset.entrance === "pending") delete item.dataset.entrance; });
    };
  }, [children, delay, effect, reduced, viewportInset]);

  return (
    <div
      ref={(node) => {
        element.current = node;
        container.current = node?.closest<HTMLElement>(".mobile-landing") ?? null;
      }}
      className={`wedding-reveal ${className}`}
      data-reveal-kind={effect}
      data-reveal={mounted && !reduced ? visible ? "visible" : "pending" : undefined}
      style={{ "--reveal-delay": `${.16 + Math.max(0, Math.min(.32, delay))}s` } as CSSProperties}
    >
      {children}
    </div>
  );
}

// Pseudo-element flowers need their own viewport targets. In particular a
// bottom-corner flower must not finish animating when the section top appears.
export function FloralEntrance() {
  const marker = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    const page = marker.current?.closest<HTMLElement>(".mobile-landing");
    if (!page || reduced || !window.IntersectionObserver) return;
    const targets = new Map<Element, { section: HTMLElement; key: string }>();
    const gate = viewportGate(page);
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting || entry.intersectionRatio < .35) return;
        const target = targets.get(entry.target);
        if (target) target.section.setAttribute(target.key, "visible");
        observer.unobserve(entry.target);
      });
    }, { root: page, rootMargin: `0px 0px -${gate.inset}px 0px`, threshold: .35 });
    page.querySelectorAll<HTMLElement>(".floral-paper").forEach((section) => {
      for (const side of ["before", "after"]) {
        const decoration = getComputedStyle(section, `::${side}`);
        if (decoration.content === "none" || decoration.content === "normal" || decoration.backgroundImage === "none") continue;
        const sensor = document.createElement("span");
        sensor.setAttribute("aria-hidden", "true");
        const height = Math.min(parseFloat(decoration.height) || 200, (gate.height - gate.inset) * .8);
        Object.assign(sensor.style, { position: "absolute", left: "50%", width: "1px", height: `${height}px`,
          top: decoration.top, bottom: decoration.bottom, pointerEvents: "none" });
        const key = `data-floral-${side}`;
        section.setAttribute(key, "pending");
        section.append(sensor);
        targets.set(sensor, { section, key });
        observer.observe(sensor);
      }
    });
    return () => {
      observer.disconnect();
      targets.forEach(({ section, key }, sensor) => { section.removeAttribute(key); sensor.remove(); });
    };
  }, [reduced]);
  return <span ref={marker} hidden aria-hidden="true" />;
}
