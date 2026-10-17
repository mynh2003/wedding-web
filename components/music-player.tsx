"use client";

import { useEffect, useRef, useState } from "react";

const tracks = [
  { title: "A thousand years", src: "/music/a-thousand-years.mp3" },
  { title: "Perfect", src: "/music/perfect.mp3" },
  { title: "Can’t help falling in love", src: "/music/cant-help-falling-in-love.mp3" },
];

export function MusicPlayer() {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [track, setTrack] = useState(0);

  useEffect(() => {
    const start = () => { void audio.current?.play().then(() => setPlaying(true)).catch(() => setPlaying(false)); };
    window.addEventListener("wedding:opened", start);
    return () => window.removeEventListener("wedding:opened", start);
  }, []);

  function nextTrack() {
    setTrack((current) => (current + 1) % tracks.length);
  }

  function toggle() {
    if (!audio.current) return;
    if (playing) { audio.current.pause(); setPlaying(false); } else { void audio.current.play().then(() => setPlaying(true)).catch(() => setPlaying(false)); }
  }

  return (
    <div className="mobile-music-player fixed bottom-5 left-5 z-30 flex items-center gap-3 rounded-full border border-wine/10 bg-cream/90 px-3 py-2 shadow-soft backdrop-blur-md">
      <audio ref={audio} src={tracks[track].src} onEnded={nextTrack} preload="none" aria-label={tracks[track].title} />
      <button onClick={toggle} className={`grid h-10 w-10 place-items-center rounded-full bg-wine text-cream ${playing ? "animate-[spin_4s_linear_infinite]" : ""}`} aria-label={playing ? "Tạm dừng nhạc" : "Phát nhạc"}>{playing ? "Ⅱ" : "♪"}</button>
      <span className="hidden max-w-32 truncate text-xs text-ink/70 sm:block">{tracks[track].title}</span>
    </div>
  );
}
