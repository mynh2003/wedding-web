import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

function setup(reduced = false, initiallyVisible = true, props = {}) {
  const effects = [], observed = new Set();
  const observers = [];
  let stateIndex = 0, rootReady = initiallyVisible;
  let callback, options, disconnected = false;
  const container = {};
  const root = { dataset: {}, offsetHeight: 300, closest: () => container, querySelectorAll: () => items };
  const item = (kind, skip = false) => ({
    dataset: {}, offsetHeight: 80, style: { values: {}, setProperty(key, value) { this.values[key] = value; } },
    closest: (selector) => selector === ".wedding-reveal" ? root : skip ? {} : null,
    parentElement: { closest: () => null },
    classList: { contains: () => false }, matches: (selector) =>
      kind === "button" ? selector === "button, a[href]" : kind === "field" && selector === ".wish-form > .relative",
  });
  const text = item("text"), button = item("button"), hidden = item("text", true);
  const nested = item("text");
  const firstField = item("field"), secondField = item("field");
  nested.closest = () => ({});
  const items = [text, firstField, secondField, button, hidden, nested];
  class Observer {
    constructor(fn, config) { callback = fn; options = config; observers.push({ callback: fn, options: config }); }
    observe(node) { observed.add(node); }
    unobserve(node) { observed.delete(node); }
    disconnect() { disconnected = true; }
  }
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync("components/reveal.tsx", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, {
    exports, IntersectionObserver: Observer, window: { IntersectionObserver: Observer },
    require: (name) => ({
      react: { useRef: () => ({ current: null }), useState: () => stateIndex++ === 0 ? [rootReady, (value) => { rootReady = value; }] : [true, () => {}], useEffect: (effect) => effects.push(effect) },
      "react/jsx-runtime": { jsx: (type, props) => ({ type, props }) },
      "framer-motion": { useReducedMotion: () => reduced, useInView: () => true },
    })[name],
  });
  const tree = exports.Reveal({ children: "Content", ...props });
  tree.props.ref(root);
  const cleanups = effects.map((effect) => effect());
  return { text, button, firstField, secondField, hidden, nested, observed, container, get options() { return options; },
    get disconnected() { return disconnected; },
    get rootReady() { return rootReady; },
    enterRoot(ratio) { observers[0].callback([{ target: root, isIntersecting: true, intersectionRatio: ratio }]); },
    enter(node, ratio = .7) { callback([{ target: node, isIntersecting: true, intersectionRatio: ratio }]); },
    enterMany(nodes) { callback(nodes.map((target) => ({ target, isIntersecting: true, intersectionRatio: .7 }))); },
    cleanup() { cleanups.forEach((cleanup) => cleanup?.()); }, tree };
}

test("text and buttons enter independently when each reaches the invitation viewport", () => {
  const app = setup();
  assert.equal(app.options.root, app.container);
  assert.equal(app.text.dataset.entrance, "pending");
  assert.equal(app.button.dataset.entranceKind, "button");
  app.enter(app.text);
  assert.equal(app.text.dataset.entrance, "visible");
  assert.equal(app.button.dataset.entrance, "pending", "a lower button waits for its own viewport entry");
  assert.equal(app.observed.has(app.text), false, "text enters only once");
  assert.equal(app.observed.has(app.button), true);
  assert.equal(app.hidden.dataset.entrance, undefined);
  assert.equal(app.nested.dataset.entrance, undefined, "nested reveals own their children");
  app.cleanup();
  assert.equal(app.disconnected, true);
  assert.equal(app.button.dataset.entrance, undefined, "cleanup never leaves a button invisible");
});

test("the image or line wrapper also waits for meaningful visibility before consuming its entrance", () => {
  const app = setup(false, false);
  app.enterRoot(.01);
  assert.equal(app.rootReady, false);
  app.enterRoot(.29);
  assert.equal(app.rootReady, false);
  app.enterRoot(.3);
  assert.equal(app.rootReady, true);
});

