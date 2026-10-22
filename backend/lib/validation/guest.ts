export const guestGroups = ["groom", "bride"] as const;
export type GuestGroup = (typeof guestGroups)[number];

export function isGuestGroup(value: unknown): value is GuestGroup {
  return typeof value === "string" && guestGroups.includes(value as GuestGroup);
}

export function parseGuestInput(value: unknown) {
  if (!value || typeof value !== "object") return { error: "Invalid request" as const };
  const input = value as Record<string, unknown>;
  const displayName = typeof input.displayName === "string" ? input.displayName.trim() : "";
  const guestGroup = input.guestGroup;
  if (displayName.length < 1 || displayName.length > 160 || !isGuestGroup(guestGroup)) return { error: "Invalid request" as const };
  return { value: { displayName, guestGroup } };
}

export function parseGuestPatch(value: unknown) {
  if (!value || typeof value !== "object") return { error: "Invalid request" as const };
  const input = value as Record<string, unknown>;
  const result: { displayName?: string; guestGroup?: GuestGroup } = {};
  if (input.displayName !== undefined) {
    if (typeof input.displayName !== "string" || input.displayName.trim().length < 1 || input.displayName.trim().length > 160) return { error: "Invalid request" as const };
    result.displayName = input.displayName.trim();
  }
  if (input.guestGroup !== undefined) {
    if (!isGuestGroup(input.guestGroup)) return { error: "Invalid request" as const };
    result.guestGroup = input.guestGroup;
  }
  if (!result.displayName && !result.guestGroup) return { error: "Invalid request" as const };
  return { value: result };
}
