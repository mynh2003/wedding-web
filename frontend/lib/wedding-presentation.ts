import { resolveDressCodeColors } from "@/lib/dress-code";
import { resolveInvitationCopy } from "@/lib/invitation-copy";
import { sectionImageGroups } from "@/lib/section-images";
import type { PublicWedding } from "@/lib/wedding-types";

export const DEFAULT_INVITATION_TEXT = "Thân mời bạn đến dự đám cưới cùng gia đình chúng tôi!";

export function buildWeddingPresentation(loaded: PublicWedding | null) {
  const fallback = {
    dressCodeColors: [] as string[],
    invitationCopy: resolveInvitationCopy(),
    groomName: "{{groom_name}}",
    brideName: "{{bride_name}}",
    date: "{{wedding_date}}",
    dateDay: "{{day}}",
    dateMonth: "{{month}}",
    dateYear: "{{year}}",
    countdownDate: "",
    countdownTime: "",
    mealDate: "",
    mealLunarDate: "",
    groomMealTime: "",
    brideMealTime: "",
    groomFatherName: "",
    groomMotherName: "",
    brideFatherName: "",
    brideMotherName: "",
    invitationText: DEFAULT_INVITATION_TEXT,
    groomCeremonyName: "",
    brideCeremonyName: "",
    groomCeremonyTime: "",
    brideCeremonyTime: "",
    groomCeremonyDateText: "",
    brideCeremonyDateText: "",
    ceremonyDateText: "",
    lunarDateText: "",
    groomVenueAddress: "",
    brideVenueAddress: "",
    groomMapUrl: "",
    brideMapUrl: "",
    sectionImages: {} as Record<string, string>,
    coverImageUrl: null as string | null,
    introImageUrl: null as string | null,
  };
  if (!loaded) return fallback;

  const { wedding: data, content: sectionContent, imageUrls } = loaded;
  const hero = sectionContent.hero ?? {};
  const family = sectionContent.families ?? {};
  const sectionImages: Record<string, string> = {};
  for (const { section, fields } of sectionImageGroups) {
    for (const field of fields) {
      const id = sectionContent[section]?.[field];
      if (typeof id === "string" && imageUrls[id]) sectionImages[field] = imageUrls[id];
    }
  }

  const coverImageUrl = typeof hero.cover_media_id === "string" ? imageUrls[hero.cover_media_id] ?? null : null;
  const introImageUrl = typeof hero.intro_media_id === "string" ? imageUrls[hero.intro_media_id] ?? null : null;
  const text = (key: string) => typeof family[key] === "string" ? family[key] as string : "";
  const date = new Date(data.wedding_date);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "00";

  return {
    dressCodeColors: resolveDressCodeColors(sectionContent.dress_code?.colors),
    invitationCopy: resolveInvitationCopy(sectionContent.copy),
    groomName: data.groom_name,
    brideName: data.bride_name,
    date: `${part("day")}.${part("month")}.${part("year")}`,
    dateDay: part("day"),
    dateMonth: part("month"),
    dateYear: part("year"),
    countdownDate: `${part("year")}-${part("month")}-${part("day")}`,
    countdownTime: `${part("hour")}:${part("minute")}`,
    mealDate: text("meal_date"),
    mealLunarDate: text("meal_lunar_date_text"),
    groomMealTime: text("groom_meal_time"),
    brideMealTime: text("bride_meal_time"),
    groomFatherName: text("groom_father_name"),
    groomMotherName: text("groom_mother_name"),
    brideFatherName: text("bride_father_name"),
    brideMotherName: text("bride_mother_name"),
    invitationText: text("invitation_text").trim() || DEFAULT_INVITATION_TEXT,
    groomCeremonyName: text("groom_ceremony_name"),
    brideCeremonyName: text("bride_ceremony_name"),
    groomCeremonyTime: text("groom_ceremony_time"),
    brideCeremonyTime: text("bride_ceremony_time"),
    groomCeremonyDateText: text("groom_ceremony_date_text"),
    brideCeremonyDateText: text("bride_ceremony_date_text"),
    ceremonyDateText: text("groom_ceremony_date_text") || text("bride_ceremony_date_text"),
    lunarDateText: text("lunar_date_text"),
    groomVenueAddress: text("groom_venue_address"),
    brideVenueAddress: text("bride_venue_address"),
    groomMapUrl: text("groom_map_url"),
    brideMapUrl: text("bride_map_url"),
    sectionImages,
    coverImageUrl,
    introImageUrl,
  };
}


export type WeddingPresentation = ReturnType<typeof buildWeddingPresentation>;
