export { isCalendarDate, calendarRangeError } from "./validation/content";

export function calendarMonth(year: number, month: number) {
  const first = new Date(Date.UTC(year, month, 1));
  const offset = (first.getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return Array.from({ length: Math.ceil((offset + count) / 7) * 7 }, (_, index) => {
    const day = index - offset + 1;
    return day > 0 && day <= count ? `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}` : null;
  });
}

export type WeddingEvent = { id: string; date: string; title: string; lunarDate: string; time: string; household: string; address: string; mapUrl: string };
export type WeddingSchedule = { mealDate: string; mealLunarDate: string; lunarDate: string; ceremonyTime: string; families: { side: "groom" | "bride"; mealTime: string; address: string; mapUrl: string }[] };

export function weddingEvents(weddingDate: string, schedule: WeddingSchedule, variant?: "groom" | "bride"): WeddingEvent[] {
  const events: WeddingEvent[] = [];
  for (const family of schedule.families.filter((family) => !variant || family.side === variant)) {
    if (schedule.mealDate) events.push({ id: family.side + "-meal", date: schedule.mealDate, title: "Bữa cơm thân mật", lunarDate: schedule.mealLunarDate, time: family.mealTime, household: family.side === "groom" ? "Nhà trai" : "Nhà gái", address: family.address, mapUrl: family.mapUrl });
  }
  events.push({ id: "ceremony", date: weddingDate, title: "Ngày lễ thành hôn", lunarDate: schedule.lunarDate, time: schedule.ceremonyTime, household: variant === "bride" ? "Nhà gái" : variant === "groom" ? "Nhà trai" : "Nhà trai · Nhà gái", address: schedule.families.find((family) => family.side === (variant ?? "groom"))?.address ?? "", mapUrl: schedule.families.find((family) => family.side === (variant ?? "groom"))?.mapUrl ?? "" });
  return events;
}
