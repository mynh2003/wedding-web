"use client";

import Image from "next/image";
import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

const photos = ["left", "right", "center", "lower-left", "lower-right"];
const story = [
  ["Từ những ngày đầu gặp gỡ,", "chúng mình dần tìm thấy", "sự bình yên khi ở bên nhau."],
  ["Qua những vui buồn sẻ chia,", "tình yêu lớn lên từng ngày", "bằng lắng nghe và thấu hiểu."],
  ["Hôm nay, chúng mình chọn", "cùng vun đắp một mái ấm,", "cùng gìn giữ lời yêu thương."],
  ["Trân trọng từng chặng đường,", "biết ơn những người yêu quý", "đã cùng chứng kiến ngày vui."],
];

export function LoveStory({ images = [] }: { images?: (string | undefined)[] }) {
  const section = useRef<HTMLElement>(null);
  const container = useRef<HTMLElement>(null);
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
      <header className="love-story-heading">
        <h2 id="love-story-title">The Love Story of Us</h2>
        <div className="love-story-description-window" aria-hidden="true">
          <motion.div style={{ y: reduced ? 0 : textY }}>
            {story.map((lines, index) => <p className="love-story-description-page wedding-description invitation-copy" key={index}>{lines.join(" ")}</p>)}
          </motion.div>
        </div>
        <div className="love-story-accessible-copy wedding-description invitation-copy sr-only">
          {story.map((lines, index) => <p key={index}>{lines.join(" ")}</p>)}
        </div>
      </header>
      <div className="love-story-review-field">
        {photos.map((position, index) => (
          <div key={position} className={'love-story-review love-story-review--' + position}>
            <div className="love-story-review-image">
              <Image src={images[index] || "/placeholders/hero-gray.svg"} unoptimized={!!images[index]} alt={`Ảnh ${index + 1} — đang cập nhật ảnh cưới`} fill sizes="(max-width: 430px) 42vw, 181px" className="object-cover" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
