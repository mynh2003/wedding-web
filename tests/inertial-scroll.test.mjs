import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

function load(file, dependencies, globals = {}) {
  const source = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  vm.runInNewContext(source, { exports, require: (name) => dependencies[name], ...globals });
  return exports;
}
const boundaryModule = load("lib/slideshow-scroll-boundary.ts", {});

function setup(initial = 2500) {
  const handlers = new Map();
  const frames = new Map();
  let position = initial, time = 0, id = 0, modal = false, reduced = false, cleanup;
  class Element {
    matches() { return false; }
    closest() { return null; }
  }
  const stage = { offsetHeight: 800 };
  const slideshow = {
    offsetHeight: 4800,
    getBoundingClientRect: () => ({ top: 1000 - position }),
    querySelector: () => stage,
  };
  const page = Object.assign(new Element(), {
    style: { scrollBehavior: "", overflowY: "scroll" }, scrollHeight: 10000, clientHeight: 800, clientTop: 0,
    getBoundingClientRect: () => ({ top: 0 }),
    closest(selector) { return selector === ".mobile-landing" ? this : null; },
    querySelector: (selector) => selector === "dialog[open]" ? (modal ? {} : null) : slideshow,
    addEventListener(name, listener) {
      if (!handlers.has(name)) handlers.set(name, new Set());
      handlers.get(name).add(listener);
    },
    removeEventListener(name, listener) { handlers.get(name)?.delete(listener); },
  });
  // Rounded scrollTop reproduces browsers where tiny final steps can otherwise
  // keep an animation alive forever.
  Object.defineProperty(page, "scrollTop", {
    get: () => position,
    set: (value) => { position = Math.round(Math.max(0, Math.min(9200, value))); },
  });
  const preference = { get matches() { return reduced; }, addEventListener() {}, removeEventListener() {} };
  const { InertialScroll } = load("components/inertial-scroll.tsx", {
    "@/lib/slideshow-scroll-boundary": boundaryModule,
    react: { useRef: () => ({ current: page }), useEffect: (effect) => { cleanup = effect(); } },
    "react/jsx-runtime": { jsx: () => null },
  }, {
    window: { matchMedia: () => preference }, Element, getComputedStyle: (element) => element.style,
    performance: { now: () => time },
    requestAnimationFrame: (callback) => { frames.set(++id, callback); return id; },
    cancelAnimationFrame: (frame) => frames.delete(frame),
  });
  InertialScroll();
  const emit = (name, event = {}) => { for (const listener of handlers.get(name) ?? []) listener(event); };
  const step = () => {
    time += 16;
    const callbacks = [...frames.values()]; frames.clear();
    callbacks.forEach((callback) => callback(time)); emit("scroll");
  };
  return {
    page, emit,
    get position() { return position; },
    get pending() { return frames.size; },
    advance: (duration) => { time += duration; },
    wheel(delta) {
      let prevented = false;
      emit("wheel", { target: page, deltaX: 0, deltaY: delta, deltaMode: 0, preventDefault() { prevented = true; } });
      return prevented;
    },
    touch(name, y, x = 0) {
      time += 16;
      let prevented = false;
      emit(name, { target: page, touches: [{ clientX: x, clientY: y }], cancelable: true, preventDefault() { prevented = true; } });
      emit("scroll");
      return prevented;
    },
    step,
    settle() {
      for (let count = 0; count < 200 && frames.size; count++) step();
      assert.equal(frames.size, 0, "animation settles without jitter at fractional positions");
    },
    modal(value) { modal = value; },
    reduced(value) { reduced = value; },
    cleanup() { cleanup(); assert.equal([...handlers.values()].reduce((sum, set) => sum + set.size, 0), 0); },
  };
}

test("fast wheel gesture stops at last slide; its tail stays blocked, a fresh gesture exits", () => {
  const app = setup(2500);
  app.wheel(6000);
  // Continuous trackpad momentum may persist after the easing has settled.
  for (let index = 0; index < 100; index++) { app.advance(20); app.wheel(100); app.step(); }
  app.settle(); assert.equal(app.position, 5000);
  app.advance(220); app.wheel(300); app.settle(); assert.equal(app.position, 5300);
  app.cleanup();
});

