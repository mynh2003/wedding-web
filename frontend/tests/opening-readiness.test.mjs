import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

const exports = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync("lib/opening-readiness.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, { exports, window: { setTimeout, clearTimeout } });
const { prepareOpeningImage } = exports;

function image(properties = {}) {
  return Object.assign(new EventTarget(), { complete: false, naturalWidth: 0, decode: async () => {}, ...properties });
}

test("opening waits for network load and decoding, and requests below-hero images eagerly", async () => {
  let decode;
  const photo = image({ decode: () => new Promise((resolve) => { decode = resolve; }) });
  let ready = false;
  const pending = prepareOpeningImage(photo).then(() => { ready = true; });
  assert.equal(photo.loading, "eager");
  assert.equal(ready, false);
  photo.naturalWidth = 430;
  photo.dispatchEvent(new Event("load"));
  await Promise.resolve();
  assert.equal(ready, false);
  decode();
  await pending;
  assert.equal(ready, true);
});

test("cached images still decode before the opening is ready", async () => {
  let decoded = false;
  await prepareOpeningImage(image({ complete: true, naturalWidth: 430, decode: async () => { decoded = true; } }));
  assert.equal(decoded, true);
});

test("network and decode failures keep the opening blocked for retry", async () => {
  const photo = image();
  const pending = prepareOpeningImage(photo);
  photo.dispatchEvent(new Event("error"));
  await assert.rejects(pending, /Không thể tải ảnh/);
  await assert.rejects(prepareOpeningImage(image({ complete: true })), /Không thể tải ảnh/);
  await assert.rejects(prepareOpeningImage(image({ complete: true, naturalWidth: 430, decode: async () => { throw new Error("decode failed"); } })), /decode failed/);
});
