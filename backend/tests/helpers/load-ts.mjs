import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";

export function loader(env = {}, mocks = {}) {
  const require = createRequire(import.meta.url);
  const modules = new Map();
  function load(file) {
    const resolved = path.resolve(file);
    if (modules.has(resolved)) return modules.get(resolved);
    const exports = {};
    modules.set(resolved, exports);
    const source = ts.transpileModule(fs.readFileSync(resolved, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    }).outputText;
    vm.runInNewContext(source, {
      exports, process: { env }, console, Request, Response, Headers, URL, URLSearchParams,
      TextDecoder, TextEncoder, Uint8Array, Buffer, AbortController, AbortSignal, setTimeout, clearTimeout,
      require(name) {
        if (Object.hasOwn(mocks, name)) return mocks[name];
        if (name === "server-only") return {};
        if (name.startsWith("@/")) return load(`${name.slice(2)}.ts`);
        return require(name);
      },
    });
    return exports;
  }
  return load;
}
