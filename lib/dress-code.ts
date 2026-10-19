export const DRESS_CODE_PLACEHOLDER = "#d1d5db";
export function isDressCodeColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}
export function resolveDressCodeColors(value: unknown): string[] {
  return Array.from({ length: 5 }, (_, index) =>
    Array.isArray(value) && isDressCodeColor(value[index]) ? value[index] : "");
}
