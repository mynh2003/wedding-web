"use client";

import { publicApiFetch } from "@/lib/http/public-api";

import { useEffect, useRef, useState } from "react";

type Track = { title: string; src: string };

// Share the request across mounts (including Strict Mode) until a full reload.
let trackRequest: Promise<Track> | undefined;
function loadTrack() {
  if (trackRequest) return trackRequest;
  let previous = "";
  try { previous = sessionStorage.getItem("wedding:last-music") ?? ""; } catch { /* Storage may be blocked. */ }
  return trackRequest = publicApiFetch(`/api/music?previous=${encodeURIComponent(previous)}`, { cache: "no-store", signal: AbortSignal.timeout(45000) })
    .then(async (response) => {
      if (!response.ok) throw new Error("Không thể tải nhạc");
      const { track } = await response.json();
      if (typeof track?.title !== "string" || typeof track?.src !== "string") {
        throw new Error("Bài hát không hợp lệ");
      }
      try { sessionStorage.setItem("wedding:last-music", track.src); } catch { /* Playback still works without storage. */ }
      return track as Track;
    }).catch((error) => {
      trackRequest = undefined;
      throw error;
    });
}

export function MusicPlayer() {
  const player = useRef<HTMLDivElement>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [track, setTrack] = useState<Track | null>(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const wantsPlayback = useRef(false);
  const preparationTimeout = useRef<number | undefined>(undefined);
  const [showTrackName, setShowTrackName] = useState(false);

  useEffect(() => {
    window.dispatchEvent(new Event("wedding:music-readiness"));
  }, [ready, failed]);

  useEffect(() => {
    const hideOutside = (event: Event) => {
      if (event.target instanceof Node && !player.current?.contains(event.target)) {
        setShowTrackName(false);
      }
    };
    document.addEventListener("pointerdown", hideOutside);
    document.addEventListener("focusin", hideOutside);
    return () => {
      document.removeEventListener("pointerdown", hideOutside);
      document.removeEventListener("focusin", hideOutside);
    };
  }, []);

  useEffect(() => {
    let active = true;
    let attempt = 0;
    const play = () => { void audio.current?.play().catch(() => { if (active) setPlaying(false); }); };
    const start = () => {
      if (wantsPlayback.current) return;
      wantsPlayback.current = true;
      if (audio.current?.getAttribute("src")) play();
    };
    window.addEventListener("wedding:open-requested", start);
    window.addEventListener("wedding:opened", start);
    const prepare = async () => {
      const currentAttempt = ++attempt;
      window.clearTimeout(preparationTimeout.current);
      setReady(false);
      setFailed(false);
      preparationTimeout.current = window.setTimeout(() => {
        if (active && currentAttempt === attempt) setFailed(true);
      }, 45000);
      try {
        const selected = await loadTrack();
        if (!active || currentAttempt !== attempt || !audio.current) return;
        // Let the browser request only metadata before opening, then stream and
        // cache the song normally. Do not download/copy a full Blob on mobile.
        audio.current.src = selected.src;
        setTrack(selected);
        audio.current.load();
        if (wantsPlayback.current) play();
      } catch {
        if (active && currentAttempt === attempt) {
          window.clearTimeout(preparationTimeout.current);
          setFailed(true);
        }
      }
    };
    const retry = () => { void prepare(); };
    window.addEventListener("wedding:preload-retry", retry);
    void prepare();
    return () => {
      active = false;
      window.clearTimeout(preparationTimeout.current);
      window.removeEventListener("wedding:preload-retry", retry);
      window.removeEventListener("wedding:open-requested", start);
      window.removeEventListener("wedding:opened", start);
    };
  }, []);

  function markPrepared() {
    window.clearTimeout(preparationTimeout.current);
    setReady(true);
    setFailed(false);
  }

  function toggle() {
    if (!audio.current) return;
    if (failed) {
      setFailed(false);
      wantsPlayback.current = true;
      if (track) {
        audio.current.load();
        void audio.current.play().catch(() => setPlaying(false));
      } else {
        void loadTrack().then((selected) => {
          if (!audio.current) return;
          audio.current.src = selected.src;
          setTrack(selected);
          void audio.current.play().catch(() => setPlaying(false));
        }).catch(() => setFailed(true));
      }
      return;
    }
    if (!track) return;
    wantsPlayback.current = !playing;
    if (playing) {
      audio.current.pause();
      setShowTrackName(true);
    } else {
      setShowTrackName(false);
      void audio.current.play().catch(() => setPlaying(false));
    }
  }

  return (
    <div ref={player} data-playing={playing} data-music-ready={ready} data-music-failed={failed} className="mobile-music-player fixed z-30 flex items-center gap-0 rounded-full border border-wine/15 bg-cream/95 p-1 shadow-[0_3px_12px_rgba(60,20,30,0.22),0_1px_3px_rgba(60,20,30,0.12)] backdrop-blur-md">
      {playing && <div className="music-floating-notes" aria-hidden="true">
        <span>♪</span><span>♫</span><span>♩</span><span>♬</span>
      </div>}
      <audio ref={audio} loop onLoadedMetadata={markPrepared} onCanPlay={markPrepared} onPlaying={() => { markPrepared(); setPlaying(true); setShowTrackName(false); }} onWaiting={() => setPlaying(false)} onPause={() => setPlaying(false)} onError={() => { window.clearTimeout(preparationTimeout.current); setReady(false); setPlaying(false); setFailed(true); setShowTrackName(true); }} preload="metadata" aria-label={track?.title ?? "Nhạc nền"} />
      <button disabled={!track && !failed} onClick={toggle} className="music-disc-button relative grid h-8 w-8 shrink-0 place-items-center rounded-full bg-wine text-cream disabled:opacity-50" data-playing={playing} aria-pressed={playing} aria-label={failed ? "Thử tải lại nhạc" : !track ? "Đang tải nhạc" : playing ? "Tạm dừng nhạc" : "Phát nhạc"}>
        <svg aria-hidden="true" viewBox="0 0 32 32" className="music-disc h-5 w-5" fill="none">
          <path d="M13 21V10l11-3v11M13 13l11-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <ellipse cx="10" cy="22" rx="4" ry="3" fill="currentColor" />
          <ellipse cx="21" cy="19" rx="4" ry="3" fill="currentColor" />
        </svg>
      </button>
      <div className={`grid transition-[grid-template-columns,margin,padding,opacity] duration-300 ease-in-out ${showTrackName ? "ml-1.5 grid-cols-[1fr] pr-2 opacity-100" : "grid-cols-[0fr] pr-0 opacity-0"}`}>
        <span role="status" className="block min-w-0 max-w-[min(280px,calc(100vw-80px))] overflow-hidden truncate whitespace-nowrap font-[family-name:var(--font-lora),Georgia,serif] text-[11px] text-ink/70" title={track?.title}>{failed ? "Không thể tải nhạc" : track?.title ?? "Đang tải nhạc…"}</span>
      </div>
    </div>
  );
}
