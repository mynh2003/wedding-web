"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
export function InvitationDialog({ open, onClose, titleId, children }: { open: boolean; onClose: () => void; titleId: string; children: ReactNode }) {
  const closeCallback = useRef(onClose);
  closeCallback.current = onClose;
  const dialog = useRef<HTMLDialogElement>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [closing, setClosing] = useState(false);
  const requestClose = () => setClosing(true);
  const finishClose = () => {
    dialog.current?.close();
    setClosing(false);
    closeCallback.current();
  };

  useEffect(() => {
    if (!closing) return;
    // Animation events may be cancelled by a preference change or stylesheet
    // update. Always release the modal and its scroll lock in that case.
    const timeout = window.setTimeout(() => {
      dialog.current?.close();
      setClosing(false);
      closeCallback.current();
    }, 400);
    return () => window.clearTimeout(timeout);
  }, [closing]);

  useEffect(() => {
    if (!open || !mounted) return;
    const element = dialog.current;
    const scroller = document.querySelector<HTMLElement>(".mobile-landing");
    const previousBody = document.body.style.overflow;
    const previousScroller = scroller?.style.overflow;
    if (!element?.open) {
      element?.showModal();
      // Keep initial modal focus off the map link so its keyboard ring does not
      // appear as a second border immediately after opening.
      element?.focus({ preventScroll: true });
    }
    document.body.style.overflow = "hidden";
    if (scroller) scroller.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = previousBody;
      if (scroller) scroller.style.overflow = previousScroller ?? "";
    };
  }, [open, mounted]);

  if (!mounted) return null;
  return createPortal(<dialog ref={dialog} tabIndex={-1} aria-labelledby={titleId} data-closing={closing} onAnimationEnd={(event) => { if (event.target === event.currentTarget && event.animationName === "gift-dialog-close" && closing) finishClose(); }} onCancel={(event) => { event.preventDefault(); requestClose(); }}  onClick={(event) => { if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) requestClose(); } }} className="gift-dialog fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-[398px] overflow-y-auto rounded-none border-0 cream-paper p-0 text-wine shadow-2xl ">

      {open && children}
    </dialog>, document.body);
}
