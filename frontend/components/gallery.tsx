"use client";


import { PhotoViewer } from "@/components/photo-viewer";
import { motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { ProgressiveImage as Image, ScrollZoom } from "@/components/scroll-zoom";
import { Reveal } from "@/components/reveal";
import { bindSlideshowSwipe } from "@/lib/slideshow-swipe";

const fallbackPhotos = [
  { src: "/placeholders/image.svg", alt: "Khoảnh khắc của đôi uyên ương" },
  { src: "/placeholders/image.svg", alt: "Chi tiết nhẫn cưới" },
  { src: "/placeholders/image.svg", alt: "Album ngày cưới" },
  { src: "/placeholders/image.svg", alt: "Không gian ngày cưới" },
  { src: "/placeholders/image.svg", alt: "Khoảnh khắc hạnh phúc trong ngày cưới" },
];

export function Gallery({ coverImage, images = [] }: { coverImage?: string; images?: (string | undefined)[] }) {
  const photos = fallbackPhotos.map((photo, index) => ({ ...photo, src: images[index] || photo.src }));
  const [active, setActive] = useState(0);
  const [displayed, setDisplayed] = useState(0);
  const readySlides = useRef(new Map<number, string>());
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [loadedSlides, setLoadedSlides] = useState(() => new Set([0, 1]));
  useEffect(() => {
    setLoadedSlides((previous) => {
      const next = new Set(previous);
      for (const index of [active - 1, active, active + 1]) {
        if (index >= 0 && index < photos.length) next.add(index);
      }
      return next.size === previous.size ? previous : next;
    });
  }, [active, photos.length]);
  const dragged = useRef(false);
  const reduceMotion = useReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);
  const swiperRef = useRef<HTMLDivElement>(null);
  const [preloadThumbnails, setPreloadThumbnails] = useState(false);
  useEffect(() => {
    const swiper = swiperRef.current;
    const scroller = swiper?.closest<HTMLElement>(".mobile-landing");
    if (!swiper || !scroller) return;
    const warmAlbum = () => {
      setPreloadThumbnails(true);
      setLoadedSlides((previous) => previous.size === photos.length ? previous : new Set(Array.from({ length: photos.length }, (_, index) => index)));
    };
    if (!window.IntersectionObserver) { warmAlbum(); return; }
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      warmAlbum();
      observer.disconnect();
    }, { root: scroller, rootMargin: `${Math.max(1000, scroller.clientHeight * 2)}px 0px`, threshold: 0 });
    observer.observe(swiper);
    return () => observer.disconnect();
  }, [photos.length]);
  const activeRef = useRef(active);
  activeRef.current = active;
  const activeSource = photos[active].src;

  useEffect(() => {
    if (readySlides.current.get(active) === activeSource) setDisplayed(active);
  }, [active, activeSource]);

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
        // slide boundary so thumbnail navigation always reaches its target slide.
        const totalProgress = Math.abs(rawProgress - nearestSlide) <= (photos.length - 1) / travel ? nearestSlide : rawProgress;
        const nextActive = Math.min(photos.length - 1, Math.floor(totalProgress + 0.0001));
        if (activeRef.current !== nextActive) {
          activeRef.current = nextActive;
          setActive(nextActive);
        }
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
  }, [photos.length]);

  const goToSlide = useCallback((requestedIndex: number, fromSwipe = false) => {
    const index = Math.max(0, Math.min(photos.length - 1, requestedIndex));
    const swiper = swiperRef.current;
    const stage = stageRef.current;
    const scroller = stage?.closest<HTMLElement>(".mobile-landing");
    if (!swiper || !stage || !scroller) return;
    const travel = Math.max(0, swiper.offsetHeight - stage.offsetHeight);
    const scrollTop = scroller.scrollTop + swiper.getBoundingClientRect().top - scroller.getBoundingClientRect().top - scroller.clientTop + (index / (photos.length - 1)) * travel;
    // Swipes select one photo immediately; the photo itself provides the
    // transition, without scrolling through intermediate slide positions.
    scroller.scrollTo({ top: scrollTop, behavior: reduceMotion || fromSwipe ? "instant" : "smooth" });
  }, [photos.length, reduceMotion]);

  useEffect(() => {
    const stage = stageRef.current;
    const swiper = swiperRef.current;
    const scroller = stage?.closest<HTMLElement>(".mobile-landing");
    if (!stage || !swiper || !scroller) return;
    return bindSlideshowSwipe(stage, {
      isPinned: () => {
        const start = swiper.getBoundingClientRect().top - scroller.getBoundingClientRect().top - scroller.clientTop;
        return start <= 1 && start >= -(swiper.offsetHeight - stage.offsetHeight) - 1;
      },
      getIndex: () => activeRef.current,
      count: photos.length,
      onMove: () => { dragged.current = true; },
      onStart: () => { dragged.current = false; },
      onSelect: (index) => goToSlide(index, true),
    });
  }, [goToSlide, photos.length]);
  return (
    <>
      <div className="album-art mx-auto w-full max-w-[430px]" aria-label="Album ảnh cưới">
        <div className="album-art__intro">
          <Reveal><h2 className="album-art__heading"><span>ALBUM</span><span className="album-art__of">of</span><span className="sr-only">Love</span></h2></Reveal>
          <Reveal effect="image" className="album-art__collage" delay={.08}>
            <ScrollZoom>
            <Image src={coverImage || photos[0].src} alt={photos[0].alt} fill sizes="(max-width: 430px) 90vw, 390px" className="object-cover" />
            </ScrollZoom>
          </Reveal>
        </div>
        <div ref={swiperRef} className="album-swiper" data-scroll-slideshow role="region" aria-roledescription="trình chiếu" aria-label="Album ảnh cưới, 5 ảnh">
          <div ref={stageRef} className="album-swiper__stage" data-scroll-slideshow-stage>
            {photos.map((photo, index) => (
              <motion.button
                type="button"
                aria-label={`Phóng to ảnh ${index + 1}: ${photo.alt}`}
                aria-haspopup="dialog"
                onPointerDown={() => { dragged.current = false; }}
                onClick={() => { if (!dragged.current) { setViewerIndex(displayed); } }}
                key={index}
                tabIndex={displayed === index ? 0 : -1}
                aria-hidden={displayed !== index}
                style={{ pointerEvents: displayed === index ? "auto" : "none", zIndex: displayed === index ? 1 : 0 }}
                className="album-swiper__slide"
                onPanStart={() => { dragged.current = true; }}
                onPanEnd={(event, info) => {
                  if (event.pointerType !== "mouse") return;
                  if (info.offset.x < -28) goToSlide(activeRef.current + 1, true);
                  else if (info.offset.x > 28) goToSlide(activeRef.current - 1, true);
                }}
                initial={false}
                animate={{ opacity: displayed === index ? 1 : 0 }}
                transition={{ duration: reduceMotion ? 0 : .8, ease: [.22, 1, .36, 1] }}
              >
                <motion.div
                  className="album-swiper__image absolute inset-0"
                  initial={false}
                  animate={{ scale: reduceMotion || displayed === index ? 1 : 1.055 }}
                  transition={{ duration: reduceMotion ? 0 : 1.1, ease: [.22, 1, .36, 1] }}
                >
                  {loadedSlides.has(index) && <Image src={photo.src} alt={photo.alt} loading="lazy" fill sizes="(max-width: 430px) 100vw, 430px" draggable={false} className="pointer-events-none object-cover"
                    onLoad={() => {
                      readySlides.current.set(index, photo.src);
                      if (activeRef.current === index) setDisplayed(index);
                    }}
                    onError={() => {
                      readySlides.current.set(index, photo.src);
                      if (activeRef.current === index) setDisplayed(index);
                    }} />}
                </motion.div>
              </motion.button>
            ))}
            <Reveal effect="fade" viewportInset={0} className="album-swiper__navigation">
              <div data-entrance-skip className="album-swiper__thumbnails" role="group" aria-label="Chọn ảnh trong album">
                <motion.span
                  className="album-swiper__selection"
                  aria-hidden="true"
                  initial={false}
                  animate={{ x: active * 48 }}
                  transition={{ duration: reduceMotion ? 0 : .45, ease: [.22, 1, .36, 1] }}
                />
                {photos.map((photo, index) => (
                  <button key={index} type="button" onClick={() => goToSlide(index)} aria-label={`Chuyển tới ảnh ${index + 1}`} aria-current={active === index ? "true" : undefined} className={`album-swiper__thumbnail${active === index ? " is-active" : ""}`}>
                    <span className="album-swiper__thumbnail-image">
                      <Image src={photo.src} alt="" fill sizes="36px" loading={preloadThumbnails ? "eager" : "lazy"} fetchPriority="low" draggable={false} className="object-cover !transition-none" />
                    </span>
                  </button>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </div>
      <PhotoViewer photos={photos} viewerIndex={viewerIndex} setViewerIndex={setViewerIndex} />
    </>
  );
}
