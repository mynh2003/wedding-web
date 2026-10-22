export type PublicWish = { id: string; author_name: string; message: string; created_at: string; side?: "groom" | "bride" | null };

// Select at a message boundary; never replace the text already crossing the screen.
export function nextTickerWish(wishes: PublicWish[], seen: Set<string>, queuedId?: string): PublicWish {
  const candidates = wishes.filter((wish) => wish.id !== queuedId);
  let next = candidates.find((wish) => !seen.has(wish.id));
  if (!next) {
    seen.clear();
    if (queuedId) seen.add(queuedId);
    next = candidates[0] ?? wishes[0];
  }
  seen.add(next.id);
  return next;
}

export function sameWishes(left: PublicWish[], right: PublicWish[]) {
  return left.length === right.length && left.every((wish, index) => {
    const other = right[index];
    return wish.id === other.id && wish.author_name === other.author_name &&
      wish.message === other.message && wish.side === other.side && wish.created_at === other.created_at;
  });
}
