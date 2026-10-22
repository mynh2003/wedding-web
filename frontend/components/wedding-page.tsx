import { Countdown } from "@/components/countdown";
import { CoverGate } from "@/components/cover-gate";
import { DressCode } from "@/components/dress-code";
import { Gallery } from "@/components/gallery";
import { HeroBanner } from "@/components/hero-banner";
import { InertialScroll } from "@/components/inertial-scroll";
import { LoveStory } from "@/components/love-story";
import { MusicPlayer } from "@/components/music-player";
import { FloralEntrance, Reveal } from "@/components/reveal";
import { SaveTheDate } from "@/components/save-the-date";
import { PageImagePreloader, ScrollImage as Image, ScrollZoom } from "@/components/scroll-zoom";
import { WeddingCalendar } from "@/components/wedding-calendar";
import { WeddingGift } from "@/components/wedding-gift";
import { WishesSection } from "@/components/wishes-section";
import { getWeddingPresentation } from "@/lib/wedding-data";
import { DEFAULT_INVITATION_TEXT } from "@/lib/wedding-presentation";

type WeddingPageProps = {
  guestName?: string;
  variant?: "groom" | "bride";
  weddingSlug?: string;
  invitationToken?: string;
};

export async function WeddingPage({ guestName, variant, weddingSlug, invitationToken }: WeddingPageProps = {}) {
  const couple = await getWeddingPresentation(weddingSlug);
  const groomFamily = {
    title: "NHÀ TRAI",
    father: couple.groomFatherName,
    mother: couple.groomMotherName,
    ceremony: "Lễ thành hôn",
    time: couple.groomCeremonyTime,
    ceremonyDate: couple.groomCeremonyDateText,
    address: couple.groomVenueAddress,
    mapUrl: couple.groomMapUrl,
  };
  const brideFamily = {
    title: "NHÀ GÁI",
    father: couple.brideFatherName,
    mother: couple.brideMotherName,
    ceremony: "Lễ thành hôn",
    time: couple.groomCeremonyTime,
    ceremonyDate: couple.brideCeremonyDateText,
    address: couple.brideVenueAddress,
    mapUrl: couple.brideMapUrl,
  };
  const displayedFamilies = variant === "bride" ? [brideFamily, groomFamily] : [groomFamily, brideFamily];
  const ceremonyPanels = [variant === "bride" ? brideFamily : groomFamily];
  const lunarDate = couple.lunarDateText
    .replace(/^\s*\(?\s*\d{1,2}[./-]\d{1,2}[./-]\d{4}\s*/u, "")
    .replace(/[()]/gu, "")
    .trim()
    .replace(/^tức\b/iu, "Tức");
  const lunarDateText = lunarDate;
  const weddingCalendarDate = couple.countdownDate ? new Date(`${couple.countdownDate}T12:00:00+07:00`) : null;
  const weekdayText = weddingCalendarDate && !Number.isNaN(weddingCalendarDate.getTime())
    ? new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", weekday: "long" }).format(weddingCalendarDate)
    : "";
  const monthText = /^\d{2}$/.test(couple.dateMonth) ? String(Number(couple.dateMonth)) : couple.dateMonth;
  const invitationSource = couple.invitationText.trim() || DEFAULT_INVITATION_TEXT;
  const invitationText = (() => {
    if (!guestName) return invitationSource;
    const wordPattern = /(?<![\p{L}\p{N}_])bạn(?![\p{L}\p{N}_])/giu;
    const source = /(?<![\p{L}\p{N}_])bạn(?![\p{L}\p{N}_])/iu.test(invitationSource)
      ? invitationSource
      : DEFAULT_INVITATION_TEXT;
    const parts: (string | React.JSX.Element)[] = [];
    let cursor = 0;
    let replacementIndex = 0;
    for (const match of source.matchAll(wordPattern)) {
      const index = match.index ?? cursor;
      parts.push(source.slice(cursor, index));
      parts.push(<em key={`guest-${replacementIndex++}`} className="font-semibold">{guestName}</em>);
      cursor = index + match[0].length;
    }
    parts.push(source.slice(cursor));
    return parts;
  })();

  return (
    <main className="mobile-landing mx-auto w-full max-w-[430px] bg-cream shadow-2xl">
      <InertialScroll />
      <PageImagePreloader />
      <FloralEntrance />
      <CoverGate guestName={guestName} />
      <MusicPlayer />
      <HeroBanner groomName={couple.groomName} brideName={couple.brideName} date={couple.date} imageUrl={couple.coverImageUrl} />
      <SaveTheDate
        groomName={couple.groomName}
        brideName={couple.brideName}
        date={couple.date}
        day={couple.dateDay}
        month={couple.dateMonth}
        year={couple.dateYear}
        images={[couple.sectionImages.intro_media_id, couple.sectionImages.intro_second_media_id, couple.sectionImages.intro_third_media_id]}
        quote={couple.invitationCopy.quote_text}
      />
      <figure className="invitation-photo-banner relative m-0 aspect-[7/6] w-full overflow-hidden">
        <Image
          src={couple.sectionImages.banner_media_id || "/placeholders/image.svg"}
          alt="Ảnh banner thiệp cưới"
          fill
          sizes="(max-width: 430px) 100vw, 430px"
          className="object-cover"
        />
      </figure>
      <section className="wedding-invitation-section cream-paper floral-paper floral-paper--invitation relative overflow-hidden px-5 py-10 text-center font-display text-wine sm:px-8 sm:py-14">
        <div className="relative mx-auto w-full max-w-[420px]">
          <div className="mx-auto grid w-full max-w-[377px] grid-cols-[minmax(0,1fr)_2px_minmax(0,1fr)] items-center gap-x-0">
            <Reveal effect="left" delay={.04} className="min-w-0 break-words px-[clamp(4px,2vw,10px)] text-center">
              <p className="invitation-bold-label text-[14px] font-bold uppercase leading-[1.6]">{displayedFamilies[0].title}</p>
              <div className="mt-[2px] text-[14px] font-normal leading-[1.3]">
                {displayedFamilies[0].father && <p>{displayedFamilies[0].father}</p>}
                {displayedFamilies[0].mother && <p>{displayedFamilies[0].mother}</p>}
              </div>
            </Reveal>
            <Reveal effect="line" delay={.1} className="reveal-line-vertical h-[88px] w-[2px] self-center justify-self-center bg-wine" />
            <Reveal effect="right" delay={.16} className="min-w-0 break-words px-[clamp(4px,2vw,10px)] text-center">
              <p className="invitation-bold-label text-[14px] font-bold uppercase leading-[1.6]">{displayedFamilies[1].title}</p>
              <div className="mt-[2px] text-[14px] font-normal leading-[1.3]">
                {displayedFamilies[1].father && <p>{displayedFamilies[1].father}</p>}
                {displayedFamilies[1].mother && <p>{displayedFamilies[1].mother}</p>}
              </div>
            </Reveal>
          </div>
          {invitationText && (
            <Reveal className="invitation-copy wedding-description mx-auto mt-6 max-w-[377px] whitespace-pre-line text-[16px] font-normal leading-[1.4]">
              {invitationText}
            </Reveal>
          )}
          <Reveal delay={.08} className="mx-auto mt-7 max-w-[377px]">
            <h2 className="break-words text-[clamp(32px,11vw,46px)] font-bold uppercase leading-[1.6] tracking-normal">{couple.groomName}</h2>
            <p className="-my-2 break-words font-flavinda text-[clamp(2.25rem,8vw,2.75rem)] font-normal leading-[1.2] tracking-normal">&amp;</p>
            <h2 className="break-words text-[clamp(32px,11vw,46px)] font-bold uppercase leading-[1.6] tracking-normal">{couple.brideName}</h2>
          </Reveal>
          <Reveal delay={.12} className="mx-auto mt-6 max-w-[360px] font-body text-[16px] font-normal uppercase leading-[1.3]">
            {ceremonyPanels.map((panel) => (
              <div key={panel.title} className="break-words">
                <p>{panel.ceremony || "Lễ thành hôn"} ĐƯỢC TỔ CHỨC</p>
                <p>VÀO LÚC {panel.time || couple.countdownTime || "{{wedding_time}}"}{weekdayText && <>, {weekdayText}</>}</p>
              </div>
            ))}
          </Reveal>
          <Reveal delay={.16} className="invitation-calendar mx-auto mt-4 grid w-full max-w-[290px] grid-cols-[minmax(0,1fr)_80px_minmax(0,1fr)] items-center font-body text-center uppercase">
            <span className="invitation-calendar__side">Tháng {monthText}</span>
            <span className="text-center text-[46.54px] font-normal leading-[1.6] tracking-[1px]">{couple.dateDay}</span>
            <span className="invitation-calendar__side">Năm {couple.dateYear}</span>
          </Reveal>
          {lunarDateText && (
            <Reveal delay={.2} className="mx-auto mt-2 max-w-[377px] whitespace-pre-line font-display text-[17px] font-normal italic leading-[1.6]">
              ({lunarDateText})
            </Reveal>
          )}
          <div className={`mx-auto mt-6 grid w-full max-w-[377px] gap-4 ${ceremonyPanels.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
            {ceremonyPanels.map((panel, index) => (
              <Reveal key={panel.title} delay={.24 + index * .08} className="min-w-0 break-words text-[14px] font-normal leading-[1.3]">
                <p className="text-[16px]">Tại địa điểm</p>
                <p className="invitation-bold-label mt-1 text-[clamp(16px,5vw,20px)] font-bold uppercase">NHÀ VĂN HÓA</p>
                <p className="mt-2 text-[16px] italic">{panel.address}</p>
                {panel.mapUrl && (
                  <a
                    href={panel.mapUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex items-center gap-2 rounded-full border border-wine/35 px-4 py-2 text-[13px] font-semibold normal-case tracking-wide text-wine transition-colors duration-200 hover:border-wine hover:bg-wine hover:text-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine focus-visible:ring-offset-2"
                  >
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0">
                      <path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="12" cy="10" r="2.25" stroke="currentColor" strokeWidth="1.7" />
                    </svg>
                    <span>Xem bản đồ</span>
                  </a>
                )}
              </Reveal>
            ))}
          </div>
        </div>
      </section>
      <WeddingCalendar
        variant={variant}
        weddingDate={couple.countdownDate}
        schedule={{
          mealDate: couple.mealDate,
          mealLunarDate: couple.mealLunarDate,
          lunarDate: couple.lunarDateText,
          ceremonyTime: couple.groomCeremonyTime || couple.countdownTime,
          families: [
            { side: "groom", mealTime: couple.groomMealTime, address: couple.groomVenueAddress, mapUrl: couple.groomMapUrl },
            { side: "bride", mealTime: couple.brideMealTime, address: couple.brideVenueAddress, mapUrl: couple.brideMapUrl },
          ],
        }}
        imageUrl={couple.sectionImages.calendar_banner_media_id}
      />
      <section aria-label="Trang phục dự tiệc" className="dress-code-section cream-paper px-6">
        <DressCode imageUrl={couple.sectionImages.dress_code_photo_media_id} colors={couple.dressCodeColors} />
      </section>
      <LoveStory
        pages={couple.invitationCopy.story_pages}
        images={[couple.sectionImages.story_photo_media_id, ...Array.from({ length: 4 }, (_, i) => couple.sectionImages[`story_photo_${i + 2}_media_id`])]}
      />
      <section className="album-section cream-paper px-5 pt-8 sm:px-8 sm:pt-10">
        <Gallery
          coverImage={couple.sectionImages.album_cover_media_id}
          images={Array.from({ length: 5 }, (_, i) => couple.sectionImages[`slideshow_${i + 1}_media_id`])}
        />
      </section>
      <section className="wishes-and-countdown-section cream-paper floral-paper floral-paper--wishes px-4 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal effect="fade">
            <WishesSection
              introduction={couple.invitationCopy.rsvp_text}
              variant={variant}
              invitationToken={invitationToken}
              gift={<WeddingGift variant={variant} weddingSlug={weddingSlug} groomName={couple.groomName} brideName={couple.brideName} />}
            />
          </Reveal>
          <Reveal effect="fade" delay={.12} className="mx-auto mt-8 max-w-3xl reveal-divider pt-8 text-center">
            <h2 className="max-w-full whitespace-nowrap font-flavinda text-[clamp(1.35rem,7vw,2rem)] leading-[1.25] text-wine">Countdown Wedding Day</h2>
            <Countdown date={couple.countdownDate || couple.date} time={couple.countdownTime || "{{wedding_time}}"} />
          </Reveal>
        </div>
      </section>
      <section aria-labelledby="thank-you-heading" className="thank-you-section">
        <ScrollZoom className="absolute inset-0 -z-[2]">
          <div
            aria-hidden="true"
            className="thank-you-forest"
            style={couple.sectionImages.thank_you_media_id ? { backgroundImage: `url("${couple.sectionImages.thank_you_media_id}")` } : undefined}
          />
        </ScrollZoom>
        <div aria-hidden="true" className="thank-you-shade" />
        <Reveal className="thank-you-copy" viewportInset={0}>
          <h2 id="thank-you-heading" className="thank-you-heading">Thank you</h2>
          <p className="thank-you-description whitespace-pre-line break-words">{couple.invitationCopy.thank_you_text}</p>
        </Reveal>
      </section>
      <footer className="bg-wine px-6 py-2 text-center text-cream">
        <p className="font-body text-[10px] font-medium tracking-[.05em] text-cream/75">{couple.groomName} &amp; {couple.brideName} · {couple.date}</p>
      </footer>
    </main>
  );
}
