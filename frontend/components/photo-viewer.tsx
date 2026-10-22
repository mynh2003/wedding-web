"use client";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";

type PhotoViewerProps = {
  photos: { src: string; alt: string }[];
  viewerIndex: number | null;
  setViewerIndex: Dispatch<SetStateAction<number | null>>;
};

export function PhotoViewer({ photos, viewerIndex, setViewerIndex }: PhotoViewerProps) {
  const reduceMotion = useReducedMotion();
  const [closing, setClosing] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const viewerImageRef = useRef<HTMLDivElement>(null);
  const viewerGesture = useRef({ x: 0, y: 0, left: 0, top: 0, moved: false });
  const viewerOpen = viewerIndex !== null;
  const finishClose = useCallback(() => {
    // Remove the dialog from the top layer before clearing the exit styles or
    // zoom. Otherwise the opening animation can restart for a visible frame.
    dialogRef.current?.close();
    setViewerIndex(null);
    setClosing(false);
    setZoomed(false);
  }, [setViewerIndex]);

  useEffect(() => {
    if (!closing || !viewerOpen) return;
    const timeout = window.setTimeout(finishClose, reduceMotion ? 50 : 360);
    return () => window.clearTimeout(timeout);
  }, [closing, viewerOpen, finishClose, reduceMotion]);

  useEffect(() => {
    const image = viewerImageRef.current;
    if (!image) return;
    image.scrollTo({ left: zoomed ? (image.scrollWidth - image.clientWidth) / 2 : 0, top: zoomed ? (image.scrollHeight - image.clientHeight) / 2 : 0 });
  }, [zoomed, viewerIndex]);

  useEffect(() => {
    if (!viewerOpen) return;
    const dialog = dialogRef.current;
    const scroller = dialogRef.current?.closest<HTMLElement>(".mobile-landing");
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
  return (
      <dialog ref={dialogRef} className="album-viewer" aria-label="Gallery ảnh cưới phóng to" data-closing={closing}
        onAnimationEnd={(event) => {
          if (event.target === event.currentTarget && event.animationName === "album-viewer-close") {
            finishClose();
          }
        }}
        onClose={() => { if (!dialogRef.current?.open) { setViewerIndex(null); setClosing(false); setZoomed(false); } }}
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
  );
}
