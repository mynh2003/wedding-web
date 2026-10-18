export const defaultInvitationCopy = {
  quote_text: "Hôn nhân không phải là tìm thấy người mình có thể sống cùng, mà là tìm thấy người mình không thể sống thiếu.",
  story_pages: [
    "Từ những ngày đầu gặp gỡ, chúng mình dần tìm thấy sự bình yên khi ở bên nhau.",
    "Qua những vui buồn sẻ chia, tình yêu lớn lên từng ngày bằng lắng nghe và thấu hiểu.",
    "Hôm nay, chúng mình chọn cùng vun đắp một mái ấm, cùng gìn giữ lời yêu thương.",
    "Trân trọng từng chặng đường, biết ơn những người yêu quý đã cùng chứng kiến ngày vui.",
  ],
  rsvp_text: "Sự hiện diện của bạn là niềm hạnh phúc lớn của chúng mình. Xin vui lòng xác nhận tham dự để chúng mình có thể chuẩn bị đón tiếp thật chu đáo.",
  thank_you_text: "Cảm ơn bạn đã dành tình cảm cho chúng mình!\nSự hiện diện của bạn chính là món quà ý nghĩa nhất,\nvà chúng mình vô cùng trân quý khi được cùng bạn chia sẻ\nniềm hạnh phúc trong ngày trọng đại này.",
};

export type InvitationCopy = typeof defaultInvitationCopy;

export function resolveInvitationCopy(value: Record<string, unknown> = {}): InvitationCopy {
  const text = (key: "quote_text" | "rsvp_text" | "thank_you_text") =>
    typeof value[key] === "string" && value[key].trim() ? value[key] as string : defaultInvitationCopy[key];
  const pages = Array.isArray(value.story_pages) ? value.story_pages : [];
  return {
    quote_text: text("quote_text"),
    rsvp_text: text("rsvp_text"),
    thank_you_text: text("thank_you_text"),
    story_pages: defaultInvitationCopy.story_pages.map((fallback, index) => typeof pages[index] === "string" && pages[index].trim() ? pages[index] : fallback),
  };
}
