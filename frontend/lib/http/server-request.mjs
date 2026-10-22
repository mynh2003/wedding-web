import http from "node:http";
import https from "node:https";

// Server-only HTTP transport. Native fetch can discard Host overrides; internal
// service requests need to retain the public backend host behind a reverse proxy.
// Keep redirects manual and bound response size so failures cannot buffer forever.
export function serverRequest(input, init = {}) {
  const url = new URL(input);
  if (!["http:", "https:"].includes(url.protocol)) throw new TypeError("Expected an HTTP(S) URL.");
  if (init.body != null && typeof init.body !== "string") throw new TypeError("Expected a string request body.");
  const transport = url.protocol === "https:" ? https : http;
  return new Promise((resolve, reject) => {
    const request = transport.request(url, {
      method: init.method ?? "GET",
      headers: Object.fromEntries(new Headers(init.headers)),
      signal: init.signal ?? AbortSignal.timeout(15_000),
    }, (response) => {
      const chunks = [];
      let bytes = 0;
      response.on("data", (chunk) => {
        bytes += chunk.length;
        if (bytes > 5 * 1024 * 1024) {
          response.destroy(new Error("Backend response exceeded 5 MiB."));
          return;
        }
        chunks.push(chunk);
      });
      response.on("error", reject);
      response.on("end", () => {
        const status = response.statusCode ?? 502;
        const headers = new Headers();
        for (let index = 0; index < response.rawHeaders.length; index += 2) {
          headers.append(response.rawHeaders[index], response.rawHeaders[index + 1]);
        }
        resolve(new Response([204, 205, 304].includes(status) ? null : new Uint8Array(Buffer.concat(chunks)), { status, headers }));
      });
    });
    request.on("error", reject);
    request.end(init.body);
  });
}
