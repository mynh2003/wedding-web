import { Reveal } from "@/components/reveal";
import { ProgressiveImage, ScrollZoom } from "@/components/scroll-zoom";

type SaveTheDateProps = {
  groomName: string;
  brideName: string;
  date: string;
  day: string;
  month: string;
  year: string;
  images: (string | null | undefined)[];
  quote: string;
};

export function SaveTheDate({ groomName, brideName, date, day, month, year, images, quote }: SaveTheDateProps) {
  const numbers = [day, month, /^\d{4}$/.test(year) ? year.slice(-2) : year];
  const fallbacks = ["/placeholders/image.svg", "/placeholders/image.svg", "/placeholders/image.svg"];

  return (
    <section className="save-date-section" aria-labelledby="save-date-heading">
      <Reveal>
        <h2 id="save-date-heading" className="save-date-heading" aria-label="Save the Date">
          <span>SAVE</span>{" "}<span className="save-date-heading-the">the</span>{" "}<span>DATE</span>
        </h2>
      </Reveal>
      <div className="save-date-photos" role="group" aria-label={`Ngày cưới ${date}`}>
        {numbers.map((number, index) => (
          <Reveal key={index} effect="image" delay={index * .1} className="save-date-photo-reveal">
            <figure className="save-date-photo">
              <ScrollZoom amount={.08} parallax={index === 1 ? .025 : .045}>
                <ProgressiveImage src={images[index] || fallbacks[index]} alt={`Ảnh cưới ${groomName} và ${brideName}, khoảnh khắc ${index + 1}`} fill sizes="(max-width: 430px) 28vw, 120px" className="object-cover" />
              </ScrollZoom>
              <span className="save-date-photo-overlay" aria-hidden="true" />
              <figcaption className="save-date-number" aria-hidden="true">{number}</figcaption>
            </figure>
          </Reveal>
        ))}
      </div>
      <Reveal className="save-date-couple">
        <p className="save-date-eyebrow">For the wedding of</p>
        <ProgressiveImage src="/assets/monogram-mh-preview.optimized.webp" alt={`Logo tên ${groomName} và ${brideName}`} width={500} height={470} className="save-date-logo" />
      </Reveal>
      <Reveal className="save-date-footer">
        {quote && <blockquote className="save-date-quote wedding-description invitation-copy">“{quote}”</blockquote>}
      </Reveal>
    </section>
  );
}
