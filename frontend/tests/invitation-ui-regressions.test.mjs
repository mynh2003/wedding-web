import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

function harness(file, dependencies = {}, globals = {}, attach = () => {}) {
  const hooks = [];
  let cursor = 0, effects = [], dirty = false, props, tree;
  const react = {
    useRef(initial) { const index = cursor++; return hooks[index] ??= { current: initial }; },
    useState(initial) {
      const index = cursor++;
      if (!(index in hooks)) hooks[index] = typeof initial === "function" ? initial() : initial;
      return [hooks[index], (next) => {
        const value = typeof next === "function" ? next(hooks[index]) : next;
        if (!Object.is(value, hooks[index])) { hooks[index] = value; dirty = true; }
      }];
    },
    useCallback(fn) { cursor++; return fn; },
    useEffect(callback, deps) {
      const index = cursor++;
      const previous = hooks[index];
      if (!previous || deps.some((dep, i) => !Object.is(dep, previous.deps[i]))) effects.push(() => {
        previous?.cleanup?.();
        hooks[index] = { deps, cleanup: callback() };
      });
    },
  };
  const exports = {};
  const jsx = (type, props) => ({ type, props });
  const source = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(source, { exports, ...globals, require: (name) => ({
    react,
    "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: "fragment" },
    "react-dom": { createPortal: (node) => node },
    "framer-motion": { motion: { button: "button", div: "div", span: "span" }, useReducedMotion: () => false },
    "@/components/scroll-zoom": { ProgressiveImage: "image", ScrollZoom: "zoom" },
    "@/components/reveal": { Reveal: "reveal" },
    "@/components/photo-viewer": { PhotoViewer: "viewer" },
    "@/lib/slideshow-swipe": { bindSlideshowSwipe: () => () => {} },
    ...dependencies,
  })[name] });
  const Component = Object.values(exports)[0];
  const nodes = (root) => {
    if (!root || typeof root !== "object") return [];
    if (Array.isArray(root)) return root.flatMap(nodes);
    return [root, ...nodes(root.props?.children)];
  };
  return {
    render(nextProps = props) {
      props = nextProps;
      let count = 0;
      do {
        assert.ok(count++ < 20, "render effects settle");
        dirty = false; cursor = 0; effects = [];
        tree = Component(props);
        nodes(tree).forEach(attach);
        effects.forEach((run) => run());
      } while (dirty);
      return nodes(tree);
    },
  };
}

test("jumping to an uncached album photo retains the previous photo until the requested one loads", () => {
  const frames = new Map(), listeners = new Map();
  let frameId = 0;
  const page = { scrollTop: 1000, clientTop: 0, getBoundingClientRect: () => ({ top: 0 }),
    addEventListener: (name, listener) => listeners.set(name, listener), removeEventListener() {} };
  const stage = { offsetHeight: 800, closest: () => page };
  const swiper = { offsetHeight: 4800, closest: () => page, getBoundingClientRect: () => ({ top: 1000 - page.scrollTop }) };
  const app = harness("components/gallery.tsx", {}, {
    window: { addEventListener() {}, removeEventListener() {} },
    requestAnimationFrame: (callback) => { frames.set(++frameId, callback); return frameId; },
    cancelAnimationFrame: (id) => frames.delete(id),
  }, (node) => {
    if (node.props?.className === "album-swiper__stage") node.props.ref.current = stage;
    if (node.props?.className === "album-swiper") node.props.ref.current = swiper;
  });
  const flush = () => { const pending = [...frames.values()]; frames.clear(); pending.forEach((run) => run()); };
  const slides = (nodes) => nodes.filter((node) => node.props?.className === "album-swiper__slide");
  const props = { images: ["/0.webp", "/1.webp", "/2.webp", "/3.webp", "/4.webp"] };
  let nodes = app.render(props);
  flush();
  nodes.find((node) => node.type === "image" && node.props.src === "/0.webp" && node.props.onLoad).props.onLoad();
  app.render();
  page.scrollTop = 4000;
  listeners.get("scroll")(); flush();
  nodes = app.render();
  assert.equal(slides(nodes)[0].props.animate.opacity, 1);
  assert.equal(slides(nodes)[3].props.animate.opacity, 0);
  // An unrelated preloaded image must not prematurely replace the visible one.
  nodes.find((node) => node.type === "image" && node.props.src === "/2.webp" && node.props.onLoad).props.onLoad();
  assert.equal(slides(app.render())[0].props.animate.opacity, 1);
  nodes.find((node) => node.type === "image" && node.props.src === "/3.webp" && node.props.onLoad).props.onLoad();
  const ready = slides(app.render());
  assert.equal(ready[0].props.animate.opacity, 0);
  assert.equal(ready[3].props.animate.opacity, 1);
  assert.equal(ready[3].props.tabIndex, 0);
  assert.equal(ready[0].props.tabIndex, -1);
});

