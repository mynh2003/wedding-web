import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import { createHash } from "node:crypto";

function load(fonts) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync("lib/font-readiness.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(source, { exports, document: { fonts }, getComputedStyle: () => ({
    fontStyle: "normal", fontWeight: "400", fontSize: "20px", fontFamily: '"Wedding Font", serif',
  }) });
  return exports.loadElementFonts;
}

test("entrance waits for the actual text font and combines glyphs for repeated faces", async () => {
  let release;
  let calls = 0;
  const ready = load({ load(font, text) {
    calls++;
    assert.equal(font, 'normal 400 20px "Wedding Font", serif');
    assert.equal(text, "Bình MinhNinh Huệ");
    return new Promise((resolve) => { release = resolve; });
  } });
  let finished = false;
  const pending = ready([{ textContent: "Bình Minh" }, { textContent: "Ninh Huệ" }]).then(() => { finished = true; });
  await Promise.resolve();
  assert.equal(finished, false);
  assert.equal(calls, 1);
  release([]);
  await pending;
  assert.equal(finished, true);
});

test("font failure or unsupported font API does not block the invitation", async () => {
  await load(undefined)([]);
  await load({ load: () => Promise.reject(new Error("offline")) })([{ textContent: "Wedding Day" }]);
  await load({ load: () => { throw new Error("unavailable face"); } })([{ textContent: "Wedding Day" }]);
});

test("font preloads match CSS sources and immutable filenames match their bytes", () => {
  const preloadSource = fs.readFileSync("app/fonts.ts", "utf8");
  const css = fs.readFileSync("app/fonts.css", "utf8");
  const paths = [...preloadSource.matchAll(/"(\/font\/browser\/[^"]+)"/g)].map((match) => match[1]);
  assert.equal(paths.length, 4);
  for (const path of paths) {
    assert.ok(css.includes(`url("${path}")`));
    const bytes = fs.readFileSync(`public${path}`);
    const hash = createHash("sha256").update(bytes).digest("hex").slice(0, 12);
    assert.ok(path.endsWith(`.${hash}.woff2`));
    assert.equal(bytes.toString("ascii", 0, 4), "wOF2");
  }
  assert.ok(!fs.readFileSync("app/globals.css", "utf8").includes("fonts.googleapis.com"));
});
