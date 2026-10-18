"use client";

import { useEffect, useState } from "react";

function parseDate(date: string, time: string) {
  const iso = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const dotted = date.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  const parts = iso ? [iso[1], iso[2], iso[3]] : dotted ? [dotted[3], dotted[2], dotted[1]] : null;
  if (!parts) return null;
  const clock = time.match(/^(\d{1,2}):(\d{2})$/);
  return new Date(`${parts[0]}-${parts[1]}-${parts[2]}T${clock ? `${clock[1].padStart(2, "0")}:${clock[2]}` : "00:00"}:00+07:00`).getTime();
}

function remaining(weddingDate: number) {
  const distance = Math.max(0, weddingDate - Date.now());
  return {
    days: Math.floor(distance / 86400000),
    hours: Math.floor((distance / 3600000) % 24),
    minutes: Math.floor((distance / 60000) % 60),
    seconds: Math.floor((distance / 1000) % 60),
  };
}

export function Countdown({ date, time: eventTime }: { date: string; time: string }) {
  const weddingDate = parseDate(date, eventTime);
  const [time, setTime] = useState<ReturnType<typeof remaining> | null>(null);

  useEffect(() => {
    if (weddingDate === null) return;
    setTime(remaining(weddingDate));
    const interval = window.setInterval(() => setTime(remaining(weddingDate)), 1000);
    return () => window.clearInterval(interval);
  }, [weddingDate]);

  if (time === null) return <p className="mt-6 font-vietnam text-base font-semibold text-wine">{date}</p>;

  return (
    <div className="mx-8 mt-10 grid grid-cols-4 divide-x divide-wine/25" aria-label="Đếm ngược đến ngày cưới">
      {Object.entries(time).map(([label, value]) => (
        <div key={label} className="px-1 py-2 text-center sm:px-3">
          <p className="font-vietnam tabular-nums text-2xl font-bold text-wine sm:text-4xl">{String(value).padStart(2, "0")}</p>
          <p className="mt-1 font-vietnam text-[9px] font-medium uppercase tracking-[.16em] text-wine/80 sm:text-[11px]">{label === "days" ? "DAY" : label === "hours" ? "HOUR" : label === "minutes" ? "MINUTE" : "SECOND"}</p>
        </div>
      ))}
    </div>
  );
}
