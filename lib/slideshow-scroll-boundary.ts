export type SlideshowBounds = { start: number; end: number };

// One input gesture may reach an album edge, but its remaining momentum must
// not carry on into another section. A fresh gesture releases the brake.
export function createSlideshowBoundary() {
  let edge: { position: number; direction: number } | null = null;
  return {
    reset() { edge = null; },
    clamp(from: number, to: number, bounds: SlideshowBounds | null) {
      if (!bounds || bounds.end <= bounds.start) return to;
      if (edge) {
        if ((to - from) * edge.direction >= 0) {
          return edge.direction > 0 ? Math.min(to, edge.position) : Math.max(to, edge.position);
        }
        edge = null;
      }
      if (from < bounds.end - 1 && to >= bounds.end) {
        edge = { position: bounds.end, direction: 1 };
        return bounds.end;
      }
      if (from > bounds.start + 1 && to <= bounds.start) {
        edge = { position: bounds.start, direction: -1 };
        return bounds.start;
      }
      return to;
    },
  };
}
