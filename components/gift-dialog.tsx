"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

export type GiftRecipient = { side: "bride" | "groom"; name: string; banner: string; qr: string; bank: string; accountName: string; accountNumber: string };

export function GiftDialog({ recipients }: { recipients: GiftRecipient[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const requestClose = () => setClosing(true);
  const [selected, setSelected] = useState(0);
  const recipient = recipients[selected];

  useEffect(() => {
    if (!open) return;
    const element = dialog.current;
    const scroller = element?.closest<HTMLElement>(".mobile-landing");
    const previousBody = document.body.style.overflow;
    const previousScroller = scroller?.style.overflow;
    element?.showModal();
    document.body.style.overflow = "hidden";
    if (scroller) scroller.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = previousBody;
      if (scroller) scroller.style.overflow = previousScroller ?? "";
    };
  }, [open]);

  return <div className="mt-14 text-center">
    <h2 className="font-display text-[20px] font-medium uppercase tracking-normal text-wine">Gửi quà mừng cưới</h2>
    <button type="button" aria-label="Mở hộp thoại gửi quà mừng cưới" aria-haspopup="dialog" onClick={() => { setClosing(false); setOpen(true); }} className="gift-box-trigger mx-auto mt-4 block w-full max-w-[280px] rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine focus-visible:ring-offset-4">
      <Image src="/assets/wedding-gift-mh-v2.png" alt="Hộp quà màu đỏ burgundy với nơ lụa và monogram MH chung nét dọc" width={1024} height={1024} sizes="280px" className="gift-box-image h-auto w-full" />
    </button>
    <dialog ref={dialog} aria-labelledby="gift-title" data-closing={closing} onAnimationEnd={(event) => { if (event.target === event.currentTarget && event.animationName === "gift-dialog-close" && closing) { setOpen(false); setClosing(false); } }} onCancel={(event) => { event.preventDefault(); requestClose(); }} onClose={() => { setOpen(false); setClosing(false); }} onClick={(event) => { if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) requestClose(); } }} className="gift-dialog fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-[398px] overflow-y-auto rounded-none border-0 cream-paper p-0 text-wine shadow-2xl ">
      {open && recipient && <>
        <div className="relative aspect-[4/3] overflow-hidden">
          {/* Configured public image URLs can use any storage host. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={recipient.banner} alt={`Ảnh cưới ${recipient.name}`} className="h-full w-full object-cover" />
        </div>
        <div className="p-4">
          <h2 id="gift-title" className="sr-only">Gửi quà mừng cưới</h2>
          {recipients.length > 1 && <div className="mb-4 flex justify-center gap-2" aria-label="Chọn người nhận">{recipients.map((item, index) => <button key={item.side} type="button" aria-pressed={index === selected} onClick={() => setSelected(index)} className={`rounded-full px-4 py-2 text-xs ${index === selected ? "bg-wine text-cream" : "text-wine"}`}>{item.side === "bride" ? "Nhà gái" : "Nhà trai"}</button>)}</div>}
          <section aria-label="Thông tin chuyển khoản" className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.8fr)] items-center gap-4 text-left">
              <div className="min-w-0">
                {recipient.qr ? <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img key={recipient.qr} src={recipient.qr} alt={`Mã QR chuyển khoản của ${recipient.name}`} className="block aspect-square w-full bg-white object-contain" />
                </> : <p className="grid aspect-square place-items-center text-xs leading-5 text-wine/60">QR đang được cập nhật</p>}
              </div>
              <div className="min-w-0 break-words font-display leading-snug">
                <p className="text-[20px]">{recipient.side === "bride" ? "Cô dâu" : "Chú rể"}</p>
                <dl>
                  <div className="border-b border-wine/40 pb-2">
                    <dt className="sr-only">Chủ tài khoản</dt>
                    <dd className="text-[18px] uppercase">{recipient.accountName || recipient.name}</dd>
                  </div>
                  <div className="mt-2">
                    <dt className="sr-only">Ngân hàng</dt>
                    <dd className="text-[16px]">{recipient.bank || "Đang cập nhật"}</dd>
                  </div>
                  <div className="mt-1">
                    <dt className="sr-only">Số tài khoản</dt>
                    <dd className="select-all break-all text-[16px] tabular-nums">{recipient.accountNumber || "Đang cập nhật"}</dd>
                  </div>
                </dl>
              </div>
          </section>
          <p className="mt-4 text-xs leading-5 text-wine/70">Cảm ơn bạn đã gửi yêu thương đến chúng mình!</p>
        </div>
      </>}
    </dialog>
  </div>;
}

