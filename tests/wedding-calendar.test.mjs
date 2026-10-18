import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const require = createRequire(import.meta.url);
function load(file, dependencies = {}) {
  const source = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports = {};
  vm.runInNewContext(source, { exports, Uint8Array, TextDecoder, require: (name) => dependencies[name] ?? require(name) });
  return exports;
}
const validation = load("lib/validation/content.ts");
const calendar = load("lib/wedding-calendar.ts", { "./validation/content": validation });
const { WeddingCalendar } = load("components/wedding-calendar.tsx", {
  "@/lib/wedding-calendar": calendar,
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

test("banner marks inclusive days, defaults to wedding day and permits cross-year navigation", () => {
  const render = (props) => renderToStaticMarkup(React.createElement(WeddingCalendar, props));
  const countHearts = (html) => (html.match(/ngày cưới được đánh dấu/g) ?? []).length;
  assert.equal(countHearts(render({ weddingDate: "2026-10-18" })), 1);
  assert.equal(countHearts(render({ weddingDate: "2026-10-18", startDate: "2026-10-17", endDate: "2026-10-19" })), 3);
  const yearEnd = render({ weddingDate: "2026-12-31", startDate: "2026-12-30", endDate: "2027-01-02" });
  assert.equal(countHearts(yearEnd), 2);
  assert.match(yearEnd, /aria-label="Tháng sau" class=/);
  assert.equal(render({ weddingDate: "" }), "");
});
