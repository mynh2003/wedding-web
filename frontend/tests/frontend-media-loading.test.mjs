import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

const source = ts.transpileModule(fs.readFileSync("components/music-player.tsx", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const settle = () => new Promise((resolve) => setImmediate(resolve));
const selected = { title: "Ngày hạnh phúc", src: "https://media.example/song.mp3" };

function player(api = async () => ({ ok: true, json: async () => ({ track: selected }) })) {
  const hooks = [], timers = new Map();
  let cursor = 0, effects = [], timerId = 0, requests = 0, manualDownloads = 0;
  const window = Object.assign(new EventTarget(), {
    setTimeout(callback, delay) { timers.set(++timerId, { callback, delay }); return timerId; },
    clearTimeout(id) { timers.delete(id); },
  });
  const document = new EventTarget();
  const storage = new Map();
  const audio = { src: "", loads: 0, plays: 0, pauses: 0,
    load() { this.loads++; }, play() { this.plays++; return Promise.resolve(); }, pause() { this.pauses++; },
    getAttribute(name) { return name === "src" ? this.src : null; },
  };
  const react = {
    useRef(initial) { const index = cursor++; return hooks[index] ??= { current: initial }; },
    useState(initial) {
      const index = cursor++;
      if (!(index in hooks)) hooks[index] = initial;
      return [hooks[index], (next) => { hooks[index] = typeof next === "function" ? next(hooks[index]) : next; }];
    },
    useEffect(callback, deps) {
      const index = cursor++, previous = hooks[index];
      if (!previous || deps.some((dep, i) => !Object.is(dep, previous.deps[i]))) effects.push(() => {
        previous?.cleanup?.(); hooks[index] = { deps, cleanup: callback() };
      });
    },
  };
  const exports = {};
  const jsx = (type, props) => ({ type, props });
  vm.runInNewContext(source, {
    exports, window, document, Event, Node: class {}, AbortSignal,
    sessionStorage: { getItem: (key) => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    fetch() { manualDownloads++; throw new Error("The audio element should stream the song"); },
    require: (name) => ({
      react, "react/jsx-runtime": { jsx, jsxs: jsx },
      "@/lib/http/public-api": { publicApiFetch(...args) { requests++; return api(...args); } },
    })[name],
  });
  let nodes;
  const walk = (node) => Array.isArray(node) ? node.flatMap(walk) : node && typeof node === "object" ? [node, ...walk(node.props?.children)] : [];
  return {
    audio, window, storage,
    get requests() { return requests; }, get manualDownloads() { return manualDownloads; },
    render() {
      cursor = 0; effects = [];
      nodes = walk(exports.MusicPlayer());
      nodes.find((node) => node.type === "audio").props.ref.current = audio;
      nodes[0].props.ref.current = { contains: () => false };
      effects.forEach((run) => run());
      return nodes;
    },
    get element() { return nodes.find((node) => node.type === "audio"); },
    get button() { return nodes.find((node) => node.type === "button"); },
    event(name) { window.dispatchEvent(new Event(name)); },
    stop() { hooks.forEach((hook) => hook?.cleanup?.()); },
  };
}

test("music preloads metadata without downloading or copying the whole song", async () => {
  const app = player();
  app.render(); await settle();
  const nodes = app.render();
  assert.equal(app.requests, 1);
  assert.equal(app.manualDownloads, 0);
  assert.equal(app.audio.src, selected.src);
  assert.equal(app.element.props.preload, "metadata");
  assert.equal(app.audio.loads, 1);
  assert.equal(app.audio.plays, 0);
  assert.equal(app.storage.get("wedding:last-music"), selected.src);
  assert.equal(nodes[0].props["data-music-ready"], false);
  app.element.props.onLoadedMetadata();
  assert.equal(app.render()[0].props["data-music-ready"], true);
  app.stop();
});

test("seal activation calls play synchronously, once, and the player can pause and resume", async () => {
  const app = player();
  app.render(); await settle(); app.render();
  app.event("wedding:open-requested");
  assert.equal(app.audio.plays, 1, "play must happen before the click/event handler returns");
  app.event("wedding:opened");
  assert.equal(app.audio.plays, 1);
  app.element.props.onPlaying(); app.render();
  assert.equal(app.button.props["aria-pressed"], true);
  app.button.props.onClick();
  assert.equal(app.audio.pauses, 1);
  app.element.props.onPause(); app.render();
  app.button.props.onClick();
  assert.equal(app.audio.plays, 2);
  app.stop();
});

test("a failed track selection can be retried without reloading the invitation", async () => {
  let calls = 0;
  const app = player(async () => ++calls === 1 ? { ok: false } : { ok: true, json: async () => ({ track: selected }) });
  app.render(); await settle();
  assert.equal(app.render()[0].props["data-music-failed"], true);
  app.event("wedding:preload-retry"); await settle(); app.render();
  assert.equal(app.requests, 2);
  assert.equal(app.audio.src, selected.src);
  app.element.props.onCanPlay();
  assert.equal(app.render()[0].props["data-music-failed"], false);
  app.event("wedding:open-requested");
  assert.equal(app.audio.plays, 1);
  app.stop();
});

test("a response finishing after unmount cannot start media loading", async () => {
  let finish;
  const app = player(() => new Promise((resolve) => { finish = resolve; }));
  app.render(); app.stop();
  finish({ ok: true, json: async () => ({ track: selected }) });
  await settle();
  assert.equal(app.audio.src, "");
  assert.equal(app.audio.loads, 0);
  app.event("wedding:open-requested");
  assert.equal(app.audio.plays, 0);
});
