import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
function load(file, mocks = {}, globals = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(source, {
    exports, URL, Headers, AbortSignal, process: { env: {} }, ...globals,
    require(name) {
      if (Object.hasOwn(mocks, name)) return mocks[name];
      if (name === "server-only") return {};
      if (["wedding-presentation", "dress-code", "invitation-copy", "section-images"].some((module) => name === `@/lib/${module}`)) {
        return load(`backend/lib/${name.slice("@/lib/".length)}.ts`);
      }
      return require(name);
    },
  });
  return exports;
}

const { buildWeddingPresentation, DEFAULT_INVITATION_TEXT } = load("backend/lib/wedding-presentation.ts");

test("backend presentation keeps Vietnam dates, per-field text defaults and only signed section images", () => {
  const data = {
    wedding: { id: "wedding", groom_name: "Minh", bride_name: "Huệ", wedding_date: "2026-10-18T18:30:00Z" },
    content: {
      hero: { cover_media_id: "cover", intro_media_id: "intro", intro_third_media_id: "intro-third", thank_you_media_id: "thanks" },
      invitation: { banner_media_id: "unsigned", calendar_banner_media_id: "calendar" },
      families: {
        groom_father_name: "Ông A", bride_mother_name: "Bà B", invitation_text: "  Kính mời bạn.  ",
        groom_ceremony_time: "09:30", bride_ceremony_time: "11:00",
        meal_date: "2026-10-18", groom_meal_time: "17:00", bride_meal_time: "18:00",
        groom_map_url: "https://example.test/groom", bride_venue_address: "Nhà gái",
        lunar_date_text: "Ngày âm lịch", bride_ceremony_date_text: "19.10.2026",
        bride_father_name: 42,
      },
      dress_code: { colors: ["#ABCDEF", "red", "", "#123456", null], dress_code_photo_media_id: "dress" },
      copy: { quote_text: "Câu trích dẫn", story_pages: ["Trang riêng", ""], thank_you_text: "Cảm ơn\nHẹn gặp lại" },
    },
    imageUrls: { cover: "https://signed/cover", intro: "https://signed/intro", "intro-third": "https://signed/intro-third", thanks: "https://signed/thanks", calendar: "https://signed/calendar", dress: "https://signed/dress", unused: "https://signed/unused" },
  };
  const snapshot = JSON.stringify(data);
  const presentation = buildWeddingPresentation(data);
  assert.equal(presentation.date, "19.10.2026");
  assert.equal(presentation.countdownDate, "2026-10-19");
  assert.equal(presentation.countdownTime, "01:30");
  assert.equal(presentation.groomName, "Minh");
  assert.equal(presentation.brideName, "Huệ");
  assert.equal(presentation.groomFatherName, "Ông A");
  assert.equal(presentation.brideMotherName, "Bà B");
  assert.equal(presentation.brideFatherName, "");
  assert.equal(presentation.invitationText, "Kính mời bạn.");
  assert.equal(presentation.groomCeremonyTime, "09:30");
  assert.equal(presentation.brideCeremonyTime, "11:00");
  assert.equal(presentation.ceremonyDateText, "19.10.2026");
  assert.equal(presentation.mealDate, "2026-10-18");
  assert.equal(presentation.groomMealTime, "17:00");
  assert.equal(presentation.brideMealTime, "18:00");
  assert.equal(presentation.lunarDateText, "Ngày âm lịch");
  assert.equal(presentation.groomMapUrl, "https://example.test/groom");
  assert.equal(presentation.brideVenueAddress, "Nhà gái");
  assert.equal(presentation.coverImageUrl, "https://signed/cover");
  assert.equal(presentation.introImageUrl, "https://signed/intro");
  assert.equal(presentation.sectionImages.intro_third_media_id, "https://signed/intro-third");
  assert.equal(presentation.sectionImages.calendar_banner_media_id, "https://signed/calendar");
  assert.equal(presentation.sectionImages.dress_code_photo_media_id, "https://signed/dress");
  assert.equal(presentation.sectionImages.thank_you_media_id, "https://signed/thanks");
  assert.equal(presentation.sectionImages.banner_media_id, undefined);
  assert.ok(!Object.values(presentation.sectionImages).includes("https://signed/unused"));
  assert.equal(presentation.dressCodeColors.join(","), "#ABCDEF,,,#123456,");
  assert.equal(presentation.invitationCopy.story_pages[0], "Trang riêng");
  assert.ok(presentation.invitationCopy.story_pages[1]);
  assert.equal(presentation.invitationCopy.thank_you_text, "Cảm ơn\nHẹn gặp lại");
  assert.equal(JSON.stringify(data), snapshot);
});

test("missing wedding preserves the invitation fallback and returns independent mutable fields", () => {
  const first = buildWeddingPresentation(null);
  const second = buildWeddingPresentation(null);
  assert.equal(first.groomName, "{{groom_name}}");
  assert.equal(first.brideName, "{{bride_name}}");
  assert.equal(first.date, "{{wedding_date}}");
  assert.equal(first.dateDay, "{{day}}");
  assert.equal(first.dateMonth, "{{month}}");
  assert.equal(first.dateYear, "{{year}}");
  assert.equal(first.invitationText, DEFAULT_INVITATION_TEXT);
  assert.equal(first.countdownDate, "");
  assert.equal(first.coverImageUrl, null);
  assert.equal(first.introImageUrl, null);
  first.dressCodeColors.push("#ffffff");
  first.sectionImages.banner_media_id = "changed";
  first.invitationCopy.story_pages[0] = "changed";
  assert.equal(second.dressCodeColors.length, 0);
  assert.equal(second.sectionImages.banner_media_id, undefined);
  assert.notEqual(second.invitationCopy.story_pages[0], "changed");
});

test("frontend shares data and presentation reads, including missing-wedding fallbacks, without forwarding cookies", async () => {
  const requests = [];
  const serverRequest = async (url, init) => {
    requests.push({ url, init });
    if (url.includes("missing")) return new Response("", { status: 404 });
    return new Response(JSON.stringify({ data: { wedding: { id: "published" } }, presentation: { groomName: "Backend result" } }));
  };
  const client = load("frontend/lib/wedding-data.ts", {
    "@/lib/http/server-request.mjs": { serverRequest },
    react: { cache(fn) {
      const memo = new Map();
      return (key) => { if (!memo.has(key)) memo.set(key, fn(key)); return memo.get(key); };
    } },
  }, {
    process: { env: { BACKEND_INTERNAL_URL: "http://127.0.0.1:3001", NEXT_PUBLIC_API_URL: "https://admin.example" } },
    fetch: () => { throw new Error("Internal requests must preserve Host through the server transport."); },
  });
  const [data, presentation] = await Promise.all([client.getPublicWedding("published"), client.getWeddingPresentation("published")]);
  assert.equal(data.wedding.id, "published");
  assert.equal(presentation.groomName, "Backend result");
  assert.equal(requests.length, 1);
  const [missingData, fallback] = await Promise.all([client.getPublicWedding("missing"), client.getWeddingPresentation("missing")]);
  assert.equal(missingData, null);
  assert.equal(fallback.groomName, "{{groom_name}}");
  assert.equal(requests.length, 2);
  for (const { init } of requests) {
    assert.ok(init.signal instanceof AbortSignal);
    assert.equal(init.headers.get("host"), "admin.example");
    assert.equal(init.headers.get("cookie"), null);
  }
});
