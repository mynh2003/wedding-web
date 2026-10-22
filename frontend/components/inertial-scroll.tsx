"use client";

import { useEffect, useRef } from "react";
import { createSlideshowBoundary } from "@/lib/slideshow-scroll-boundary";

export function InertialScroll() {
  const marker = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const page = marker.current?.closest<HTMLElement>(".mobile-landing");
    if (!page) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const previousBehavior = page.style.scrollBehavior;
    // Write real scroll positions, keeping sticky sections and slideshow progress
    // synchronized. A single controller limits momentum throughout the page
    // and stops album gestures exactly at either edge.
    page.style.scrollBehavior = "auto";
    let frame = 0;
    let target = page.scrollTop;
    let expected = page.scrollTop;
    let current = page.scrollTop;
    let lastTime = 0;
    let direction = 0;
    let lastWheelTime = -Infinity;
    let lastWheelDirection = 0;
    let motionKind: "touch" | "wheel" = "wheel";
    const boundary = createSlideshowBoundary();
    const touch = { active: false, axis: "", startX: 0, startY: 0, y: 0, time: 0, velocity: 0 };
    const bounds = () => {
      const slideshow = page.querySelector<HTMLElement>("[data-scroll-slideshow]");
      const stage = slideshow?.querySelector<HTMLElement>("[data-scroll-slideshow-stage]");
      if (!slideshow || !stage) return null;
      const start = page.scrollTop + slideshow.getBoundingClientRect().top - page.getBoundingClientRect().top - page.clientTop;
      return { start, end: start + Math.max(0, slideshow.offsetHeight - stage.offsetHeight) };
    };
    const albumWeight = (position: number, range: ReturnType<typeof bounds>) => {
      if (!range) return 0;
      const distance = Math.max(range.start - position, position - range.end, 0);
      const t = Math.min(1, distance / Math.max(1, page.clientHeight * .6));
      return 1 - t * t * (3 - 2 * t);
    };
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      target = expected = current = page.scrollTop;
      direction = 0;
    };
    const locked = () => preference.matches ||
      /hidden|clip/.test(getComputedStyle(page).overflowY) || Boolean(page.querySelector("dialog[open]"));
    const nestedScroll = (target: EventTarget | null) => {
      let element = target instanceof Element ? target : null;
      while (element && element !== page) {
        if (element.matches("textarea, select, input, [contenteditable], dialog")) return true;
        if (/auto|scroll/.test(getComputedStyle(element).overflowY) && element.scrollHeight > element.clientHeight) return true;
        element = element.parentElement;
      }
      return false;
    };
    const tick = (time: number) => {
      if (locked()) { stop(); return; }
      const elapsed = Math.min(64, time - lastTime);
      lastTime = time;
      target = Math.max(0, Math.min(target, page.scrollHeight - page.clientHeight));
      const remaining = target - current;
      // A page-owned touch uses the same physics on both sides of the album.
      // Do not switch braking halfway through an outward swipe's release.
      const touchMotion = motionKind === "touch";
      const weight = touchMotion ? 0 : albumWeight(current, bounds());
      const easedStep = remaining * (1 - Math.exp(-elapsed / (touchMotion ? 110 : 95 + weight * 55)));
      // A large first wheel packet must not jump across several album frames.
      // Limit actual travel per millisecond as well as the queued destination.
      const maxStep = elapsed * (touchMotion ? 2.8 : 2.8 - weight * 1.95);
      current = Math.abs(remaining) < .75 ? target : current + Math.max(-maxStep, Math.min(maxStep, easedStep));
      page.scrollTop = current;
      expected = page.scrollTop;
      if (Math.abs(target - current) < .75) { page.scrollTop = target; stop(); return; }
      frame = requestAnimationFrame(tick);
    };
    const onWheel = (event: WheelEvent) => {
      if (event.defaultPrevented || event.ctrlKey || event.shiftKey || locked() || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      if (nestedScroll(event.target)) return;
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? page.clientHeight : 1;
      const range = bounds();
      const weight = albumWeight(page.scrollTop, range);
      const limit = page.clientHeight * (.65 - weight * .25);
      const delta = Math.max(-limit, Math.min(limit, event.deltaY * unit));
      if (!delta) return;
      const now = performance.now();
      if (now - lastWheelTime > 200 || Math.sign(delta) !== lastWheelDirection) boundary.reset();
      lastWheelTime = now;
      lastWheelDirection = Math.sign(delta);
      event.preventDefault();
      motionKind = "wheel";
      if (!frame || Math.sign(delta) !== direction) target = current = page.scrollTop;
      direction = Math.sign(delta);
      const pendingLimit = page.clientHeight * (.8 - weight * .35);
      const next = Math.max(current - pendingLimit, Math.min(current + pendingLimit, target + delta));
      target = Math.max(0, Math.min(boundary.clamp(current, next, range), page.scrollHeight - page.clientHeight));
      if (!frame) { lastTime = performance.now(); frame = requestAnimationFrame(tick); }
    };
    const onTouchStart = (event: TouchEvent) => {
      stop();
      boundary.reset();
      touch.active = false;
      if (locked() || event.touches.length !== 1 || nestedScroll(event.target)) return;
      const point = event.touches[0];
      motionKind = "touch";
      Object.assign(touch, { active: true, axis: "", startX: point.clientX, startY: point.clientY, y: point.clientY, time: performance.now(), velocity: 0 });
    };
    const onTouchMove = (event: TouchEvent) => {
      if (!touch.active) return;
      // The album owns a swipe until release. Do not scroll the page or add
      // release momentum after it has claimed that gesture.
      if (event.defaultPrevented) { touch.active = false; stop(); return; }
      if (event.touches.length !== 1 || locked()) { touch.active = false; stop(); return; }
      const point = event.touches[0];
      const dx = point.clientX - touch.startX;
      const dy = point.clientY - touch.startY;
      if (!touch.axis) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 8) {
          // Cancel the first vertical move too: otherwise mobile browsers can
          // latch native momentum before our axis threshold is reached.
          if (dy !== 0 && Math.abs(dy) >= Math.abs(dx) && event.cancelable) event.preventDefault();
          return;
        }
        touch.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      }
      if (touch.axis !== "y") return;
      if (!event.cancelable) { touch.active = false; stop(); return; }
      event.preventDefault();
      const now = performance.now();
      const delta = touch.y - point.clientY;
      const next = boundary.clamp(page.scrollTop, page.scrollTop + delta, bounds());
      const moved = next - page.scrollTop;
      const elapsed = Math.max(8, now - touch.time);
      const sample = moved / elapsed;
      // Smooth noisy touch samples, but reverse immediately when the finger
      // changes direction. A clamped edge must never store hidden momentum.
      touch.velocity = !moved ? 0 : Math.sign(sample) !== Math.sign(touch.velocity)
        ? sample : touch.velocity + (sample - touch.velocity) * (1 - Math.exp(-elapsed / 36));
      touch.y = point.clientY;
      touch.time = now;
      page.scrollTop = next;
      current = expected = target = page.scrollTop;
    };
    const onTouchEnd = () => {
      if (!touch.active) return;
      touch.active = false;
      if (touch.axis !== "y" || locked() || performance.now() - touch.time > 100) return;
      const range = bounds();
      const limit = page.clientHeight * .5;
      const age = performance.now() - touch.time;
      const distance = Math.max(-limit, Math.min(limit, touch.velocity * 150 * Math.exp(-age / 50)));
      target = Math.max(0, Math.min(boundary.clamp(current, current + distance, range), page.scrollHeight - page.clientHeight));
      if (Math.abs(target - current) > .75) {
        lastTime = performance.now();
        frame = requestAnimationFrame(tick);
      }
    };
    const onTouchCancel = () => { touch.active = false; stop(); };
    const onScroll = () => {
      // Native focus navigation and programmatic gallery navigation take priority.
      if (frame && Math.abs(page.scrollTop - expected) > 2) stop();
    };
    page.addEventListener("wheel", onWheel, { passive: false });
    page.addEventListener("scroll", onScroll, { passive: true });
    page.addEventListener("touchstart", onTouchStart, { passive: true });
    page.addEventListener("touchmove", onTouchMove, { passive: false });
    page.addEventListener("touchend", onTouchEnd, { passive: true });
    page.addEventListener("touchcancel", onTouchCancel, { passive: true });
    page.addEventListener("pointerdown", stop, { passive: true });
    page.addEventListener("keydown", stop);
    preference.addEventListener("change", stop);
    return () => {
      stop();
      page.style.scrollBehavior = previousBehavior;
      page.removeEventListener("wheel", onWheel);
      page.removeEventListener("scroll", onScroll);
      page.removeEventListener("touchstart", onTouchStart);
      page.removeEventListener("touchmove", onTouchMove);
      page.removeEventListener("touchend", onTouchEnd);
      page.removeEventListener("touchcancel", onTouchCancel);
      page.removeEventListener("pointerdown", stop);
      page.removeEventListener("keydown", stop);
      preference.removeEventListener("change", stop);
    };
  }, []);
  return <span ref={marker} hidden aria-hidden="true" />;
}
