import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const require = createRequire(import.meta.url);
const animationComponents = {
  "@/components/reveal": { Reveal: ({ children }) => children },
  "@/components/scroll-zoom": { ScrollZoom: ({ children }) => children },
};
function load(file, dependencies = {}) {
  const source = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports = {};
  vm.runInNewContext(source, { exports, Uint8Array, TextDecoder, require: (name) => dependencies[name] ?? animationComponents[name] ?? (name === "server-only" ? {} : name === "@/lib/http/body" ? load("backend/lib/http/body.ts") : name === "@/lib/dress-code" ? load("backend/lib/dress-code.ts") : require(name)) });
  return exports;
}
const validation = load("backend/lib/validation/content.ts");
const calendar = load("frontend/lib/wedding-calendar.ts", { "./validation/content": validation });
const { WeddingCalendar } = load("frontend/components/wedding-calendar.tsx", {
  "@/lib/wedding-calendar": calendar,
  "@/components/invitation-dialog": load("frontend/components/invitation-dialog.tsx"),
  "next/image": { default: () => null, __esModule: true },
});

test("calendar dates validate leap years and reject impossible or reversed ranges", () => {
  assert.equal(validation.isCalendarDate("2028-02-29"), true);
  assert.equal(validation.isCalendarDate("2026-02-29"), false);
  assert.equal(validation.isCalendarDate("2026-04-31"), false);
  for (const [start, end] of [["2026-10-19", "2026-10-18"], ["2026-10-18", ""], ["", "2026-10-18"], ["2026-02-30", "2026-03-01"]]) {
    assert.ok("error" in validation.parseContentInput({ sectionKey: "families", content: { calendar_start_date: start, calendar_end_date: end }, isPublished: true }));
  }
  for (const [start, end] of [["", ""], ["2026-10-18", "2026-10-18"], ["2026-12-31", "2027-01-02"]]) {
    assert.ok("value" in validation.parseContentInput({ sectionKey: "families", content: { calendar_start_date: start, calendar_end_date: end }, isPublished: true }));
  }
});

test("calendar aligns Monday-first, includes leap day and six-row months", () => {
  const february = calendar.calendarMonth(2028, 1);
  assert.equal(february[0], null);
  assert.equal(february[1], "2028-02-01");
  assert.ok(february.includes("2028-02-29"));
  assert.equal(calendar.calendarMonth(2026, 2).length, 42);
  assert.equal(calendar.calendarMonth(2027, 1).length, 28);
});

const schedule = {
  mealDate: "2026-12-30", mealLunarDate: "22 tháng 11 năm Bính Ngọ", lunarDate: "23 tháng 11 năm Bính Ngọ", ceremonyTime: "09:00",
  families: [
    { side: "groom", mealTime: "17:00", address: "Nhà trai", mapUrl: "https://example.com/groom" },
    { side: "bride", mealTime: "18:00", address: "Nhà gái", mapUrl: "https://example.com/bride" },
  ],
};

test("schedule shares both dates and lunar dates, keeps meal times separate and has one groom ceremony", () => {
  const events = calendar.weddingEvents("2027-01-02", schedule);
  assert.equal(events.length, 3);
  assert.equal(events[0].date, events[1].date);
  assert.equal(events[0].lunarDate, schedule.mealLunarDate);
  assert.equal(events[1].lunarDate, schedule.mealLunarDate);
  assert.equal(events[0].time, "17:00");
  assert.equal(events[1].time, "18:00");
  assert.equal(events[2].title, "Ngày lễ thành hôn");
  assert.equal(events[2].time, "09:00");
  assert.equal(events[2].address, "Nhà trai");
  assert.equal(events[2].date, "2027-01-02");
  assert.equal(events[2].lunarDate, schedule.lunarDate);
});

test("banner only marks event dates as dialog buttons and permits cross-year navigation", () => {
  const render = (props) => renderToStaticMarkup(React.createElement(WeddingCalendar, props));
  const countHearts = (html) => (html.match(/ngày cưới được đánh dấu/g) ?? []).length;
  assert.equal(countHearts(render({ weddingDate: "2026-10-18" })), 1);
  const html = render({ weddingDate: "2026-12-31", schedule: { ...schedule, mealDate: "2026-12-29" } });
  assert.equal(countHearts(html), 2);
  assert.equal((html.match(/aria-haspopup="dialog"/g) ?? []).length, 2);
  assert.match(render({ weddingDate: "2027-01-02", schedule }), /aria-label="Tháng trước" class=/);
  assert.equal(render({ weddingDate: "" }), "");
});

test("backend validates meal dates and times and drops obsolete bride ceremony", () => {
  const parse = (content) => validation.parseContentInput({ sectionKey: "families", content, isPublished: true });
  for (const content of [{ meal_date: "2026-02-30" }, { groom_meal_time: "24:00" }, { bride_meal_time: "09:60" }]) assert.ok("error" in parse(content));
  const result = parse({ meal_date: "2028-02-29", meal_lunar_date_text: "Ngày âm", groom_meal_time: "17:00", bride_meal_time: "18:00", bride_ceremony_name: "Lễ vu quy", bride_ceremony_time: "10:00" });
  assert.ok("value" in result);
  assert.equal(result.value.content.meal_lunar_date_text, "Ngày âm");
  assert.equal(result.value.content.bride_ceremony_name, undefined);
  assert.equal(result.value.content.bride_ceremony_time, undefined);
});

test("selected date dialog includes both meal times and lunar dates, including same-day ceremony", () => {
  const { WeddingCalendar: SelectedCalendar } = load("frontend/components/wedding-calendar.tsx", {
    "react": { ...React, useState: (initial) => [initial === null ? "2026-12-30" : initial, () => {}] },
    "@/lib/wedding-calendar": calendar,
    "@/components/invitation-dialog": { InvitationDialog: ({ open, children }) => open ? React.createElement("dialog", { open: true }, children) : null },
    "next/image": { default: () => null, __esModule: true },
  });
  const html = renderToStaticMarkup(React.createElement(SelectedCalendar, { weddingDate: "2026-12-30", schedule }));
  for (const text of ["Bữa cơm thân mật", "Ngày lễ thành hôn", "17:00", "18:00", "09:00", "30/12/2026", schedule.mealLunarDate, schedule.lunarDate, "https://example.com/groom"]) assert.ok(html.includes(text), text);
  assert.equal((html.match(/Bữa cơm thân mật/g) ?? []).length, 2);
});


test("side links only show their own household events and map", () => {
  for (const side of ["bride", "groom"]) {
    const events = calendar.weddingEvents("2027-01-02", schedule, side);
    const family = schedule.families.find((item) => item.side === side);
    assert.equal(events.length, 2);
    assert.equal(events[0].id, side + "-meal");
    assert.equal(events[0].time, family.mealTime);
    for (const event of events) {
      assert.equal(event.address, family.address);
      assert.equal(event.mapUrl, family.mapUrl);
      assert.equal(event.household, side === "bride" ? "Nhà gái" : "Nhà trai");
    }
  }
});
