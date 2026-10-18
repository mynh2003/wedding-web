"use client";

import Image from "next/image";
import { useState } from "react";
import { calendarMonth, calendarRangeError, isCalendarDate } from "@/lib/wedding-calendar";

export function WeddingCalendar({ weddingDate, startDate, endDate, imageUrl }: { weddingDate: string; startDate?: string; endDate?: string; imageUrl?: string }) {
  const validRange = !!startDate && !!endDate && !calendarRangeError(startDate, endDate);
  const start = validRange ? startDate : weddingDate;
  const end = validRange ? endDate : weddingDate;
  const initial = isCalendarDate(weddingDate) ? weddingDate : isCalendarDate(start) ? start : "";
  const [monthOffset, setMonthOffset] = useState(0);
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

  return <section aria-label="Lịch ngày cưới" className="wedding-month-banner relative isolate aspect-[6/7] w-full overflow-hidden bg-cream text-white">
    {imageUrl && <Image src={imageUrl} alt="Ảnh kỷ niệm ngày cưới" fill sizes="(max-width: 430px) 100vw, 430px" className="object-cover" />}
    <div className="relative flex h-full flex-col justify-center px-[7%] py-[4%] text-center">
      <p aria-label="SAVE The DATE" className="wedding-month-banner__title flex items-baseline justify-center gap-[.18em] whitespace-nowrap">
        <span>SAVE</span><span className="wedding-month-banner__title-script">The</span><span>DATE</span>
      </p>
      <div className="my-2 flex items-center justify-center gap-4">
        <button type="button" aria-label="Tháng trước" disabled={currentMonth <= firstMonth} onClick={() => setMonthOffset((value) => value - 1)} className="grid h-8 w-8 place-items-center rounded-full border border-wine/20 disabled:invisible focus-visible:outline focus-visible:outline-2">‹</button>
        <h2 aria-live="polite" className="font-display text-[clamp(16px,5vw,21px)]">{monthLabel}</h2>
        <button type="button" aria-label="Tháng sau" disabled={currentMonth >= lastMonth} onClick={() => setMonthOffset((value) => value + 1)} className="grid h-8 w-8 place-items-center rounded-full border border-wine/20 disabled:invisible focus-visible:outline focus-visible:outline-2">›</button>
      </div>
      <table className="mx-auto w-[90%] table-fixed font-body text-[clamp(12px,3.5vw,15px)]" aria-label={monthLabel}>
        <thead><tr>{["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((day) => <th key={day} scope="col" className="pb-1 font-medium">{day}</th>)}</tr></thead>
        <tbody>{Array.from({ length: days.length / 7 }, (_, row) => <tr key={row}>{days.slice(row * 7, row * 7 + 7).map((day, column) => {
          const marked = !!day && day >= start && day <= end;
          return <td key={column} className="p-0"><span className="relative mx-auto grid h-[clamp(23px,7.3vw,32px)] w-[clamp(26px,8.2vw,36px)] place-items-center" aria-label={day ? `${day}${marked ? ", ngày cưới được đánh dấu" : ""}` : undefined}>
            {marked && <svg aria-hidden="true" viewBox="0 0 40 38" className="wedding-calendar-heart absolute inset-0 h-full w-full fill-wine"><path d="M20 35S2 24 2 12C2 1 15-1 20 8 25-1 38 1 38 12c0 12-18 23-18 23Z" /></svg>}
            <span className="relative">{day ? Number(day.slice(-2)) : ""}</span>
          </span></td>;
        })}</tr>)}</tbody>
      </table>
    </div>
  </section>;
}
