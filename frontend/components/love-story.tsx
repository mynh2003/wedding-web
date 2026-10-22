"use client";


import { PhotoViewer } from "@/components/photo-viewer";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from "framer-motion";
import { defaultInvitationCopy } from "@/lib/invitation-copy";
import { ProgressiveImage as Image, ScrollZoom } from "@/components/scroll-zoom";
import { Reveal } from "@/components/reveal";

const photos = ["left", "right", "center", "lower-left", "lower-right"];

function StoryDescription({ text, index, position }: { text: string; index: number; position: MotionValue<number> }) {
  const opacity = useTransform(position, [index - 1, index, index + 1], [0, 1, 0]);
  const y = useTransform(position, [index - 1, index, index + 1], [24, 0, -24]);
  const scale = useTransform(position, [index - 1, index, index + 1], [.98, 1, .98]);
  return <motion.p className="love-story-description-page wedding-description invitation-copy" style={{ opacity, y, scale }}>{text}</motion.p>;
}

function StoryPhoto({ position, index, src, progress, drift, reduced, onOpen }: {
  position: string;
  index: number;
  src: string;
  progress: MotionValue<number>;
  drift: MotionValue<number>;
  reduced: boolean;
  onOpen: () => void;
}) {
  // Share a small visual trailing offset; the page's scroll controller still
  // owns scrolling, slideshow brakes and dialog locks.
  const depth = [32, 52, 24, 44, 36][index];
  const y = useTransform(() => (0.5 - progress.get()) * depth + drift.get() * [1, .85, .7, .95, .8][index]);
  return (
    <motion.button type="button" className={'love-story-review love-story-review--' + position}
      style={reduced ? undefined : { y }}
      aria-label={`Phóng to ảnh câu chuyện tình yêu ${index + 1}`} aria-haspopup="dialog" onClick={onOpen}>
      <Reveal effect="image" className="love-story-review-image" viewportInset={0}>
        <ScrollZoom>
        <Image src={src} alt={`Ảnh câu chuyện tình yêu ${index + 1}`} fill sizes="(max-width: 430px) 42vw, 181px" className="object-cover" />
        </ScrollZoom>
      </Reveal>
    </motion.button>
  );
}

export function LoveStory({ images = [], pages = defaultInvitationCopy.story_pages }: { images?: (string | undefined)[]; pages?: string[] }) {
  const story = pages;
  const section = useRef<HTMLElement>(null);
  const container = useRef<HTMLElement>(null);
  const textTrack = useRef<HTMLDivElement>(null);
  const [pageHeight, setPageHeight] = useState(112);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  useEffect(() => {
    const track = textTrack.current;
    if (!track) return;
    const measure = () => setPageHeight(Math.max(112, track.offsetHeight));
    const observer = new ResizeObserver(measure);
    observer.observe(track); measure();
    return () => observer.disconnect();
  }, [story]);
  const reduced = useReducedMotion();
  const { scrollYProgress, scrollY } = useScroll({ container, target: section, offset: ["start start", "end end"] });
  const trailingScroll = useSpring(scrollY, { stiffness: 100, damping: 24, mass: .8, restDelta: .1, restSpeed: .1 });
  const cardDrift = useTransform(() => {
    // Saturate smoothly at 28px so a fast fling cannot displace a card far
    // from its layout or create a hard stop at the maximum offset.
    return 28 * Math.tanh((scrollY.get() - trailingScroll.get()) * .24 / 28);
  });
  const textPosition = useTransform(scrollYProgress, (progress) => {
    const position = Math.min(story.length - 1, Math.max(0, (progress - .08) / .82 * (story.length - 1)));
    const page = Math.floor(position);
    const blend = Math.max(0, Math.min(1, (position - page - .65) / .35));
    return page + blend * blend * (3 - 2 * blend);
  });

  return (
    <section ref={(node) => {
      section.current = node;
      container.current = node?.closest<HTMLElement>(".mobile-landing") ?? null;
    }} aria-labelledby="love-story-title" className="love-story-section love-story cream-paper floral-paper floral-paper--story">
      <header className="love-story-heading" style={reduced ? undefined : { minHeight: pageHeight + 128 }}>
        <Reveal className="flex w-full flex-col items-center">
        <h2 id="love-story-title">The love s<span className="love-story-lowercase-t">t</span>ory</h2>
        <div className="love-story-description-window" style={{ height: pageHeight }} aria-hidden="true">
          <div ref={textTrack} className="love-story-description-stack">
            {story.map((text, index) => <StoryDescription key={index} text={text} index={index} position={textPosition} />)}
          </div>
        </div>
        <div className="love-story-accessible-copy wedding-description invitation-copy sr-only">
          {story.map((text, index) => <p key={index}>{text}</p>)}
        </div>
        </Reveal>
      </header>
      <div className="love-story-review-field" data-image-preload-group>
        {photos.map((position, index) => (
          <StoryPhoto key={position} position={position} index={index}
            src={images[index] || "/placeholders/image.svg"}
            progress={scrollYProgress} drift={cardDrift} reduced={Boolean(reduced)} onOpen={() => setViewerIndex(index)} />
        ))}
      </div>
      <PhotoViewer
        photos={photos.map((_, index) => ({ src: images[index] || "/placeholders/image.svg", alt: `Ảnh câu chuyện tình yêu ${index + 1}` }))}
        viewerIndex={viewerIndex} setViewerIndex={setViewerIndex}
      />
    </section>
  );
}
