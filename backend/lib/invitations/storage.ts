import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { isInvitationToken } from "@/lib/invitations/token";

function encryptionKey() {
  const key = process.env.INVITATION_LINK_ENCRYPTION_KEY;
  if (!key || !/^[a-fA-F0-9]{64}$/.test(key)) throw new Error("Invitation link encryption is not configured");
  return Buffer.from(key, "hex");
}

// Bind each ciphertext to its wedding and guest so it cannot be moved to another guest.
export function encryptInvitationToken(token: string, weddingId: string, guestId: string) {
  if (!isInvitationToken(token)) throw new Error("Invalid invitation token");
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), nonce);
  cipher.setAAD(Buffer.from(`${weddingId}:${guestId}`, "utf8"));
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return ["v1", nonce.toString("hex"), cipher.getAuthTag().toString("hex"), encrypted.toString("hex")].join(".");
}

export function decryptInvitationToken(value: string, weddingId: string, guestId: string) {
  if (!/^v1\.[a-f0-9]{24}\.[a-f0-9]{32}\.[a-f0-9]{128}$/.test(value)) throw new Error("Invalid encrypted invitation token");
  const [, nonce, tag, encrypted] = value.split(".");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(nonce, "hex"));
  decipher.setAAD(Buffer.from(`${weddingId}:${guestId}`, "utf8"));
  decipher.setAuthTag(Buffer.from(tag, "hex"));
  const token = Buffer.concat([decipher.update(Buffer.from(encrypted, "hex")), decipher.final()]).toString("utf8");
  if (!isInvitationToken(token)) throw new Error("Invalid invitation token");
  return token;
}
