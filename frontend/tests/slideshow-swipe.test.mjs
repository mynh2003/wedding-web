import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

const exports = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync("lib/slideshow-swipe.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, { exports });

function setup(index = 2, pinned = true) {
  const handlers = new Map();
  const selected = [];
  let moved = false;
  const cleanup = exports.bindSlideshowSwipe({
    addEventListener: (name, callback) => handlers.set(name, callback),
    removeEventListener: (name) => handlers.delete(name),
  }, {
    isPinned: () => pinned, getIndex: () => index, count: 5,
    onStart: () => { moved = false; }, onMove: () => { moved = true; },
    onSelect: (next) => { selected.push(next); index = next; },
  });
  return {
    selected, get moved() { return moved; },
    wheel(deltaY, timeStamp) {
      let prevented = false;
      handlers.get("wheel")({ deltaX: 0, deltaY, deltaMode: 0, timeStamp,
        preventDefault() { prevented = true; } });
      return prevented;
    },
    emit(name, x = 200, y = 400, extra = {}) {
      const event = { touches: [{ clientX: x, clientY: y }], target: { closest: () => null },
        cancelable: true, defaultPrevented: false,
        preventDefault() { this.defaultPrevented = true; }, ...extra };
      handlers.get(name)(event);
      return event.defaultPrevented;
    },
    cleanup() { cleanup(); assert.equal(handlers.size, 0); },
  };
}

test("short horizontal and vertical swipes commit one photo only on release", () => {
  for (const [x, y, expected] of [[165, 400, 3], [235, 400, 1], [200, 365, 3], [200, 435, 1]]) {
    const app = setup();
    app.emit("touchstart");
    assert.equal(app.emit("touchmove", x, y), true);
    assert.equal(app.selected.length, 0);
    assert.equal(app.moved, true);
    app.emit("touchend"); app.emit("touchend");
    assert.deepEqual(app.selected, [expected]);
    app.cleanup();
  }
});

test("long swipes and multiple move events still select just one photo", () => {
  const app = setup();
  app.emit("touchstart", 350);
  for (const x of [300, 200, 100, 0]) app.emit("touchmove", x);
  app.emit("touchend");
  assert.deepEqual(app.selected, [3]);
  app.cleanup();
});

test("vertical edge gestures and gestures before pinning continue page scrolling", () => {
  for (const [index, pinned, y] of [[0, true, 460], [4, true, 340], [2, false, 340]]) {
    const app = setup(index, pinned);
    app.emit("touchstart");
    assert.equal(app.emit("touchmove", 200, y), false);
    app.emit("touchend");
    assert.deepEqual(app.selected, []);
    app.cleanup();
  }
});

test("taps, small movements, cancellations and pinch gestures do not change photos", () => {
  for (const variant of ["tap", "small", "cancel", "pinch", "native"]) {
    const app = setup();
    app.emit("touchstart");
    if (variant === "small") app.emit("touchmove", 190);
    if (variant === "cancel") { app.emit("touchmove", 150); app.emit("touchcancel"); }
    if (variant === "pinch") app.emit("touchmove", 150, 400, { touches: [{}, {}] });
    if (variant === "native") app.emit("touchmove", 150, 400, { cancelable: false });
    app.emit("touchend");
    assert.deepEqual(app.selected, []);
    app.cleanup();
  }
});

test("thumbnail interactions are left to their buttons", () => {
  const app = setup();
  app.emit("touchstart", 200, 400, { target: { closest: () => ({}) } });
  assert.equal(app.emit("touchmove", 100), false);
  app.emit("touchend");
  assert.deepEqual(app.selected, []);
  app.cleanup();
});

test("one trackpad swipe including its momentum advances exactly one slide", () => {
  const app = setup(1);
  for (let time = 0; time < 1200; time += 16) assert.equal(app.wheel(50, time), true);
  assert.deepEqual(app.selected, [2]);
  app.wheel(50, 1500);
  assert.deepEqual(app.selected, [2, 3]);
  app.cleanup();
});

test("both end photos brake the entire momentum tail before a fresh gesture can exit", () => {
  for (const [index, delta, expected] of [[1, -100, 0], [3, 100, 4]]) {
    const app = setup(index);
    for (let time = 0; time < 600; time += 16) assert.equal(app.wheel(delta, time), true);
    assert.deepEqual(app.selected, [expected]);
    assert.equal(app.wheel(delta, 1000), false, "a new outward gesture can leave the album");
    app.cleanup();
  }
});

test("successive touch swipes reach each end one slide at a time, then release vertically", () => {
  for (const [index, y, expected] of [[2, 100, [3, 4]], [2, 700, [1, 0]]]) {
    const app = setup(index);
    for (let i = 0; i < 2; i++) {
      app.emit("touchstart");
      for (let j = 0; j < 10; j++) assert.equal(app.emit("touchmove", 200, y), true);
      app.emit("touchend");
      assert.equal(app.selected.length, i + 1);
    }
    assert.deepEqual(app.selected, expected);
    app.emit("touchstart");
    assert.equal(app.emit("touchmove", 200, y), false);
    app.emit("touchend");
    assert.deepEqual(app.selected, expected);
    app.cleanup();
  }
});
