import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const require = createRequire(import.meta.url);
function load(file, dependencies = {}) {
  const source = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports = {};
  vm.runInNewContext(source, { exports, process, console, require: (name) => dependencies[name] ?? (name === "@/lib/dress-code" ? load("lib/dress-code.ts") : require(name)) });
  return exports;
}
const copy = load("lib/invitation-copy.ts");
const validation = load("lib/validation/content.ts");
const custom = { quote_text: "Một câu mới <script>alert(1)</script>", story_pages: ["Gặp gỡ", "Sẻ chia", "Mái ấm", "Ngày vui"], rsvp_text: "Mời bạn xác nhận\ntham dự.", thank_you_text: "Cảm ơn bạn!\nHẹn gặp ngày vui." };

test("copy preserves line breaks and falls back per empty or invalid field without mutating defaults", () => {
  assert.equal(copy.resolveInvitationCopy(custom).thank_you_text, custom.thank_you_text);
  const resolved = copy.resolveInvitationCopy({ quote_text: "  ", story_pages: ["Ngày gặp nhau", "", 42] });
  assert.equal(resolved.quote_text, copy.defaultInvitationCopy.quote_text);
  assert.equal(resolved.story_pages[0], "Ngày gặp nhau");
  assert.equal(resolved.story_pages[1], copy.defaultInvitationCopy.story_pages[1]);
  assert.equal(resolved.story_pages[2], copy.defaultInvitationCopy.story_pages[2]);
  resolved.story_pages[0] = "changed";
  assert.notEqual(copy.defaultInvitationCopy.story_pages[0], "changed");
});

test("copy validation requires four story pages, plain strings, and server-side length limits", () => {
  const parse = (content) => validation.parseContentInput({ sectionKey: "copy", content, isPublished: true });
  assert.ok("value" in parse(custom));
  assert.ok("value" in parse({ ...custom, quote_text: "", story_pages: ["", "", "", ""] }));
  for (const content of [{ ...custom, quote_text: [] }, { ...custom, quote_text: "a".repeat(2001) }, { ...custom, story_pages: ["one"] }, { ...custom, story_pages: ["a".repeat(501), "", "", ""] }, { ...custom, story_pages: [{ text: "invalid" }, "", "", ""] }]) {
    assert.ok("error" in parse(content));
  }
});

test("admin saves copy in the current wedding and all invitation variants receive the saved content safely", async () => {
  let saved;
  const { PUT } = load("app/api/admin/content/route.ts", {
    "@/lib/auth/admin": { getAdmin: async () => ({ admin: { wedding_id: "wedding-a" }, supabase: { from: () => ({ upsert: (row) => {
      assert.equal(row.wedding_id, "wedding-a"); saved = row;
      return { select: () => ({ single: async () => ({ data: row, error: null }) }) };
    } }) } }) },
    "@/lib/validation/content": validation,
    "next/cache": { revalidatePath: () => undefined },
  });
  const response = await PUT(new Request("https://admin.example/api/admin/content", { method: "PUT", body: JSON.stringify({ sectionKey: "copy", content: custom, isPublished: true }) }));
  assert.equal(response.status, 200);
  assert.equal(saved.section_key, "copy");
  assert.equal(saved.is_published, true);

  const deps = {
    "@/components/inertial-scroll": { InertialScroll: () => null },
    "@/lib/invitation-copy": copy,
    "@/lib/section-images": { sectionImageGroups: [] },
    "@/lib/wedding-public": { getPublicWedding: async () => ({ wedding: { groom_name: "Minh", bride_name: "Huệ", wedding_date: "2026-10-18T18:00:00+07:00" }, content: { copy: saved.content }, imageUrls: {} }) },
    "next/image": { default: () => null, __esModule: true },
    "@/components/reveal": { Reveal: ({ children }) => children },
    "@/components/love-story": { LoveStory: ({ pages }) => React.createElement("div", null, pages.join("|")) },
    "@/components/wishes-section": { WishesSection: ({ introduction }) => React.createElement("p", null, introduction) },
  };
  for (const [path, name] of [["wedding-calendar", "WeddingCalendar"], ["wedding-gift", "WeddingGift"], ["scroll-photo-pair", "ScrollPhotoPair"], ["dress-code", "DressCode"], ["countdown", "Countdown"], ["cover-gate", "CoverGate"], ["hero-banner", "HeroBanner"], ["gallery", "Gallery"], ["music-player", "MusicPlayer"]]) deps[`@/components/${path}`] = { [name]: () => null };
  const { WeddingPage } = load("components/wedding-page.tsx", deps);
  for (const props of [{ variant: "groom" }, { variant: "bride" }, { variant: "bride", invitationToken: "a".repeat(64), guestName: "Khách riêng" }]) {
    const html = renderToStaticMarkup(await WeddingPage(props));
    assert.ok(html.includes("Gặp gỡ|Sẻ chia|Mái ấm|Ngày vui"));
    assert.ok(html.includes(custom.rsvp_text));
    assert.ok(html.includes(custom.thank_you_text));
    assert.ok(html.includes("&lt;script&gt;alert(1)&lt;/script&gt;"));
    assert.ok(!html.includes("<script>"));
  }
});

test("story and RSVP components render configured copy and keep text escaped", () => {
  const shared = { "@/components/photo-viewer": { PhotoViewer: () => null }, "@/lib/invitation-copy": copy, "next/image": { default: () => null, __esModule: true } };
  const { LoveStory } = load("components/love-story.tsx", shared);
  const html = renderToStaticMarkup(React.createElement(LoveStory, { pages: custom.story_pages }));
  for (const page of custom.story_pages) assert.ok(html.includes(page));
  assert.ok(!html.includes(copy.defaultInvitationCopy.story_pages[0]));
  const { WishesSection } = load("components/wishes-section.tsx", { ...shared, "@/lib/wish-ticker": load("lib/wish-ticker.ts"), "@/lib/supabase/client": { createClient: () => ({}) }, "@/lib/http/public-api": {} });
  const formHtml = renderToStaticMarkup(React.createElement(WishesSection, { introduction: "<b>Xin xác nhận</b>" }));
  assert.ok(formHtml.includes("&lt;b&gt;Xin xác nhận&lt;/b&gt;"));
});


test("dress code resolves five slots and rejects invalid saved colors", () => {
  const dress = load("lib/dress-code.ts");
  assert.equal(dress.resolveDressCodeColors(undefined).length, 5);
  assert.ok(dress.resolveDressCodeColors(undefined).every((color) => color === ""));
  const resolved = dress.resolveDressCodeColors(["#123456", "red", "", "#ABCDEF", null, "#ffffff"]);
  assert.equal(resolved.join(","), "#123456,,,#ABCDEF,");
  const parse = (colors) => validation.parseContentInput({ sectionKey: "dress_code", content: { colors, dress_code_photo_media_id: "existing-image" }, isPublished: true });
  assert.ok("value" in parse(["#eee5d5", "#cbb798", "#826653", "#642b36", "#9ca88c"]));
  assert.ok("value" in parse(["", "", "", "", ""]));
  for (const colors of [[], ["#ffffff"], ["red", "", "", "", ""], ["url(evil)", "", "", "", ""], "#ffffff"]) assert.ok("error" in parse(colors));
});
