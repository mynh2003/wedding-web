export type WishInput = { authorName: string; message: string; side?: "groom" | "bride"; attendance?: "attending" | "not-attending"; invitationToken?: string };

export function parseWishInput(value: unknown): { value: WishInput } | { error: string } {
  if (!value || typeof value !== "object") return { error: "Dữ liệu không hợp lệ." };
  const body = value as Record<string, unknown>;
  const authorName = typeof body.authorName === "string" ? body.authorName.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (authorName.length < 1 || authorName.length > 120) return { error: "Tên phải dài từ 1 đến 120 ký tự." };
  if (message.length < 1 || message.length > 2000) return { error: "Lời chúc phải dài từ 1 đến 2.000 ký tự." };
  if (body.side != null && body.side !== "groom" && body.side !== "bride") return { error: "Phía khách mời không hợp lệ." };
  if (body.attendance != null && body.attendance !== "attending" && body.attendance !== "not-attending") return { error: "Trạng thái tham dự không hợp lệ." };
  if (body.invitationToken != null && (typeof body.invitationToken !== "string" || !/^[a-f0-9]{64}$/.test(body.invitationToken))) return { error: "Link thiệp không hợp lệ." };
  if (body.invitationToken != null && body.attendance == null) return { error: "Vui lòng chọn trạng thái tham dự." };
  return { value: { authorName, message, side: body.side as WishInput["side"], attendance: body.attendance as WishInput["attendance"], invitationToken: body.invitationToken as WishInput["invitationToken"] } };
}
