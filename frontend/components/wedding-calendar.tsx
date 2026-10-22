"use client";


import { useEffect, useRef, useState } from "react";
import { calendarMonth, isCalendarDate, weddingEvents, type WeddingSchedule } from "@/lib/wedding-calendar";

import { InvitationDialog } from "@/components/invitation-dialog";
import { ProgressiveImage as Image, ScrollZoom } from "@/components/scroll-zoom";
import { Reveal } from "@/components/reveal";

export function WeddingCalendar({ weddingDate, schedule, imageUrl, variant }: { variant?: "groom" | "bride"; weddingDate: string; schedule?: WeddingSchedule; imageUrl?: string }) {
  const events = weddingEvents(weddingDate, schedule ?? { mealDate: "", mealLunarDate: "", lunarDate: "", ceremonyTime: "", families: [] }, variant).filter((event) => isCalendarDate(event.date));
  const dates = events.map((event) => event.date).sort();
  const start = dates[0] ?? weddingDate;
  const end = dates[dates.length - 1] ?? weddingDate;
  const initial = isCalendarDate(weddingDate) ? weddingDate : isCalendarDate(start) ? start : "";
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [monthOffset, setMonthOffset] = useState(0);
  const section = useRef<HTMLElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const photo = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!section.current || !card.current || !photo.current) return;
    const scroller = section.current.closest<HTMLElement>(".mobile-landing");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const updateProgress = () => {
      frame = 0;
      if (!section.current || !card.current || !photo.current) return;
      const cardRect = card.current.getBoundingClientRect();
      const photoRect = photo.current.getBoundingClientRect();
      const distance = (photoRect.height + cardRect.height) / 2;
      const progress = reduced.matches ? 0 : Math.max(0, Math.min(1, (cardRect.bottom - photoRect.top) / distance));
      section.current.style.setProperty("--calendar-shrink", String(progress));
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(updateProgress); };
    const update = () => {
      const height = card.current!.offsetHeight;
      section.current!.style.setProperty("--calendar-viewport", (scroller?.clientHeight ?? window.innerHeight) + "px");
      section.current!.style.setProperty("--calendar-height", height + "px");
      // End the sticky track where the card and banner centers coincide.
      section.current!.style.setProperty("--calendar-bottom", Math.max(0, (photo.current!.offsetHeight - height) / 2) + "px");
      updateProgress();
    };
    const observer = new ResizeObserver(update);
    observer.observe(card.current);
    observer.observe(photo.current);
    if (scroller) observer.observe(scroller);
    update();
    scroller?.addEventListener("scroll", onScroll, { passive: true });
    reduced.addEventListener("change", updateProgress);
    return () => {
      observer.disconnect();
      scroller?.removeEventListener("scroll", onScroll);
      reduced.removeEventListener("change", updateProgress);
      cancelAnimationFrame(frame);
    };
  }, [initial]);
  if (!initial) return null;
  const date = new Date(`${initial}T00:00:00Z`);
  const monthDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + monthOffset, 1));
  const year = monthDate.getUTCFullYear();
  const month = monthDate.getUTCMonth();
  const days = calendarMonth(year, month);
  const monthLabel = `Tháng ${month + 1} · ${year}`;
  const firstMonth = Math.min(Number(initial.slice(0, 4)) * 12 + Number(initial.slice(5, 7)), Number(start.slice(0, 4)) * 12 + Number(start.slice(5, 7)));
  const lastMonth = Math.max(Number(initial.slice(0, 4)) * 12 + Number(initial.slice(5, 7)), Number(end.slice(0, 4)) * 12 + Number(end.slice(5, 7)));
  const currentMonth = year * 12 + month + 1;

  return <section ref={section} aria-label="Lịch ngày cưới" className="wedding-month-banner relative isolate w-full bg-cream text-wine">
    <div className="wedding-month-banner__track">
    <div ref={card} className="wedding-month-banner__sticky">
    <Reveal className="wedding-month-banner__calendar flex flex-col justify-center text-center">
      <p aria-label="SAVE The DATE" className="wedding-month-banner__title flex items-baseline justify-center gap-[.18em] whitespace-nowrap">
        <span>SAVE</span><span className="wedding-month-banner__title-script">The</span><span>DATE</span>
      </p>
      <div className="my-2 flex items-center justify-center gap-4">
        <button type="button" aria-label="Tháng trước" disabled={currentMonth <= firstMonth} onClick={() => setMonthOffset((value) => value - 1)} className="grid h-8 w-8 place-items-center rounded-full border border-white/30 disabled:invisible focus-visible:outline focus-visible:outline-2">‹</button>
        <h2 aria-live="polite" className="font-display text-[clamp(16px,5vw,21px)]">{monthLabel}</h2>
        <button type="button" aria-label="Tháng sau" disabled={currentMonth >= lastMonth} onClick={() => setMonthOffset((value) => value + 1)} className="grid h-8 w-8 place-items-center rounded-full border border-white/30 disabled:invisible focus-visible:outline focus-visible:outline-2">›</button>
      </div>
      <table className="mx-auto w-[90%] table-fixed font-body text-[clamp(12px,3.5vw,15px)]" aria-label={monthLabel}>
        <thead><tr>{["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((day) => <th key={day} scope="col" className="pb-1 font-medium">{day}</th>)}</tr></thead>
        <tbody>{Array.from({ length: days.length / 7 }, (_, row) => <tr key={row}>{days.slice(row * 7, row * 7 + 7).map((day, column) => {
          const marked = !!day && events.some((event) => event.date === day);
          const Day = marked ? "button" : "span";
          return <td key={column} className="p-0"><Day type={marked ? "button" : undefined} aria-haspopup={marked ? "dialog" : undefined} onClick={marked ? () => setSelectedDate(day) : undefined} className="relative mx-auto grid h-[clamp(23px,7.3vw,32px)] w-[clamp(26px,8.2vw,36px)] place-items-center" aria-label={day ? `${day}${marked ? ", ngày cưới được đánh dấu" : ""}` : undefined}>
            {marked && <svg aria-hidden="true" viewBox="0 0 40 38" className="wedding-calendar-heart absolute inset-0 h-full w-full fill-wine"><path d="M20 35S2 24 2 12C2 1 15-1 20 8 25-1 38 1 38 12c0 12-18 23-18 23Z" /></svg>}
            <span className={marked ? "relative z-10 font-semibold text-cream" : "relative"}>{day ? Number(day.slice(-2)) : ""}</span>
          </Day></td>;
        })}</tr>)}</tbody>
      </table>
    </Reveal>
    </div>
    </div>
    <div ref={photo} className="wedding-month-banner__photo relative mt-6 aspect-[6/7] w-full overflow-hidden">
      {imageUrl && <ScrollZoom parallax={.035}><Image src={imageUrl} alt="Ảnh kỷ niệm ngày cưới" fill sizes="(max-width: 430px) 100vw, 430px" className="object-cover" /></ScrollZoom>}
    </div>
    <InvitationDialog open={selectedDate !== null} onClose={() => setSelectedDate(null)} titleId="calendar-event-title">
      <div className="p-6 text-center">
        <h2 id="calendar-event-title" className="font-display text-2xl uppercase">Thông tin ngày vui</h2>
        <div className="mt-5 space-y-6">{events.filter((event) => event.date === selectedDate).map((event) => <article key={event.id} className="border-t border-wine/20 pt-4">
          <h3 className="font-display text-xl uppercase">{event.title}</h3>
          <p className="mt-1 text-[14px] font-bold uppercase leading-[1.6]" style={{ fontFamily: "var(--font-lora), Georgia, serif" }}>{event.household}</p>
          <div className="mt-3 flex flex-col items-center font-normal leading-[1.6] tracking-[1px] tabular-nums" style={{ fontFamily: "var(--font-lora), Georgia, serif" }}>
            <div aria-label={event.date.split("-").reverse().join("/")} className="invitation-calendar mx-auto grid w-full max-w-[290px] grid-cols-[minmax(0,1fr)_80px_minmax(0,1fr)] items-center text-center uppercase">
              <span className="invitation-calendar__side">Tháng {Number(event.date.slice(5, 7))}</span>
              <span className="text-[46.54px] font-normal leading-[1.6] tracking-[1px]">{event.date.slice(8, 10)}</span>
              <span className="invitation-calendar__side">Năm {event.date.slice(0, 4)}</span>
            </div>
            <p className={event.time ? "text-[clamp(30px,10vw,46.54px)]" : "text-xl"}>{event.time || "Giờ đang cập nhật"}</p>
          </div>
          <p className="mt-1 text-sm italic">{event.lunarDate || "Đang cập nhật"}</p>
          <p className="mt-3 whitespace-pre-line text-sm">{event.address || "Địa điểm đang cập nhật"}</p>
          {/^https?:\/\//i.test(event.mapUrl) && <a href={event.mapUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-full border border-wine/35 px-4 py-2 text-[13px] font-semibold normal-case tracking-wide text-wine transition-colors duration-200 hover:border-wine hover:bg-wine hover:text-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine focus-visible:ring-offset-2"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0"><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /><circle cx="12" cy="10" r="2.25" stroke="currentColor" strokeWidth="1.7" /></svg><span>Xem bản đồ</span></a>}
        </article>)}</div>
      </div>
    </InvitationDialog>
  </section>;
}
