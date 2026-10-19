"use client";

import Image from "next/image";
import { PhotoViewer } from "@/components/photo-viewer";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { defaultInvitationCopy } from "@/lib/invitation-copy";

const photos = ["left", "right", "center", "lower-left", "lower-right"];

function StoryPhoto({ position, index, src, progress, reduced, onOpen }: {
  position: string;
  index: number;
  src: string;
  progress: MotionValue<number>;
  reduced: boolean;
  onOpen: () => void;
}) {
  // Follow the shared page scroll directly, adding only a little depth.
  const depth = [32, 52, 24, 44, 36][index];
  const y = useTransform(() => (0.5 - progress.get()) * depth);
  return (
    <motion.button type="button" className={'love-story-review love-story-review--' + position}
      style={reduced ? undefined : { y }}
      aria-label={`Phóng to ảnh câu chuyện tình yêu ${index + 1}`} aria-haspopup="dialog" onClick={onOpen}>
      <div className="love-story-review-image">
        <Image src={src} alt={`Ảnh câu chuyện tình yêu ${index + 1}`} fill sizes="(max-width: 430px) 42vw, 181px" className="object-cover" />
      </div>
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
    const measure = () => setPageHeight(Math.max(112, track.getBoundingClientRect().height / story.length));
    const observer = new ResizeObserver(measure);
    observer.observe(track); measure();
    return () => observer.disconnect();
  }, [story]);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ container, target: section, offset: ["start start", "end end"] });
  const textY = useTransform(scrollYProgress, (progress) => {
    const position = Math.min(3, Math.max(0, (progress - .08) / .82 * 3));
    const page = Math.floor(position);
    const blend = Math.max(0, Math.min(1, (position - page - .65) / .35));
    return `${-(page + blend * blend * (3 - 2 * blend)) * (100 / story.length)}%`;
  });

  return (
    <section ref={(node) => {
      section.current = node;
      container.current = node?.closest<HTMLElement>(".mobile-landing") ?? null;
    }} aria-labelledby="love-story-title" className="love-story-section love-story cream-paper floral-paper floral-paper--story">
      <header className="love-story-heading" style={reduced ? undefined : { minHeight: pageHeight + 128 }}>
        <h2 id="love-story-title">The love s<span className="love-story-lowercase-t">t</span>ory</h2>
        <div className="love-story-description-window" style={{ height: pageHeight }} aria-hidden="true">
          <motion.div ref={textTrack} style={{ y: reduced ? 0 : textY, display: "grid", gridAutoRows: "1fr" }}>
            {story.map((text, index) => <p className="love-story-description-page wedding-description invitation-copy" key={index}>{text}</p>)}
          </motion.div>
        </div>
        <div className="love-story-accessible-copy wedding-description invitation-copy sr-only">
          {story.map((text, index) => <p key={index}>{text}</p>)}
        </div>
      </header>
      <div className="love-story-review-field">
        {photos.map((position, index) => (
          <StoryPhoto key={position} position={position} index={index}
            src={images[index] || "/placeholders/hero-gray.svg"}
            progress={scrollYProgress} reduced={Boolean(reduced)} onOpen={() => setViewerIndex(index)} />
        ))}
      </div>
      <PhotoViewer
        photos={photos.map((_, index) => ({ src: images[index] || "/placeholders/hero-gray.svg", alt: `Ảnh câu chuyện tình yêu ${index + 1}` }))}
        viewerIndex={viewerIndex} setViewerIndex={setViewerIndex}
      />
    </section>
  );
}
