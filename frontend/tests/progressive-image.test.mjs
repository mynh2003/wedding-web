import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

function imageComponent() {
  let ready = null;
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync("components/scroll-zoom.tsx", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const dependencies = {
    react: { useState: () => [ready, (value) => { ready = value; }] },
    "react/jsx-runtime": { jsx: (type, props) => ({ type, props }) },
    "next/image": { default: "img", __esModule: true },
    "framer-motion": {},
    "@/components/reveal": {},
    "@/lib/page-image-preload": {},
  };
  vm.runInNewContext(source, { exports, require: (name) => dependencies[name] });
  return exports.ProgressiveImage;
}

test("below-fold images keep frame sizing, load lazily, and reveal on successful decoding", () => {
  const Image = imageComponent();
  let callbackEvent;
  const props = { src: "/photo.webp", alt: "Ảnh cưới", fill: true, sizes: "430px", className: "object-cover", onLoad: (event) => { callbackEvent = event; } };
  const pending = Image(props).props;
  assert.equal(pending.fill, true);
  assert.equal(pending.sizes, "430px");
  assert.equal(pending.loading, "lazy");
  assert.equal(pending.decoding, "async");
  assert.equal(pending["data-image-ready"], "false");
  assert.match(pending.className, /object-cover/);
  const event = { currentTarget: { complete: true } };
  pending.onLoad(event);
  assert.equal(callbackEvent, event);
  assert.equal(Image(props).props["data-image-ready"], "true");
  assert.equal(Image({ ...props, src: "/new-photo.webp" }).props["data-image-ready"], "false");
});

test("failed images reveal their accessible fallback and forward error handlers", () => {
  const Image = imageComponent();
  let failed = false;
  const props = { src: "/missing.webp", alt: "Ảnh kỷ niệm", onError: () => { failed = true; } };
  Image(props).props.onError({});
  assert.equal(failed, true);
  assert.equal(Image(props).props["data-image-ready"], "true");
  assert.equal(Image(props).props.alt, "Ảnh kỷ niệm");
});

test("explicit eager and priority requests are not converted to lazy loading", () => {
  const Image = imageComponent();
  assert.equal(Image({ src: "/photo.webp", alt: "", loading: "eager" }).props.loading, "eager");
  const priority = Image({ src: "/photo.webp", alt: "", priority: true }).props;
  assert.equal(priority.priority, true);
  assert.equal(priority.loading, undefined);
});
