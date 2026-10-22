import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

const exports = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync("lib/wish-ticker.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, { exports });
const { nextTickerWish, sameWishes } = exports;
const wish = (id) => ({ id, author_name: id, message: "Chúc hạnh phúc!", side: "groom", created_at: "2026-10-19" });

test("newest realtime wish is queued before replaying older wishes", () => {
  const seen = new Set(["a", "b"]);
  assert.equal(nextTickerWish([wish("new"), wish("a"), wish("b")], seen, "b").id, "new");
  assert.ok(seen.has("new"));
});

test("a cycle visits each remaining wish and then repeats without duplicating the queued one", () => {
  const wishes = [wish("a"), wish("b"), wish("c")];
  const seen = new Set(["a", "b"]);
  assert.equal(nextTickerWish(wishes, seen, "b").id, "c");
  assert.equal(nextTickerWish(wishes, seen, "c").id, "a");
  assert.equal(nextTickerWish(wishes, seen, "a").id, "b");
});

test("deleted wishes are never requeued and edits use the newest snapshot", () => {
  const edited = { ...wish("a"), message: "Lời chúc mới" };
  const seen = new Set(["removed", "b"]);
  assert.equal(nextTickerWish([edited, wish("b")], seen, "b").message, "Lời chúc mới");
});

test("a single wish can loop indefinitely", () => {
  const seen = new Set(["a"]);
  for (let i = 0; i < 4; i++) assert.equal(nextTickerWish([wish("a")], seen, "a").id, "a");
});

test("identical reloads preserve state but text, side, order and deletion changes are detected", () => {
  const initial = [wish("a"), wish("b")];
  assert.equal(sameWishes(initial, [wish("a"), wish("b")]), true);
  for (const field of ["author_name", "message", "side", "created_at"]) {
    assert.equal(sameWishes(initial, [{ ...initial[0], [field]: "changed" }, initial[1]]), false);
  }
  assert.equal(sameWishes(initial, [...initial].reverse()), false);
  assert.equal(sameWishes(initial, initial.slice(0, 1)), false);
  assert.equal(sameWishes([], []), true);
});

test("realtime updates do not restart the animation or change visible slots", async () => {
  const hooks = [];
  let cursor = 0;
  let effects = [];
  const animations = [];
  let itemWidth = 800;
  const track = {
    firstElementChild: { getBoundingClientRect: () => ({ width: itemWidth }) },
    parentElement: { clientWidth: 430 },
    children: [],
    animate(frames, options) {
      const animation = { frames, options, currentTime: 0, cancelled: false, paused: false,
        pause() { this.paused = true; }, play() { this.paused = false; }, cancel() { this.cancelled = true; } };
      animations.push(animation);
      return animation;
    },
  };
  const effect = (callback, dependencies) => {
    const index = cursor++;
    const previous = hooks[index];
    if (!previous || dependencies.some((dep, i) => dep !== previous.dependencies[i])) {
      effects.push(() => {
        previous?.cleanup?.();
        hooks[index] = { dependencies, cleanup: callback() };
      });
    }
  };
  const react = {
    useRef(value) { const index = cursor++; return hooks[index] ??= { current: value }; },
    useState(initial) {
      const index = cursor++;
      if (!(index in hooks)) hooks[index] = typeof initial === "function" ? initial() : initial;
      return [hooks[index], (value) => { hooks[index] = value; }];
    },
    useEffect: effect,
    useLayoutEffect: effect,
  };
  const dependencies = {
    react,
    "react-dom": {},
    "react/jsx-runtime": { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    "framer-motion": { useReducedMotion: () => false },
    "next/image": {},
    "@/lib/wish-ticker": exports,
    "@/lib/http/public-api": {},
    "@/lib/invitation-copy": {},
    "@/lib/supabase/client": {},
  };
  const component = {};
  const source = ts.transpileModule(fs.readFileSync("components/wishes-section.tsx", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const listeners = new Map();
  const document = { hidden: false, fonts: { ready: Promise.resolve() },
    addEventListener(name, listener) { listeners.set(name, listener); },
    removeEventListener(name) { listeners.delete(name); } };
  vm.runInNewContext(`${source}\nexports.WishTicker = WishTicker;`, {
    exports: component,
    require: (name) => dependencies[name],
    document,
  });
  const render = async (wishes, active = true) => {
    cursor = 0;
    effects = [];
    const tree = component.WishTicker({ wishes, active });
    tree.props.ref.current = track;
    track.children = Array.from(tree.props.children, () => ({ getBoundingClientRect: () => ({ width: itemWidth }) }));
    effects.forEach((run) => run());
    await Promise.resolve();
    return Array.from(tree.props.children, (slot) => slot.props.children[0].props.children[0]);
  };
  assert.deepEqual(await render([wish("a"), wish("b")]), ["a", "b"]);
  const updated = [wish("new"), wish("a"), wish("b")];
  assert.deepEqual(await render(updated), ["a", "b"]);
  assert.equal(animations.length, 1);
  assert.equal(animations[0].cancelled, false);
  assert.equal(animations[0].options.duration, 20000);
  // Hiding the banner pauses the same animation; realtime and tab visibility
  // changes must not rewind its playhead or resume a banner that is still hidden.
  animations[0].currentTime = 7250;
  assert.deepEqual(await render(updated, false), ["a", "b"]);
  assert.equal(animations[0].paused, true);
  listeners.get("visibilitychange")();
  assert.equal(animations[0].paused, true);
  assert.deepEqual(await render(updated, true), ["a", "b"]);
  assert.equal(animations.length, 1);
  assert.equal(animations[0].paused, false);
  assert.equal(animations[0].currentTime, 7250);
  document.hidden = true;
  listeners.get("visibilitychange")();
  assert.equal(animations[0].paused, true);
  document.hidden = false;
  listeners.get("visibilitychange")();
  assert.equal(animations[0].paused, false);
  assert.equal(animations[0].currentTime, 7250);
  animations[0].onfinish();
  assert.deepEqual(await render(updated), ["b", "new"]);
  assert.equal(animations[0].cancelled, true);
  assert.equal(animations.length, 2);
  // Short messages must fill the viewport with additional natural-width items,
  // rather than stretching each item or leaving blank space at a loop boundary.
  itemWidth = 150;
  animations[1].onfinish();
  let visible = await render(updated);
  visible = await render(updated);
  visible = await render(updated);
  assert.ok((visible.length - 1) * itemWidth >= track.parentElement.clientWidth);
  assert.equal(animations.at(-1).frames[1].transform, "translateX(-150px)");
  assert.equal(animations.at(-1).options.duration, 3750);
});
