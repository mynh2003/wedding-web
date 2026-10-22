import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

function renderViewer() {
  const events = [];
  const dialog = { open: true, close() { this.open = false; events.push("close"); } };
  let refIndex = 0;
  const exports = {};
  const jsx = (type, props) => ({ type, props });
  const dependencies = {
    "next/image": { default: () => null },
    "react/jsx-runtime": { jsx, jsxs: jsx },
    react: {
      useCallback: (callback) => callback,
      useEffect: () => {},
      useRef: (value) => ({ current: refIndex++ === 0 ? dialog : value }),
      useState: (value) => [value, () => events.push(dialog.open ? "reset-while-visible" : "reset")],
    },
    "framer-motion": { motion: { div: "div" }, useReducedMotion: () => false },
  };
  const source = ts.transpileModule(fs.readFileSync("components/photo-viewer.tsx", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(source, { exports, require: (name) => dependencies[name] });
  const rendered = exports.PhotoViewer({ photos: [{ src: "/test.jpg", alt: "Ảnh" }], viewerIndex: 0,
    setViewerIndex: () => events.push(dialog.open ? "unmount-while-visible" : "unmount") });
  return { dialog, events, props: rendered.props };
}

test("viewer closes the native dialog before clearing exit styles, image or zoom", () => {
  const { props, dialog, events } = renderViewer();
  const target = {};
  props.onAnimationEnd({ target, currentTarget: target, animationName: "album-viewer-close" });
  assert.equal(dialog.open, false);
  assert.deepEqual(events, ["close", "unmount", "reset", "reset"]);
});

test("child and opening animation events cannot finish the close", () => {
  const { props, events } = renderViewer();
  const target = {};
  props.onAnimationEnd({ target: {}, currentTarget: target, animationName: "album-viewer-close" });
  props.onAnimationEnd({ target, currentTarget: target, animationName: "album-viewer-open" });
  assert.deepEqual(events, []);
});

test("a delayed native close event cannot reset a reopened viewer", () => {
  const { props, events } = renderViewer();
  props.onClose();
  assert.deepEqual(events, []);
});