test("a dialog still closes and restores scrolling when its animation-end event is lost", () => {
  const timers = new Map();
  let timerId = 0, closes = 0;
  const scroller = { style: { overflow: "scroll" } };
  const dialog = { open: false, showModal() { this.open = true; }, close() { this.open = false; }, focus() {} };
  const app = harness("components/invitation-dialog.tsx", {}, {
    document: { body: { style: { overflow: "hidden" } }, querySelector: () => scroller },
    window: { setTimeout: (callback) => { timers.set(++timerId, callback); return timerId; }, clearTimeout: (id) => timers.delete(id) },
  }, (node) => { if (node.type === "dialog") node.props.ref.current = dialog; });
  const props = { open: true, onClose: () => { closes++; }, titleId: "title", children: "Content" };
  let nodes = app.render(props);
  assert.equal(dialog.open, true);
  assert.equal(scroller.style.overflow, "hidden");
  nodes[0].props.onCancel({ preventDefault() {} });
  app.render();
  assert.equal(timers.size, 1);
  [...timers.values()][0]();
  assert.equal(closes, 1);
  assert.equal(dialog.open, false);
  app.render({ ...props, open: false });
  assert.equal(scroller.style.overflow, "scroll");
});

test("all small thumbnails warm before the album without eagerly loading full-sized slides", () => {
  let onIntersect, options, disconnected = false;
  class Observer {
    constructor(callback, config) { onIntersect = callback; options = config; }
    observe() {} disconnect() { disconnected = true; }
  }
  const page = { clientHeight: 800, clientTop: 0, scrollTop: 0,
    addEventListener() {}, removeEventListener() {}, getBoundingClientRect: () => ({ top: 0 }) };
  const stage = { offsetHeight: 800, closest: () => page };
  const swiper = { offsetHeight: 4800, closest: () => page, getBoundingClientRect: () => ({ top: 6000 }) };
  const app = harness("components/gallery.tsx", {}, {
    IntersectionObserver: Observer,
    window: { IntersectionObserver: Observer, addEventListener() {}, removeEventListener() {} },
    requestAnimationFrame: () => 1, cancelAnimationFrame() {},
  }, (node) => {
    if (node.props?.className === "album-swiper__stage") node.props.ref.current = stage;
    if (node.props?.className === "album-swiper") node.props.ref.current = swiper;
  });
  let nodes = app.render({});
  const thumbnails = (list) => list.filter((node) => node.type === "image" && node.props.sizes === "36px");
  assert.equal(thumbnails(nodes).length, 5);
  assert.ok(thumbnails(nodes).every((node) => node.props.loading === "lazy"));
  assert.equal(options.root, page);
  assert.equal(options.rootMargin, "1600px 0px");
  onIntersect([{ isIntersecting: true }]);
  nodes = app.render();
  assert.ok(thumbnails(nodes).every((node) => node.props.loading === "eager" && node.props.fetchPriority === "low"));
  assert.equal(nodes.filter((node) => node.type === "image" && node.props.sizes.includes("100vw")).length, 5);
  assert.ok(nodes.filter((node) => node.type === "image" && node.props.sizes.includes("100vw")).every((node) => node.props.loading === "lazy"));
  assert.equal(nodes.find((node) => node.props?.className === "album-swiper__navigation").props.viewportInset, 0);
  assert.equal(disconnected, true);
});

test("the photo viewer releases its scroll lock if the close animation is interrupted", () => {
  const timers = new Map();
  let timerId = 0, selected = 0;
  const scroller = { style: { overflow: "scroll" } };
  const dialog = { open: false, closest: () => scroller,
    showModal() { this.open = true; }, close() { this.open = false; } };
  const image = { scrollTo() {}, scrollWidth: 800, scrollHeight: 1200, clientWidth: 400, clientHeight: 600 };
  const app = harness("components/photo-viewer.tsx", { "next/image": { __esModule: true, default: "image" } }, {
    window: { setTimeout: (callback) => { timers.set(++timerId, callback); return timerId; }, clearTimeout: (id) => timers.delete(id) },
  }, (node) => {
    if (node.type === "dialog") node.props.ref.current = dialog;
    if (node.props?.className === "album-viewer__image") node.props.ref.current = image;
  });
  const props = { photos: [{ src: "/0.webp", alt: "Ảnh cưới" }], viewerIndex: 0, setViewerIndex: (value) => { selected = value; } };
  const nodes = app.render(props);
  assert.equal(scroller.style.overflow, "hidden");
  nodes.find((node) => node.props?.className === "album-viewer__close").props.onClick();
  app.render();
  [...timers.values()][0]();
  assert.equal(selected, null);
  app.render({ ...props, viewerIndex: null });
  assert.equal(dialog.open, false);
  assert.equal(scroller.style.overflow, "scroll");
});
