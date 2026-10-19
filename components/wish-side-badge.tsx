export function WishSideBadge({ side }: { side?: "groom" | "bride" | null }) {
  if (side !== "groom" && side !== "bride") return null;
  return <span className={`admin-wish-side ${side}`}>{side === "groom" ? "Nhà trai" : "Nhà gái"}</span>;
}
