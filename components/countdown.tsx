"use client";

import { useEffect, useState } from "react";

const weddingDate = new Date("2026-11-22T09:30:00+07:00").getTime();

function remaining() {
  const distance = Math.max(0, weddingDate - Date.now());
  return {
    days: Math.floor(distance / 86400000),
    hours: Math.floor((distance / 3600000) % 24),
    minutes: Math.floor((distance / 60000) % 60),
    seconds: Math.floor((distance / 1000) % 60),
  };
}

export function Countdown() {
  const [time, setTime] = useState(remaining);

  useEffect(() => {
    const interval = window.setInterval(() => setTime(remaining()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="mt-10 grid grid-cols-4 gap-2 sm:gap-4" aria-label="Đếm ngược đến ngày cưới">
      {Object.entries(time).map(([label, value]) => (
        <div key={label} className="rounded-xl border border-gold/30 bg-cream/10 px-2 py-4 text-center backdrop-blur-sm sm:px-4">
          <p className="font-display text-3xl text-gold sm:text-5xl">{String(value).padStart(2, "0")}</p>
          <p className="mt-1 text-[9px] uppercase tracking-[.2em] text-cream/60">{label === "days" ? "ngày" : label === "hours" ? "giờ" : label === "minutes" ? "phút" : "giây"}</p>
        </div>
      ))}
    </div>
  );
}
