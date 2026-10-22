import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";
import { serverRequest } from "../lib/http/server-request.mjs";

async function withServer(handler, check) {
  const server = http.createServer(handler);
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  try { await check(`http://127.0.0.1:${server.address().port}`); }
  finally { server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); }
}

test("internal transport preserves the canonical Host and reads backend JSON", async () => {
  await withServer((request, response) => {
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify({ host: request.headers.host, cookie: request.headers.cookie ?? null, path: request.url }));
  }, async (origin) => {
    const response = await serverRequest(`${origin}/api/public/wedding`, { headers: { Host: "management.example.net" } });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { host: "management.example.net", cookie: null, path: "/api/public/wedding" });
  });
});

test("POST payloads are preserved and redirects are returned without following them", async () => {
  await withServer(async (request, response) => {
    const parts = [];
    for await (const part of request) parts.push(part);
    assert.equal(Buffer.concat(parts).toString(), JSON.stringify({ tokenHash: "a".repeat(64) }));
    response.writeHead(303, { Location: "/admin" });
    response.end();
  }, async (origin) => {
    const response = await serverRequest(`${origin}/api/public/invitation`, { method: "POST", body: JSON.stringify({ tokenHash: "a".repeat(64) }), headers: { "Content-Type": "application/json" } });
    assert.equal(response.status, 303);
    assert.equal(response.headers.get("location"), "/admin");
  });
});

test("204 responses remain body-free and pending requests honor cancellation", async () => {
  await withServer((request, response) => {
    if (request.url === "/empty") { response.writeHead(204); response.end(); }
  }, async (origin) => {
    const empty = await serverRequest(`${origin}/empty`);
    assert.equal(empty.status, 204);
    assert.equal(await empty.text(), "");
    await assert.rejects(serverRequest(`${origin}/pending`, { signal: AbortSignal.timeout(50) }), { name: "AbortError" });
  });
});
