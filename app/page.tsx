import { Countdown } from "@/components/countdown";
import { CoverGate } from "@/components/cover-gate";
import { Gallery } from "@/components/gallery";
import { MusicPlayer } from "@/components/music-player";
import { Reveal } from "@/components/reveal";
import Image from "next/image";

const timeline = [
  ["15:30", "Đón khách", "Một ly trà và những cuộc gặp gỡ thân tình"],
  ["09:30", "Lễ thành hôn", "Khoảnh khắc hai chúng mình trao lời hẹn ước"],
  ["18:00", "Tiệc mừng", "Cùng nâng ly chúc mừng ngày vui"],
];

const story = [
  ["2019", "Lần đầu gặp gỡ", "Một buổi chiều rất bình thường, rồi trở thành ngày bắt đầu của tất cả."],
  ["2022", "Cùng nhau lớn lên", "Qua những chuyến đi, những bữa cơm và cả những ngày không hoàn hảo."],
  ["2026", "Về chung một nhà", "Từ hôm nay, mọi hành trình phía trước sẽ luôn có chúng mình."],
];

export default function Home() {
  return (
    <main className="overflow-hidden bg-cream">
      <CoverGate />
      <MusicPlayer />

      <section className="relative flex min-h-screen items-center justify-center px-6 py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(212,175,55,.18),transparent_28%),radial-gradient(circle_at_85%_80%,rgba(114,47,55,.12),transparent_30%)]" />
        <div className="paper-grid absolute inset-0 opacity-30 [background-image:radial-gradient(rgba(114,47,55,.09)_0.7px,transparent_0.7px)]" />
        <Reveal className="relative mx-auto max-w-4xl text-center">
          <p className="mb-6 text-xs font-semibold uppercase tracking-[0.38em] text-wine">Save the date · 22.11.2026</p>
          <p className="font-display text-2xl italic text-wine/80 md:text-3xl">Trân trọng kính mời</p>
          <h1 className="mt-2 font-display text-7xl font-medium leading-[.85] tracking-tight text-wine sm:text-8xl md:text-[10rem]">Bình Minh <span className="text-gold">&amp;</span> Ninh Thị Huệ</h1>
          <p className="mx-auto mt-10 max-w-md text-sm leading-7 text-ink/65 md:text-base">Cùng chúng mình viết tiếp câu chuyện yêu thương bằng một ngày thật đẹp và thật nhiều kỷ niệm.</p>
          <a href="#invitation" className="group mt-10 inline-flex items-center gap-3 rounded-full bg-wine px-7 py-3.5 text-sm font-semibold text-cream shadow-soft transition duration-300 hover:-translate-y-1 hover:bg-ink focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2">Xem lời mời <span className="transition-transform group-hover:translate-x-1">↓</span></a>
        </Reveal>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[.3em] text-wine/50">Cuộn để xem thêm</div>
      </section>

      <section className="border-y border-wine/10 bg-white/50 px-6 py-10 md:py-14">
        <div className="mx-auto flex max-w-5xl snap-x gap-4 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {["/placeholders/ring-portrait.svg", "/placeholders/ring-wide.svg", "/placeholders/ring-detail.svg"].map((src, index) => <div key={src} className="relative h-56 min-w-[78vw] snap-center overflow-hidden rounded-2xl sm:min-w-[360px] md:h-72 md:min-w-0 md:flex-1"><Image src={src} alt={`Khung hình placeholder ${index + 1}`} fill sizes="(max-width: 768px) 78vw, 33vw" className="object-cover" /></div>)}
        </div>
      </section>

      <section id="invitation" className="bg-wine px-6 py-24 text-cream md:py-32">
        <div className="mx-auto grid max-w-5xl items-center gap-12 md:grid-cols-[1.1fr_.9fr]">
          <Reveal><p className="text-xs uppercase tracking-[.35em] text-gold">01 · Lời mời</p><h2 className="mt-5 font-display text-5xl leading-none md:text-7xl">Một ngày, một lời hẹn, một đời thương.</h2></Reveal>
          <Reveal delay={.1} className="border-l border-gold/40 pl-6 text-sm leading-8 text-cream/70"><p>Chúng mình rất vui khi được chia sẻ khoảnh khắc đặc biệt này cùng gia đình và những người thương yêu.</p><p className="mt-5 font-display text-2xl italic text-cream">Hẹn gặp bạn tại ngày vui nhé.</p></Reveal>
        </div>
      </section>

      <section className="px-6 py-24 md:py-32"><div className="mx-auto max-w-5xl"><Reveal><p className="text-xs uppercase tracking-[.35em] text-gold">02 · Save the date</p><h2 className="mt-4 font-display text-5xl text-wine md:text-7xl">Ngày chúng mình về chung một nhà</h2></Reveal><div className="mt-14 grid gap-4 md:grid-cols-3">{[["22", "Tháng mười một", "2026"], ["Chủ Nhật", "Ngày hạnh phúc", "09:30"], ["14 tháng 10", "Âm lịch", "Bính Ngọ"]].map((item, index) => <Reveal key={item[0]} delay={index * .08} className="rounded-2xl border border-wine/10 bg-white/50 p-8 text-center shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-xl"><p className="font-display text-4xl text-wine">{item[0]}</p><p className="mt-2 text-xs uppercase tracking-[.2em] text-wine/50">{item[1]}</p><p className="mt-5 text-sm font-semibold text-ink/70">{item[2]}</p></Reveal>)}</div></div></section>

      <section className="bg-white/50 px-6 py-24 md:py-32"><div className="mx-auto max-w-5xl"><Reveal><p className="text-xs uppercase tracking-[.35em] text-gold">03 · Hai gia đình</p><h2 className="mt-4 font-display text-5xl text-wine md:text-7xl">Từ hai nhà, thành một nhà</h2></Reveal><div className="mt-14 grid gap-6 md:grid-cols-2"><Reveal className="rounded-2xl border border-wine/10 bg-cream p-8 transition duration-300 hover:-translate-y-1 hover:shadow-xl md:p-10"><p className="text-xs uppercase tracking-[.25em] text-wine/50">Nhà trai</p><h3 className="mt-4 font-display text-3xl text-wine">Ông Lê Hữu Bình</h3><p className="mt-2 text-sm text-ink/65">Bà Nguyễn Thị Oanh</p></Reveal><Reveal delay={.1} className="rounded-2xl border border-wine/10 bg-cream p-8 transition duration-300 hover:-translate-y-1 hover:shadow-xl md:p-10"><p className="text-xs uppercase tracking-[.25em] text-wine/50">Nhà gái</p><h3 className="mt-4 font-display text-3xl text-wine">Ông Ninh Văn Hiền</h3><p className="mt-2 text-sm text-ink/65">Bà Nguyễn Thi Xuân</p></Reveal></div></div></section>

      <section className="px-6 py-24 md:py-32"><div className="mx-auto max-w-5xl"><div className="grid gap-12 md:grid-cols-[.8fr_1.2fr] md:items-end"><Reveal><p className="text-xs uppercase tracking-[.35em] text-gold">04 · Wedding details</p><h2 className="mt-4 font-display text-5xl text-wine md:text-7xl">Hẹn bạn tại nơi này</h2></Reveal><Reveal delay={.1} className="text-sm leading-8 text-ink/65"><p>The Garden House · 28 Mùa Thu, Tây Hồ, Hà Nội</p><p className="mt-2">Lễ thành hôn được tổ chức vào lúc 09:30, Chủ Nhật.</p><p className="mt-2">Tiệc mừng bắt đầu lúc 18:00.</p><a href="https://maps.google.com/?q=The+Garden+House+Hanoi" target="_blank" rel="noreferrer" className="mt-6 inline-flex rounded-full border border-wine px-5 py-3 text-xs font-semibold text-wine transition hover:bg-wine hover:text-cream">Chỉ đường ↗</a></Reveal></div></div></section>

      <section className="bg-ink px-6 py-24 text-cream md:py-32"><div className="mx-auto max-w-5xl"><Reveal><p className="text-xs uppercase tracking-[.35em] text-gold">05 · Storyline</p><h2 className="mt-4 font-display text-5xl md:text-7xl">Chuyện của chúng mình</h2></Reveal><div className="mt-14 space-y-0">{story.map((item, index) => <Reveal key={item[0]} delay={index * .08} className="grid gap-3 border-t border-cream/15 py-7 md:grid-cols-[120px_1fr_1.5fr] md:gap-8"><p className="font-display text-3xl text-gold">{item[0]}</p><h3 className="font-display text-2xl">{item[1]}</h3><p className="text-sm leading-7 text-cream/60">{item[2]}</p></Reveal>)}</div></div></section>

      <section className="px-6 py-24 md:py-32"><div className="mx-auto max-w-5xl"><Reveal><p className="text-xs uppercase tracking-[.35em] text-gold">06 · Timeline</p><h2 className="mt-4 font-display text-5xl text-wine md:text-7xl">Lịch trình ngày vui</h2></Reveal><div className="mt-14 grid gap-4 md:grid-cols-3">{timeline.map((item, index) => <Reveal key={item[0]} delay={index * .08} className="rounded-2xl border border-wine/10 p-7"><p className="font-display text-4xl text-wine">{item[0]}</p><h3 className="mt-5 font-semibold text-ink">{item[1]}</h3><p className="mt-3 text-sm leading-7 text-ink/60">{item[2]}</p></Reveal>)}</div></div></section>

      <section className="bg-white/50 px-6 py-24 md:py-32"><div className="mx-auto max-w-5xl"><div className="grid gap-12 md:grid-cols-2 md:items-center"><Reveal><p className="text-xs uppercase tracking-[.35em] text-gold">07 · Dress code</p><h2 className="mt-4 font-display text-5xl text-wine md:text-7xl">Mặc màu của niềm vui</h2><p className="mt-6 max-w-sm text-sm leading-7 text-ink/65">Một chút sắc kem, be, nâu ấm hoặc đỏ rượu sẽ làm ngày vui của chúng mình thêm trọn vẹn.</p></Reveal><Reveal delay={.1} className="flex justify-center gap-4"><span className="h-24 w-24 rounded-full bg-[#eadfce] shadow-soft sm:h-32 sm:w-32" /><span className="h-24 w-24 rounded-full bg-[#722f37] shadow-soft sm:h-32 sm:w-32" /><span className="h-24 w-24 rounded-full bg-[#d4af37] shadow-soft sm:h-32 sm:w-32" /></Reveal></div></div></section>

      <section className="px-6 py-24 md:py-32"><div className="mx-auto max-w-5xl"><Reveal><p className="text-xs uppercase tracking-[.35em] text-gold">08 · Album of love</p><h2 className="mt-4 font-display text-5xl text-wine md:text-7xl">Những khoảnh khắc thương yêu</h2></Reveal><div className="mt-12"><Gallery /></div></div></section>

      <section className="bg-wine px-6 py-24 text-cream md:py-32"><div className="mx-auto max-w-3xl text-center"><Reveal><p className="text-xs uppercase tracking-[.35em] text-gold">09 · Countdown</p><h2 className="mt-4 font-display text-5xl md:text-7xl">Đếm ngược đến ngày vui</h2><Countdown /></Reveal></div></section>

      <section className="px-6 py-24 md:py-32"><div className="mx-auto max-w-2xl text-center"><Reveal><p className="text-xs uppercase tracking-[.35em] text-gold">10 · Wishes</p><h2 className="mt-4 font-display text-5xl text-wine md:text-7xl">Gửi lời yêu thương</h2><p className="mx-auto mt-6 max-w-md text-sm leading-7 text-ink/65">Form lời chúc sẽ được kết nối trong Phase 5. Hiện tại đây là phần giao diện nền để hoàn thiện trải nghiệm.</p><div className="mt-10 rounded-2xl border border-wine/10 bg-white/50 p-6 text-left shadow-soft"><label className="text-xs font-semibold uppercase tracking-[.2em] text-wine/60">Tên của bạn</label><input disabled placeholder="Nguyễn An" className="mt-3 w-full rounded-lg border border-wine/10 bg-cream px-4 py-3 text-sm outline-none" /><label className="mt-6 block text-xs font-semibold uppercase tracking-[.2em] text-wine/60">Lời chúc</label><textarea disabled rows={4} placeholder="Chúc hai bạn trăm năm hạnh phúc..." className="mt-3 w-full resize-none rounded-lg border border-wine/10 bg-cream px-4 py-3 text-sm outline-none" /><button disabled className="mt-6 w-full rounded-full bg-wine/40 px-6 py-3 text-sm font-semibold text-cream">Gửi lời chúc · Sắp ra mắt</button></div></Reveal></div></section>

      <section className="relative overflow-hidden bg-ink px-6 py-28 text-center text-cream md:py-40"><div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(212,175,55,.25),transparent_40%)]" /><Reveal className="relative mx-auto max-w-2xl"><p className="text-xs uppercase tracking-[.35em] text-gold">11 · Thank you</p><h2 className="mt-5 font-display text-6xl md:text-8xl">Cảm ơn bạn</h2><p className="mx-auto mt-6 max-w-md text-sm leading-7 text-cream/65">Sự hiện diện và những lời chúc của bạn là món quà quý giá nhất dành cho chúng mình.</p><p className="mt-12 font-display text-3xl italic text-gold">Bình Minh &amp; Ninh Thị Huệ</p></Reveal></section>

      <footer className="bg-wine px-6 py-10 text-center text-cream"><p className="text-xs uppercase tracking-[.25em] text-cream/60">Bình Minh &amp; Ninh Thị Huệ · 2026</p></footer>
    </main>
  );
}
