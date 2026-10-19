"use client";
import { useEffect, useState } from "react";
import { WishSideBadge } from "@/components/wish-side-badge";
import { AdminHeading, AdminIcon } from "@/components/admin-shell";
type Wish = { id: string; author_name: string; message: string; status: "pending" | "approved" | "rejected"; created_at: string; side?: "groom" | "bride" | null; guest_inactive?: boolean };
const labels = { pending: "Chờ duyệt", approved: "Đã duyệt", rejected: "Đã ẩn", inactive: "Khách trong thùng rác" };
const visibleStatus = (wish: Wish) => wish.guest_inactive ? "inactive" : wish.status;
export function WishManager() {
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState<"all" | Wish["status"] | "inactive">("pending");
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  async function load() {
    setLoading(true); setFailed(false);
    try { const response = await fetch("/api/admin/wishes", { cache: "no-store" }); if (!response.ok) throw new Error(); setWishes((await response.json()).data); }
    catch { setFailed(true); } finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  async function update(wish: Wish, status: Wish["status"]) {
    setBusy(true);
    try { const response = await fetch(`/api/admin/wishes/${wish.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) }); if (!response.ok) { const result = await response.json(); setMessage(result.error ?? "Không thể cập nhật lời chúc."); return; } setWishes((current) => current.map((item) => item.id === wish.id ? { ...item, status } : item)); setMessage(status === "approved" ? "Đã duyệt. Lời chúc sẽ hiển thị trên thiệp." : "Đã ẩn lời chúc khỏi thiệp."); }
    catch { setMessage("Không thể cập nhật lời chúc. Vui lòng thử lại."); } finally { setBusy(false); }
  }
  async function remove(wish: Wish) {
    if (!window.confirm(`Xóa vĩnh viễn lời chúc của “${wish.author_name}”?`)) return;
    setBusy(true);
    try { const response = await fetch(`/api/admin/wishes/${wish.id}`, { method: "DELETE" }); if (!response.ok) throw new Error(); setWishes((current) => current.filter((item) => item.id !== wish.id)); setMessage("Đã xóa lời chúc."); }
    catch { setMessage("Không thể xóa lời chúc. Vui lòng thử lại."); } finally { setBusy(false); }
  }
  const filtered = wishes.filter((wish) => filter === "all" || visibleStatus(wish) === filter);
  return <main><AdminHeading title="Lời chúc yêu thương" description="Duyệt những lời chúc bạn muốn chia sẻ trên thiệp cưới." /><div className="admin-toolbar"><div className="admin-tabs" aria-label="Lọc lời chúc">{(["pending", "approved", "rejected", "inactive", "all"] as const).map((status) => <button key={status} aria-pressed={filter === status} onClick={() => setFilter(status)}>{status === "all" ? "Tất cả" : labels[status]} <span>({wishes.filter((wish) => status === "all" || visibleStatus(wish) === status).length})</span></button>)}</div><span className="text-xs text-gray-500">Tối đa 100 lời chúc gần nhất</span></div>
    {message && <p className="admin-notice" role="status">{message}</p>}
    <div className="admin-wish-grid" aria-busy={loading}>{failed ? <div className="admin-card admin-empty"><h3>Không thể tải lời chúc</h3><button onClick={() => void load()} className="admin-button admin-button-secondary mt-3">Thử lại</button></div> : loading ? <div className="admin-card admin-empty" role="status">Đang tải lời chúc…</div> : filtered.length ? filtered.map((wish) => <article key={wish.id} className="admin-card"><div className="flex items-start justify-between gap-3"><div className="admin-row-name"><span className="admin-avatar">{wish.author_name.slice(0, 1).toUpperCase()}</span><div><strong>{wish.author_name}</strong><WishSideBadge side={wish.side} /><p className="text-xs font-normal text-gray-500">{new Date(wish.created_at).toLocaleDateString("vi-VN")}</p></div></div><span className={`admin-badge ${wish.guest_inactive ? "neutral" : wish.status === "approved" ? "sage" : wish.status === "pending" ? "amber" : "neutral"}`}>{labels[visibleStatus(wish)]}</span></div><p className="admin-wish-copy">{wish.message}</p>{wish.guest_inactive && <p className="mb-4 text-xs text-gray-500">Lời chúc đang tạm ẩn vì khách đã bị xóa mềm. Khôi phục khách trước khi duyệt hiển thị.</p>}<div className="flex flex-wrap gap-2 border-t border-gray-100 pt-4">{wish.status !== "approved" && <button disabled={busy || wish.guest_inactive} onClick={() => void update(wish, "approved")} className="admin-button">Duyệt lời chúc</button>}{wish.status !== "rejected" && <button disabled={busy} onClick={() => void update(wish, "rejected")} className="admin-button admin-button-secondary">Ẩn lời chúc</button>}<button disabled={busy} onClick={() => void remove(wish)} className="admin-button admin-button-danger ml-auto">Xóa</button></div></article>) : <div className="admin-card admin-empty"><span className="admin-icon-tile rose"><AdminIcon name="wishes" /></span><h3>{filter === "pending" ? "Không có lời chúc cần duyệt" : "Chưa có lời chúc trong mục này"}</h3><p>Lời chúc từ khách mời sẽ được cập nhật tại đây.</p></div>}</div>
  </main>;
}