test("first slide brakes reverse momentum, and changing direction never traps the user", () => {
  const app = setup(2500);
  app.wheel(-6000);
  for (let index = 0; index < 100; index++) { app.advance(20); app.wheel(-100); app.step(); }
  app.settle(); assert.equal(app.position, 1000);
  app.wheel(300); app.settle(); assert.equal(app.position, 1300);
  app.advance(220); app.wheel(-1000); app.settle(); assert.equal(app.position, 1000);
  app.advance(220); app.wheel(-300); app.settle(); assert.equal(app.position, 700);
  app.cleanup();
});

test("fast vertical touch stops at either edge until a new swipe", () => {
  for (const [initial, start, move, edge, next] of [[4500, 800, 0, 5000, 5200], [1500, 0, 800, 1000, 800]]) {
    const app = setup(initial);
    app.touch("touchstart", start);
    assert.equal(app.touch("touchmove", move), true);
    assert.equal(app.position, edge);
    app.emit("touchend"); app.settle(); assert.equal(app.position, edge);
    app.touch("touchstart", 400);
    app.touch("touchmove", edge === 5000 ? 200 : 600);
    assert.equal(app.position, next);
    app.emit("touchcancel"); app.cleanup();
  }
});

test("touch release momentum also brakes and horizontal swipes stay native", () => {
  const reverse = setup(1200);
  reverse.touch("touchstart", 320); reverse.touch("touchmove", 400);
  reverse.emit("touchend"); reverse.settle(); assert.equal(reverse.position, 1000);
  reverse.cleanup();
  const app = setup(4800);
  app.touch("touchstart", 400); app.touch("touchmove", 320);
  app.emit("touchend"); app.settle(); assert.equal(app.position, 5000);
  app.touch("touchstart", 400); assert.equal(app.touch("touchmove", 402, 200), false);
  assert.equal(app.position, 5000); app.emit("touchcancel");
  app.cleanup();
});

test("outside the album a fast flick follows the finger but has a short, bounded tail", () => {
  for (const sign of [1, -1]) {
    const app = setup(7000);
    app.touch("touchstart", 400);
    assert.equal(app.touch("touchmove", 400 - sign * 300), true);
    const released = app.position;
    assert.equal(released, 7000 + sign * 300);
    app.emit("touchend"); app.settle();
    const drift = (app.position - released) * sign;
    assert(drift > 0 && drift <= app.page.clientHeight * .28);
    app.cleanup();
  }
});

test("large wheel input and bursts cannot queue several screens of pending scroll", () => {
  const app = setup(6000);
  app.wheel(10000); app.settle();
  assert(app.position > 6000 && app.position <= 6240);
  const start = app.position;
  for (let index = 0; index < 30; index++) app.wheel(10000);
  app.settle(); assert(app.position - start <= app.page.clientHeight * .45);
  app.cleanup();
});

test("native takeover and pinch cancel touch momentum without a jump", () => {
  const app = setup(2500);
  app.touch("touchstart", 400); app.touch("touchmove", 300);
  app.page.scrollTop = 2900;
  app.emit("touchmove", { touches: [{ clientX: 0, clientY: 200 }], cancelable: false });
  app.emit("touchend"); assert.equal(app.pending, 0); assert.equal(app.position, 2900);
  app.touch("touchstart", 400); app.touch("touchmove", 300);
  app.emit("touchmove", { touches: [{}, {}], cancelable: true });
  app.emit("touchend"); assert.equal(app.pending, 0);
  app.cleanup();
});

test("gallery navigation, opening lock, dialogs and reduced motion interrupt or bypass inertia", () => {
  const app = setup();
  app.wheel(500); app.step(); app.emit("pointerdown"); assert.equal(app.pending, 0);
  app.wheel(500); app.page.scrollTop = 3500; app.emit("scroll"); assert.equal(app.pending, 0);
  app.wheel(500); app.modal(true); app.step(); assert.equal(app.pending, 0); assert.equal(app.wheel(500), false);
  app.modal(false); app.page.style.overflowY = "hidden"; assert.equal(app.wheel(500), false);
  app.page.style.overflowY = "scroll"; app.reduced(true); assert.equal(app.wheel(500), false);
  app.reduced(false); app.wheel(333); app.settle(); assert.equal(app.position, 3833);
  app.cleanup(); assert.equal(app.page.style.scrollBehavior, "");
});
