import { Reveal } from "@/components/reveal";

const details = [
  { label: "Ngày vui", value: "Thứ Bảy · 18.10.2026" },
  { label: "Hôn lễ", value: "16:30 · Sảnh Hoa Hồng" },
  { label: "Tiệc mừng", value: "18:00 · The Garden House" },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-cream">
      <section className="relative flex min-h-screen items-center justify-center px-6 py-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(212,175,55,.18),transparent_28%),radial-gradient(circle_at_85%_80%,rgba(114,47,55,.12),transparent_30%)]" />
        <div className="paper-grid absolute inset-0 opacity-30 [background-image:radial-gradient(rgba(114,47,55,.09)_0.7px,transparent_0.7px)]" />
        <div className="relative mx-auto w-full max-w-5xl">
          <Reveal className="mx-auto max-w-3xl text-center">
            <p className="mb-6 text-xs font-semibold uppercase tracking-[0.38em] text-wine">Save the date · 18.10.2026</p>
            <p className="font-display text-2xl italic text-wine/80 md:text-3xl">Trân trọng kính mời</p>
            <h1 className="mt-2 font-display text-7xl font-medium leading-[.85] tracking-tight text-wine sm:text-8xl md:text-[10rem]">Minh <span className="text-gold">&amp;</span> Hương</h1>
            <p className="mx-auto mt-10 max-w-md text-sm leading-7 text-ink/65 md:text-base">Cùng chúng mình viết tiếp câu chuyện yêu thương bằng một ngày thật đẹp và thật nhiều kỷ niệm.</p>
            <a href="#details" className="group mt-10 inline-flex items-center gap-3 rounded-full bg-wine px-7 py-3.5 text-sm font-semibold text-cream shadow-soft transition duration-300 hover:-translate-y-1 hover:bg-ink focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2">Mở lời mời <span className="transition-transform group-hover:translate-x-1">→</span></a>
          </Reveal>
        </div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[.3em] text-wine/50">Cuộn để xem thêm</div>
      </section>

      <section id="details" className="border-t border-wine/10 bg-white/50 px-6 py-24 md:py-32">
        <div className="mx-auto max-w-5xl">
          <Reveal><p className="text-center text-xs font-semibold uppercase tracking-[.35em] text-gold">The beginning of forever</p><h2 className="mt-4 text-center font-display text-5xl text-wine md:text-7xl">Một ngày để nhớ</h2></Reveal>
          <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-wine/10 bg-wine/10 md:grid-cols-3">
            {details.map((item, index) => <Reveal key={item.label} delay={index * .08} className="bg-cream p-8 text-center md:p-10"><p className="text-xs uppercase tracking-[.25em] text-wine/50">{item.label}</p><p className="mt-4 font-display text-2xl text-wine md:text-3xl">{item.value}</p></Reveal>)}
          </div>
        </div>
      </section>

      <footer className="bg-wine px-6 py-12 text-center text-cream"><p className="font-display text-3xl italic">Hẹn gặp bạn trong ngày vui của chúng mình.</p><p className="mt-3 text-xs uppercase tracking-[.25em] text-cream/60">Minh &amp; Hương · 2026</p></footer>
    </main>
  );
}
