import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
function load(file, env = {}, mocks = {}, globals = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(source, { exports, URL, process: { env }, ...globals, require: (name) => mocks[name] ?? require(name) });
  return exports;
}
const origin = load("lib/invitation-origin.ts");

test("invitation links use current local/LAN hostname and the configured frontend port only in development", () => {
  for (const host of ["localhost", "127.0.0.1", "192.168.1.100", "[::1]"]) {
    assert.equal(origin.getInvitationOrigin(`http://${host}:3001`, "http://localhost:3000", true), `http://${host}:3000`);
    assert.equal(origin.getInvitationOrigin(`http://${host}:3101`, "http://localhost:3100", true), `http://${host}:3100`);
  }
  assert.equal(origin.getInvitationOrigin("http://192.168.1.100:3001", undefined, true), "http://192.168.1.100:3000");
});

test("production invitation links ignore the request hostname and require the canonical frontend", () => {
  for (const current of ["http://127.0.0.1:3001", "https://admin.example", "https://untrusted.example"]) {
    assert.equal(origin.getInvitationOrigin(current, "https://invitation.example", false), "https://invitation.example");
  }
  assert.throws(() => origin.getInvitationOrigin("https://admin.example", undefined, false));
});

test("preview anchors preserve attributes and children while hydration updates only development URLs", () => {
  for (const NODE_ENV of ["development", "production"]) {
    let state;
    let effect;
    const { InvitationPreviewLink } = load("components/invitation-preview-link.tsx", {
      NODE_ENV, NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
    }, {
      "@/lib/invitation-origin": origin,
      react: {
        useState(initial) { state ??= initial; return [state, (next) => { state = next; }]; },
        useEffect(callback) { effect = callback; },
      },
    }, { window: { location: { origin: "http://192.168.1.100:3001" } } });
    const props = { target: "_blank", rel: "noreferrer", className: "admin-button", children: "Xem thiệp cưới" };
    const first = InvitationPreviewLink(props);
    assert.equal(first.props.href, "http://localhost:3000");
    effect();
    const hydrated = InvitationPreviewLink(props);
    assert.equal(hydrated.props.href, NODE_ENV === "development" ? "http://192.168.1.100:3000" : "http://localhost:3000");
    for (const [key, value] of Object.entries(props)) assert.equal(hydrated.props[key], value);
  }
});
