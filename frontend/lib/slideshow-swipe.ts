type SwipeOptions = {
  isPinned: () => boolean;
  getIndex: () => number;
  count: number;
  onStart: () => void;
  onMove: () => void;
  onSelect: (index: number) => void;
};

// Track the finger without translating the image. Commit once, on release.
export function bindSlideshowSwipe(stage: HTMLElement, options: SwipeOptions) {
  let gesture: { x: number; y: number; dx: number; dy: number; axis: string; pinned: boolean; index: number; claimed: boolean } | null = null;
  let wheel: { time: number; index: number; delta: number; eligible: boolean; claimed: boolean; selected: boolean } | null = null;
  const start = (event: TouchEvent) => {
    gesture = null;
    if (event.touches.length !== 1 || (event.target as Element).closest(".album-swiper__navigation")) return;
    const point = event.touches[0];
    options.onStart();
    gesture = { x: point.clientX, y: point.clientY, dx: 0, dy: 0, axis: "", pinned: options.isPinned(), index: options.getIndex(), claimed: false };
  };
  const move = (event: TouchEvent) => {
    if (!gesture) return;
    if (event.touches.length !== 1 || !event.cancelable) { gesture = null; return; }
    gesture.dx = event.touches[0].clientX - gesture.x;
    gesture.dy = event.touches[0].clientY - gesture.y;
    if (Math.max(Math.abs(gesture.dx), Math.abs(gesture.dy)) < 8) return;
    options.onMove();
    gesture.axis ||= Math.abs(gesture.dx) > Math.abs(gesture.dy) ? "x" : "y";
    const delta = gesture.axis === "x" ? gesture.dx : gesture.dy;
    const next = gesture.index + (delta < 0 ? 1 : -1);
    // At the first/last photo, a vertical swipe continues into the page.
    if (!gesture.claimed && gesture.axis === "y" && (!gesture.pinned || next < 0 || next >= options.count)) return;
    gesture.claimed = true;
    event.preventDefault();
  };
  const end = () => {
    const finished = gesture;
    gesture = null;
    if (!finished?.claimed) return;
    const delta = finished.axis === "x" ? finished.dx : finished.dy;
    if (Math.abs(delta) < 28) return;
    options.onSelect(Math.max(0, Math.min(options.count - 1, finished.index + (delta < 0 ? 1 : -1))));
  };
  const cancel = () => { gesture = null; };
  const onWheel = (event: WheelEvent) => {
    if (event.defaultPrevented || event.ctrlKey || event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    // Trackpad momentum is part of the same swipe, even after the next photo
    // appears. Keep consuming it until a new gesture starts after a pause.
    if (!wheel || event.timeStamp - wheel.time > 220) {
      wheel = { time: event.timeStamp, index: options.getIndex(), delta: 0, eligible: options.isPinned(), claimed: false, selected: false };
    }
    wheel.time = event.timeStamp;
    if (!wheel.eligible) return;
    const next = wheel.index + (event.deltaY > 0 ? 1 : -1);
    if (!wheel.claimed && (!options.isPinned() || next < 0 || next >= options.count)) return;
    event.preventDefault();
    wheel.claimed = true;
    if (wheel.selected) return;
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? stage.clientHeight : 1;
    wheel.delta += event.deltaY * unit;
    if (Math.abs(wheel.delta) < 28) return;
    wheel.selected = true;
    options.onSelect(Math.max(0, Math.min(options.count - 1, wheel.index + (wheel.delta > 0 ? 1 : -1))));
  };
  stage.addEventListener("touchstart", start, { passive: true });
  stage.addEventListener("touchmove", move, { passive: false });
  stage.addEventListener("touchend", end, { passive: true });
  stage.addEventListener("touchcancel", cancel, { passive: true });
  stage.addEventListener("wheel", onWheel, { passive: false });
  return () => {
    stage.removeEventListener("touchstart", start);
    stage.removeEventListener("touchmove", move);
    stage.removeEventListener("touchend", end);
    stage.removeEventListener("touchcancel", cancel);
    stage.removeEventListener("wheel", onWheel);
  };
}
