"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

export function CoverGate() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "" : "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  function openInvitation() {
    setOpen(true);
    window.dispatchEvent(new Event("wedding:opened"));
  }

  return (
    <AnimatePresence>
      {!open && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center overflow-hidden bg-wine px-6 text-center text-cream"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.7 } }}
        >
          <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_25%_20%,#d4af37,transparent_28%),radial-gradient(circle_at_80%_90%,#000,transparent_42%)]" />
          <motion.div className="relative max-w-md" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .8 }}>
            <p className="text-xs uppercase tracking-[.4em] text-gold">Một lời mời trân trọng</p>
            <div className="mx-auto my-8 grid h-28 w-28 place-items-center rounded-full border border-gold/60 font-display text-5xl italic text-gold">M<span className="text-2xl">&amp;</span>H</div>
            <p className="font-display text-3xl italic">Trân trọng kính mời bạn</p>
            <p className="mt-3 text-sm leading-7 text-cream/65">đến chung vui trong ngày hạnh phúc của Minh và Hương</p>
            <button onClick={openInvitation} className="group mt-10 inline-flex items-center gap-3 rounded-full border border-gold/70 px-7 py-3.5 text-sm font-semibold text-cream transition hover:bg-gold hover:text-ink focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2 focus:ring-offset-wine">
              Mở thiệp <span className="transition-transform group-hover:translate-x-1">→</span>
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
