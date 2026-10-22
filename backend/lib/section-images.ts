// Keep storage keys stable while grouping images by their position on the invitation.
export const sectionImageGroups = [
  { title: "Section 1 · Hero banner", section: "hero", fields: ["cover_media_id"] },
  { title: "Section 2 · Lời mở đầu", section: "hero", fields: ["intro_media_id", "intro_second_media_id", "intro_third_media_id"] },
  { title: "Section 3 · Image banner", section: "invitation", fields: ["banner_media_id"] },
  { title: "Section 4 · Lịch ngày cưới (7:6)", section: "invitation", fields: ["calendar_banner_media_id"] },
  { title: "Section 5 · Dress code", section: "dress_code", fields: ["dress_code_photo_media_id"] },
  { title: "Section 6 · The love story", section: "story", fields: ["story_photo_media_id", ...Array.from({ length: 4 }, (_, i) => `story_photo_${i + 2}_media_id`)] },
  { title: "Section 7 · Album of love", section: "story", fields: ["album_cover_media_id"] },
  { title: "Section 8 · Slide show", section: "story", fields: Array.from({ length: 5 }, (_, i) => `slideshow_${i + 1}_media_id`) },
  { title: "Section 9 · Mừng cưới", section: "gifts", fields: ["gift_banner_media_id"] },
  { title: "Section 10 · Thank you", section: "hero", fields: ["thank_you_media_id"] },
];