test("top and bottom flower decorations have independent viewport gates and clean up safely", () => {
  const effects = [], sensors = [], attributes = new Map();
  let onIntersect;
  const section = { setAttribute: (key, value) => attributes.set(key, value),
    removeAttribute: (key) => attributes.delete(key), append: (sensor) => sensors.push(sensor) };
  const page = { clientHeight: 700, querySelectorAll: () => [section] };
  class Observer {
    constructor(callback) { onIntersect = callback; }
    observe() {} unobserve() {} disconnect() {}
  }
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync("components/reveal.tsx", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, {
    exports, IntersectionObserver: Observer, window: { IntersectionObserver: Observer },
    getComputedStyle: (_, side) => ({ content: '""', backgroundImage: "url(flower.webp)", height: "280px",
      top: side === "::before" ? "32px" : "auto", bottom: side === "::after" ? "-24px" : "auto" }),
    document: { createElement: () => ({ style: {}, setAttribute() {}, removed: false, remove() { this.removed = true; } }) },
    require: (name) => ({
      react: { useRef: () => ({ current: { closest: () => page } }), useEffect: (effect) => effects.push(effect) },
      "framer-motion": { useReducedMotion: () => false },
      "react/jsx-runtime": { jsx: () => null },
    })[name],
  });
  exports.FloralEntrance();
  const cleanup = effects[0]();
  assert.equal(sensors.length, 2);
  onIntersect([{ target: sensors[0], isIntersecting: true, intersectionRatio: .35 }]);
  assert.equal(attributes.get("data-floral-before"), "visible");
  assert.equal(attributes.get("data-floral-after"), "pending");
  assert.equal(sensors[1].style.bottom, "-24px");
  onIntersect([{ target: sensors[1], isIntersecting: true, intersectionRatio: .1 }]);
  assert.equal(attributes.get("data-floral-after"), "pending");
  onIntersect([{ target: sensors[1], isIntersecting: true, intersectionRatio: .35 }]);
  assert.equal(attributes.get("data-floral-after"), "visible");
  cleanup();
  assert.equal(attributes.size, 0);
  assert.ok(sensors.every((sensor) => sensor.removed));
});

test("a visible cluster follows DOM order even when observer entries arrive out of order", () => {
  const app = setup();
  app.enterMany([app.button, app.secondField, app.text, app.firstField]);
  assert.equal(app.text.style.values["--entrance-delay"], "0.16s");
  assert.equal(app.firstField.style.values["--entrance-delay"], "0.32s");
  assert.equal(app.secondField.style.values["--entrance-delay"], "0.48s");
  assert.equal(app.button.style.values["--entrance-delay"], "0.64s");
  assert.equal(app.firstField.dataset.entranceKind, "field");
  assert.equal(app.firstField.style.values["--entrance-x"], "-16px");
  assert.equal(app.secondField.style.values["--entrance-x"], "16px");
});

test("a button further down starts a fresh entrance beat rather than waiting for previous items", () => {
  const app = setup();
  app.enterMany([app.text, app.firstField, app.secondField]);
  app.enter(app.button);
  assert.equal(app.button.style.values["--entrance-delay"], "0.16s");
});

test("barely touching the viewport cannot consume a text or button entrance", () => {
  const app = setup();
  app.enter(app.text, .01);
  app.enter(app.button, .44);
  assert.equal(app.text.dataset.entrance, "pending");
  assert.equal(app.button.dataset.entrance, "pending");
  assert.equal(app.observed.has(app.button), true);
  app.enter(app.button, .45);
  assert.equal(app.button.dataset.entrance, "visible");
  assert.equal(app.options.rootMargin, "0px 0px -98px 0px");
});

test("bottom-aligned album controls can enter at the actual viewport edge", () => {
  const app = setup(false, false, { effect: "fade", viewportInset: 0 });
  assert.equal(app.options.rootMargin, "0px 0px -0px 0px");
  app.enterRoot(.2);
  assert.equal(app.rootReady, true);
});

test("reduced motion keeps text and buttons visible without extra observers", () => {
  const app = setup(true);
  assert.equal(app.observed.size, 0);
  assert.equal(app.text.dataset.entrance, undefined);
  assert.equal(app.button.dataset.entrance, undefined);
  assert.equal(app.tree.props["data-reveal"], undefined);
});
