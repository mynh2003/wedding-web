import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

function setup(images, groups = []) {
  const watched = new Set();
  let intersect, mutate, options, imageObserverClosed = false, mutationObserverClosed = false;
  const page = { clientHeight: 800, matches: () => false,
    querySelectorAll: (selector) => selector === "[data-image-preload-group]" ? groups : images.filter((image) => image.loading === "lazy") };
  class ImageObserver {
    constructor(callback, config) { intersect = callback; options = config; }
    observe(image) { watched.add(image); }
    unobserve(image) { watched.delete(image); }
    disconnect() { imageObserverClosed = true; }
  }
  class Changes {
    constructor(callback) { mutate = callback; }
    observe() {} disconnect() { mutationObserverClosed = true; }
  }
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync("lib/page-image-preload.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, { exports, IntersectionObserver: ImageObserver, MutationObserver: Changes });
  const cleanup = exports.bindPageImagePreload(page);
  return { watched, options, page, cleanup,
    enter: (image) => intersect([{ target: image, isIntersecting: true }]),
    add: (node) => mutate([{ addedNodes: [node] }]),
    get closed() { return imageObserverClosed && mutationObserverClosed; } };
}
const image = (overrides = {}) => ({
  nodeType: 1, tagName: "IMG", loading: "lazy", decoding: "auto", complete: false, naturalWidth: 0,
  src: "/_next/image?url=photo.webp&w=640&q=75", srcset: "responsive-candidates",
  dataset: { entrance: "pending", imageReady: "false" },
  matches(selector) { return selector === "img[loading='lazy']" && this.loading === "lazy"; }, querySelectorAll: () => [], ...overrides,
});

test("approaching a card group warms all of its responsive images before the last card enters", () => {
  const cards = Array.from({ length: 5 }, () => image());
  const unrelated = image();
  const group = { tagName: "DIV", querySelectorAll: () => cards.filter((card) => card.loading === "lazy") };
  const app = setup([...cards, unrelated], [group]);
  assert(app.watched.has(group));
  app.enter(group);
  for (const card of cards) {
    assert.equal(card.loading, "eager");
    assert.equal(card.srcset, "responsive-candidates");
    assert.equal(card.dataset.imageReady, "false");
    assert.equal(app.watched.has(card), false);
  }
  assert.equal(unrelated.loading, "lazy");
  assert.equal(app.watched.has(group), false);
  app.cleanup();
});

test("images warm two screens ahead without changing responsive sources or animation state", () => {
  const near = image(), far = image(), hero = image({ loading: "eager", fetchPriority: "high" });
  const cached = image({ complete: true, naturalWidth: 640 });
  const app = setup([near, far, hero, cached]);
  assert.equal(app.options.root, app.page);
  assert.equal(app.options.rootMargin, "1600px 0px");
  assert.equal(app.watched.size, 2);
  app.enter(near);
  assert.equal(near.loading, "eager");
  assert.equal(near.decoding, "async");
  assert.equal(far.loading, "lazy");
  assert.equal(hero.fetchPriority, "high");
  assert.equal(near.src, "/_next/image?url=photo.webp&w=640&q=75");
  assert.equal(near.srcset, "responsive-candidates");
  assert.equal(near.dataset.entrance, "pending");
  assert.equal(near.dataset.imageReady, "false");
});

test("dynamically mounted slide images join the same preloader only once", () => {
  const app = setup([]);
  const slide = image();
  app.add(slide);
  app.add(slide);
  assert.equal(app.watched.size, 1);
  app.enter(slide);
  assert.equal(slide.loading, "eager");
  assert.equal(app.watched.size, 0);
  app.add({ nodeType: 3 });
  app.cleanup();
  assert.equal(app.closed, true);
});
