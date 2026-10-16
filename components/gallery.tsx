"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

const photos = [
  { src: "/placeholders/ring-portrait.svg", alt: "Placeholder nét vẽ nhẫn cưới", className: "md:row-span-2" },
  { src: "/placeholders/ring-detail.svg", alt: "Placeholder chi tiết đôi nhẫn", className: "" },
  { src: "/placeholders/ring-wide.svg", alt: "Placeholder album nét vẽ nhẫn", className: "" },
  { src: "/placeholders/ring-hero.svg", alt: "Placeholder không gian ngày cưới", className: "md:col-span-2" },
];

export function Gallery() {
  const [selected, setSelected] = useState<number | null>(null);
  return (
    <>
      <div className="grid auto-rows-[180px] grid-cols-2 gap-3 md:auto-rows-[220px] md:grid-cols-3">
        {photos.map((photo, index) => (
          <button key={photo.src} onClick={() => setSelected(index)} className={`group relative overflow-hidden rounded-xl bg-wine/10 text-left ${photo.className}`} aria-label={`Mở ảnh: ${photo.alt}`}>
            <Image src={photo.src} alt={photo.alt} fill sizes="(max-width: 768px) 50vw, 33vw" className="object-cover transition duration-500 ease-out group-hover:scale-105" loading="lazy" />
            <span className="absolute inset-0 bg-wine/0 transition group-hover:bg-wine/15" />
          </button>
        ))}
      </div>
      <AnimatePresence>
        {selected !== null && (
          <motion.div className="fixed inset-0 z-50 grid place-items-center bg-ink/90 p-6 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelected(null)}>
            <motion.div className="relative h-[min(80vh,700px)] w-full max-w-3xl" initial={{ scale: .95 }} animate={{ scale: 1 }} onClick={(event) => event.stopPropagation()}>
              <Image src={photos[selected].src} alt={photos[selected].alt} fill sizes="90vw" className="object-contain" priority />
              <button onClick={() => setSelected(null)} className="absolute right-0 top-0 rounded-full bg-cream px-3 py-1 text-xl text-ink" aria-label="Đóng ảnh">×</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
