"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { defaultInvitationCopy } from "@/lib/invitation-copy";

const photos = ["left", "right", "center", "lower-left", "lower-right"];
export function LoveStory({ images = [], pages = defaultInvitationCopy.story_pages }: { images?: (string | undefined)[]; pages?: string[] }) {
  const story = pages;
  const section = useRef<HTMLElement>(null);
  const container = useRef<HTMLElement>(null);
  const textTrack = useRef<HTMLDivElement>(null);
  const [pageHeight, setPageHeight] = useState(112);
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
        <h2 id="love-story-title">The Love Story of Us</h2>
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
          <div key={position} className={'love-story-review love-story-review--' + position}>
            <div className="love-story-review-image">
              <Image src={images[index] || "/placeholders/hero-gray.svg"} alt={`Ảnh ${index + 1} — đang cập nhật ảnh cưới`} fill sizes="(max-width: 430px) 42vw, 181px" className="object-cover" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
