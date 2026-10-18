"use client";

import Image from "next/image";
import { motion, useMotionValue, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

const fallbackPhotos = [
  { src: "/placeholders/ring-portrait.svg", alt: "Khoảnh khắc của đôi uyên ương" },
  { src: "/placeholders/ring-detail.svg", alt: "Chi tiết nhẫn cưới" },
  { src: "/placeholders/ring-wide.svg", alt: "Album ngày cưới" },
  { src: "/placeholders/ring-hero.svg", alt: "Không gian ngày cưới" },
  { src: "/placeholders/hero-gray.svg", alt: "Khoảnh khắc hạnh phúc trong ngày cưới" },
];

export function Gallery({ coverImage, images = [] }: { coverImage?: string; images?: (string | undefined)[] }) {
  const photos = fallbackPhotos.map((photo, index) => ({ ...photo, src: images[index] || photo.src }));
  const [active, setActive] = useState(0);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [closing, setClosing] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const viewerImageRef = useRef<HTMLDivElement>(null);
  const viewerGesture = useRef({ x: 0, y: 0, left: 0, top: 0, moved: false });
  const dragged = useRef(false);
  const viewerOpen = viewerIndex !== null;

  useEffect(() => {
    const image = viewerImageRef.current;
    if (!image) return;
    image.scrollTo({ left: zoomed ? (image.scrollWidth - image.clientWidth) / 2 : 0, top: zoomed ? (image.scrollHeight - image.clientHeight) / 2 : 0 });
  }, [zoomed, viewerIndex]);

  useEffect(() => {
    if (!viewerOpen) return;
    const dialog = dialogRef.current;
    const scroller = stageRef.current?.closest<HTMLElement>(".mobile-landing");
    const previousOverflow = scroller?.style.overflow;
    dialog?.showModal();
    if (scroller) scroller.style.overflow = "hidden";
    return () => {
      dialog?.close();
      if (scroller) scroller.style.overflow = previousOverflow ?? "";
    };
  }, [viewerOpen]);

  const changeViewerPhoto = (direction: number) => {
    setZoomed(false);
    setViewerIndex((index) => index === null ? null : (index + direction + photos.length) % photos.length);
  };
  const progressOffset = useMotionValue(113.1);
  const reduceMotion = useReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);
  const swiperRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    const swiper = swiperRef.current;
    const stage = stageRef.current;
    const scroller = stage?.closest<HTMLElement>(".mobile-landing");
    if (!swiper || !stage || !scroller) return;

    let frame = 0;
    const updateFromScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const travel = Math.max(1, swiper.offsetHeight - stage.offsetHeight);
        const distance = Math.max(0, Math.min(travel, scroller.getBoundingClientRect().top + scroller.clientTop - swiper.getBoundingClientRect().top));
        const rawProgress = (distance / travel) * (photos.length - 1);
        const nearestSlide = Math.round(rawProgress);
        // scrollTop is rounded by browsers; snap within one CSS pixel of a
        // slide boundary so dot navigation can always reach its target slide.
        const totalProgress = Math.abs(rawProgress - nearestSlide) <= (photos.length - 1) / travel ? nearestSlide : rawProgress;
        const nextActive = Math.min(photos.length - 1, Math.floor(totalProgress + 0.0001));
        const nextProgress = nextActive === photos.length - 1 ? 1 : totalProgress - nextActive;
        if (activeRef.current !== nextActive) {
          activeRef.current = nextActive;
          setActive(nextActive);
        }
        progressOffset.set(113.1 * (1 - nextProgress));
      });
    };

    scroller.addEventListener("scroll", updateFromScroll, { passive: true });
    window.addEventListener("resize", updateFromScroll);
    updateFromScroll();
    return () => {
      cancelAnimationFrame(frame);
      scroller.removeEventListener("scroll", updateFromScroll);
      window.removeEventListener("resize", updateFromScroll);
    };
  }, [photos.length, progressOffset]);

  const goToSlide = (requestedIndex: number) => {
    const index = Math.max(0, Math.min(photos.length - 1, requestedIndex));
    const swiper = swiperRef.current;
    const stage = stageRef.current;
    const scroller = stage?.closest<HTMLElement>(".mobile-landing");
    if (!swiper || !stage || !scroller) return;
    const travel = Math.max(0, swiper.offsetHeight - stage.offsetHeight);
    const scrollTop = scroller.scrollTop + swiper.getBoundingClientRect().top - scroller.getBoundingClientRect().top - scroller.clientTop + (index / (photos.length - 1)) * travel;
    scroller.scrollTo({ top: scrollTop, behavior: reduceMotion ? "instant" : "smooth" });
  };
  return (
    <>
      <div className="album-art mx-auto w-full max-w-[430px]" aria-label="Album ảnh cưới">
        <div className="album-art__intro">
          <h2 className="album-art__heading"><span>ALBUM</span><span className="album-art__of">of</span><span className="sr-only">Love</span></h2>
          <div className="album-art__collage">
            <Image src={coverImage || photos[0].src} alt={photos[0].alt} fill sizes="(max-width: 430px) 90vw, 390px" className="object-cover" />
          </div>
        </div>
        <div ref={swiperRef} className="album-swiper" aria-label="Trình chiếu ảnh cưới, 5 ảnh">
          <div ref={stageRef} className="album-swiper__stage">
            {photos.map((photo, index) => (
              <motion.button
                type="button"
                aria-label={`Phóng to ảnh ${index + 1}: ${photo.alt}`}
                aria-haspopup="dialog"
                onPointerDown={() => { dragged.current = false; }}
                onDragStart={() => { dragged.current = true; }}
                onClick={() => { if (!dragged.current) { setZoomed(false); setViewerIndex(active); } }}
                key={index}
                tabIndex={active === index ? 0 : -1}
                aria-hidden={active !== index}
                style={{ pointerEvents: active === index ? "auto" : "none", zIndex: active === index ? 1 : 0 }}
                className="album-swiper__slide"
                drag="x"
                dragDirectionLock
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.18}
                dragMomentum={false}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -40 || info.velocity.x < -300) goToSlide(activeRef.current + 1);
                  else if (info.offset.x > 40 || info.velocity.x > 300) goToSlide(activeRef.current - 1);
                }}
                initial={false}
                animate={{ opacity: active === index ? 1 : 0, scale: reduceMotion || active === index ? 1 : 1.035 }}
                transition={{ duration: reduceMotion ? 0 : .55, ease: [.22, 1, .36, 1] }}
              >
                <Image src={photo.src} alt={photo.alt} loading="lazy" fill sizes="(max-width: 430px) 100vw, 430px" draggable={false} className="pointer-events-none object-cover" />
              </motion.button>
            ))}
            <div className="album-swiper__dots" aria-label="Chọn ảnh">
              {photos.map((photo, index) => (
                <button key={photo.src} type="button" onClick={() => goToSlide(index)} aria-label={`Chuyển tới ảnh ${index + 1}`} aria-current={active === index ? "true" : undefined} className={active === index ? "is-active" : ""}>
                  {String(index + 1).padStart(2, "0")}
                {active === index && (
                    <svg className="album-swiper__progress" viewBox="0 0 40 40" aria-hidden="true">
                      <circle className="album-swiper__progress-track" cx="20" cy="20" r="18" />
                    <motion.circle className="album-swiper__progress-value" cx="20" cy="20" r="18" style={{ strokeDashoffset: progressOffset }} />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <dialog ref={dialogRef} className="album-viewer" aria-label="Gallery ảnh cưới phóng to" data-closing={closing}
        onAnimationEnd={(event) => {
          if (event.target === event.currentTarget && event.animationName === "album-viewer-close") {
            setViewerIndex(null);
            setClosing(false);
          }
        }}
        onClose={() => { setViewerIndex(null); setClosing(false); }}
        onCancel={(event) => { event.preventDefault(); setClosing(true); }}
        onClick={(event) => { if (event.target === event.currentTarget) setClosing(true); }}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") { event.preventDefault(); changeViewerPhoto(1); }
          if (event.key === "ArrowLeft") { event.preventDefault(); changeViewerPhoto(-1); }
        }}>
        {viewerIndex !== null && <div className="album-viewer__panel">
          <button className="album-viewer__close" type="button" onClick={() => setClosing(true)} aria-label="Đóng gallery">×</button>
          <motion.div ref={viewerImageRef} className="album-viewer__image" data-zoomed={zoomed}
            drag={zoomed ? false : "x"}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={reduceMotion ? 0 : .12}
            dragMomentum={false}
            onDragEnd={(_, info) => {
              if (info.offset.x < -40 || info.velocity.x < -300) changeViewerPhoto(1);
              else if (info.offset.x > 40 || info.velocity.x > 300) changeViewerPhoto(-1);
            }}>
            <button type="button" className="album-viewer__zoom" aria-label={zoomed ? "Thu nhỏ ảnh" : "Phóng to ảnh"} aria-pressed={zoomed}
              onPointerDown={(event) => {
                const viewport = viewerImageRef.current;
                viewerGesture.current = { x: event.clientX, y: event.clientY, left: viewport?.scrollLeft ?? 0, top: viewport?.scrollTop ?? 0, moved: false };
                if (zoomed && event.pointerType === "mouse") event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onPointerMove={(event) => {
                if (!event.buttons && event.pointerType === "mouse") return;
                const gesture = viewerGesture.current;
                if (Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 8) gesture.moved = true;
                const viewport = viewerImageRef.current;
                if (zoomed && gesture.moved && event.pointerType === "mouse" && viewport) {
                  viewport.scrollLeft = gesture.left - (event.clientX - gesture.x);
                  viewport.scrollTop = gesture.top - (event.clientY - gesture.y);
                }
              }}
              onPointerCancel={() => { viewerGesture.current.moved = true; }}
              onClick={(event) => { if (event.detail === 0 || !viewerGesture.current.moved) setZoomed((value) => !value); }}>
              <Image key={viewerIndex} src={photos[viewerIndex].src} alt={photos[viewerIndex].alt} width={1600} height={2400} sizes={zoomed ? "180vw" : "90vw"} className="album-viewer__photo" draggable={false} />
            </button>
          </motion.div>
          <span className="sr-only" aria-live="polite">Ảnh {viewerIndex + 1} / {photos.length}</span>
        </div>}
      </dialog>
    </>
  );
}
