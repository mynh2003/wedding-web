import "server-only";

import { createHash, randomBytes } from "node:crypto";

export function createInvitationToken() {
  const rawToken = randomBytes(32).toString("hex");
  return { rawToken, tokenHash: hashInvitationToken(rawToken) };
}

export function hashInvitationToken(rawToken: string) {
  return createHash("sha256").update(rawToken, "utf8").digest("hex");
}

export function isInvitationToken(value: string) {
  return /^[a-f0-9]{64}$/.test(value);
}
