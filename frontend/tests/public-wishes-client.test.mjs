import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

const source = ts.transpileModule(fs.readFileSync("lib/public-wishes-client.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const settle = () => new Promise((resolve) => setImmediate(resolve));
const wish = (id) => ({ id, author_name: id, message: "Chúc hạnh phúc!", side: "groom", created_at: "2026-10-21" });

function harness({ api, idle = true, realtimeModule } = {}) {
  const timers = new Map(), idleTasks = new Map();
  let timerId = 0, idleId = 0, imports = 0, removals = 0;
  const requests = [], received = [], channels = [];
  const window = Object.assign(new EventTarget(), {
    setTimeout(callback, delay) { timers.set(++timerId, { callback, delay }); return timerId; },
    clearTimeout(id) { timers.delete(id); },
  });
  if (idle) Object.assign(window, {
    requestIdleCallback(callback) { idleTasks.set(++idleId, callback); return idleId; },
    cancelIdleCallback(id) { idleTasks.delete(id); },
  });
  const document = Object.assign(new EventTarget(), { hidden: false });
  const client = {
    channel() {
      const channel = {
        on(_type, _filter, callback) { this.changed = callback; return this; },
        subscribe(callback) { this.status = callback; return this; },
      };
      channels.push(channel);
      return channel;
    },
    async removeChannel() { removals++; },
  };
  const exports = {};
  vm.runInNewContext(source, {
    exports, window, document, AbortController,
    require(name) {
      if (name === "@/lib/http/public-api") return { publicApiFetch(path, init) {
        const request = { path, ...init };
        requests.push(request);
        return api ? api(request, requests.length) : Promise.resolve({ ok: true, json: async () => ({ data: [wish("first")] }) });
      } };
      if (name === "@/lib/supabase/client") {
        imports++;
        return realtimeModule ? realtimeModule(client) : { createClient: () => client };
      }
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  const stop = exports.observePublicWishes((next) => received.push(next));
  return {
    requests, received, channels, stop, window, document,
    get imports() { return imports; }, get removals() { return removals; },
    get pendingIdle() { return idleTasks.size; },
    event(name) { window.dispatchEvent(new Event(name)); },
    visibility(hidden) { document.hidden = hidden; document.dispatchEvent(new Event("visibilitychange")); },
    runTimers(delay) {
      for (const [id, timer] of [...timers]) if (timer.delay === delay) { timers.delete(id); timer.callback(); }
    },
    runIdle() { const pending = [...idleTasks.values()]; idleTasks.clear(); pending.forEach((callback) => callback()); },
  };
}

test("the initial API list loads before the realtime SDK and realtime waits for hero/idle", async () => {
  const app = harness();
  await settle();
  assert.equal(app.requests.length, 1);
  assert.equal(app.received[0][0].id, "first");
  assert.equal(app.imports, 0);
  app.event("wedding:hero-ready");
  assert.equal(app.imports, 0);
  assert.equal(app.pendingIdle, 1);
  app.runIdle();
  await settle();
  assert.equal(app.imports, 1);
  assert.equal(app.channels.length, 1);
  app.stop();
});

test("realtime bursts coalesce and never overlap an in-flight list request", async () => {
  const responses = [];
  const app = harness({ api: () => new Promise((resolve) => responses.push(resolve)) });
  app.event("wedding:hero-ready"); app.runIdle();
  await settle();
  app.channels[0].status("SUBSCRIBED");
  for (let i = 0; i < 12; i++) app.channels[0].changed();
  app.runTimers(250);
  assert.equal(app.requests.length, 1);
  responses.shift()({ ok: true, json: async () => ({ data: [wish("before")] }) });
  await settle();
  app.runTimers(250);
  assert.equal(app.requests.length, 2);
  for (let i = 0; i < 12; i++) app.channels[0].changed();
  app.runTimers(250);
  assert.equal(app.requests.length, 2);
  responses.shift()({ ok: true, json: async () => ({ data: [wish("after")] }) });
  await settle(); app.runTimers(250);
  assert.equal(app.requests.length, 3);
  responses.shift()({ ok: true, json: async () => ({ data: [wish("latest")] }) });
  await settle();
  assert.equal(app.received.at(-1)[0].id, "latest");
  app.stop();
});

test("hidden tabs disconnect and reconnect once while refreshing missed changes", async () => {
  const app = harness();
  await settle(); app.event("wedding:hero-ready"); app.runIdle(); await settle();
  app.visibility(true);
  assert.equal(app.removals, 1);
  app.event("focus"); app.event("online"); app.runIdle(); app.runTimers(250);
  await settle();
  assert.equal(app.channels.length, 1);
  assert.equal(app.requests.length, 1);
  app.visibility(false); app.event("focus"); app.event("online");
  app.runIdle(); app.runTimers(250); await settle();
  assert.equal(app.channels.length, 2);
  assert.equal(app.requests.length, 2);
  app.stop();
  assert.equal(app.removals, 2);
});

test("unmount cancels late API results, deferred imports and reconnect listeners", async () => {
  let finishImport, finishRequest;
  const app = harness({
    api: () => new Promise((resolve) => { finishRequest = resolve; }),
    realtimeModule: (client) => new Promise((resolve) => { finishImport = () => resolve({ createClient: () => client }); }),
  });
  app.event("wedding:hero-ready"); app.runIdle(); await settle();
  assert.equal(app.imports, 1);
  app.stop();
  assert.equal(app.requests[0].signal.aborted, true);
  finishImport(); finishRequest({ ok: true, json: async () => ({ data: [wish("late")] }) });
  await settle();
  app.event("focus"); app.event("online"); app.runTimers(250); app.runTimers(2500); app.runIdle();
  await settle();
  assert.equal(app.channels.length, 0);
  assert.equal(app.received.length, 0);
  assert.equal(app.requests.length, 1);
});

test("the fallback connects without idle support and missing animation events", async () => {
  const app = harness({ idle: false });
  await settle();
  app.visibility(true); app.runTimers(2500); await settle();
  assert.equal(app.imports, 0);
  app.visibility(false); app.runTimers(100); await settle();
  assert.equal(app.channels.length, 1);
  app.stop();
});

test("the list still loads when realtime fails and online retries the connection", async () => {
  let fail = true;
  const app = harness({ realtimeModule: (client) => {
    if (fail) throw new Error("Realtime blocked");
    return { createClient: () => client };
  } });
  await settle(); app.event("wedding:hero-ready"); app.runIdle(); await settle();
  assert.equal(app.received[0][0].id, "first");
  assert.equal(app.channels.length, 0);
  fail = false;
  app.event("online"); app.runIdle(); app.runTimers(250); await settle();
  assert.equal(app.channels.length, 1);
  assert.equal(app.requests.length, 2);
  app.stop();
});
