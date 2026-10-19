"use client";

import Image from "next/image";
import { PhotoViewer } from "@/components/photo-viewer";
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
  const dragged = useRef(false);
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
        <div ref={swiperRef} className="album-swiper" data-scroll-slideshow aria-label="Trình chiếu ảnh cưới, 5 ảnh">
          <div ref={stageRef} className="album-swiper__stage" data-scroll-slideshow-stage>
            {photos.map((photo, index) => (
              <motion.button
                type="button"
                aria-label={`Phóng to ảnh ${index + 1}: ${photo.alt}`}
                aria-haspopup="dialog"
                onPointerDown={() => { dragged.current = false; }}
                onDragStart={() => { dragged.current = true; }}
                onClick={() => { if (!dragged.current) { setViewerIndex(active); } }}
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
      <PhotoViewer photos={photos} viewerIndex={viewerIndex} setViewerIndex={setViewerIndex} />
    </>
  );
}
