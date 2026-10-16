"use client";

import { useEffect, useState } from "react";

type Guest = { id: string; display_name: string; guest_group_id: string; created_at: string };
type ResponseData = { data: Guest[]; total: number; page: number; pageSize: number };

export function GuestManager() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [total, setTotal] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [guestGroup, setGuestGroup] = useState<"groom" | "bride">("groom");
  const [newLink, setNewLink] = useState("");
  const [message, setMessage] = useState("");

  async function loadGuests() {
    const response = await fetch("/api/admin/guests?page=1&pageSize=50", { cache: "no-store" });
    if (!response.ok) { setMessage("Không thể tải danh sách khách."); return; }
    const result = await response.json() as ResponseData;
    setGuests(result.data); setTotal(result.total);
  }

  useEffect(() => { void loadGuests(); }, []);

  async function createGuest(event: React.FormEvent) {
    event.preventDefault(); setMessage(""); setNewLink("");
    const response = await fetch("/api/admin/guests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ displayName, guestGroup }) });
    const result = await response.json();
    if (!response.ok) { setMessage(result.error ?? "Không thể tạo khách."); return; }
    setDisplayName(""); setNewLink(result.invitationUrl); setMessage("Đã tạo khách và link riêng. Hãy sao chép link ngay vì token chỉ hiển thị một lần."); await loadGuests();
  }

  async function deleteGuest(id: string) {
    if (!window.confirm("Xóa khách này và thu hồi link hiện tại?")) return;
    const response = await fetch(`/api/admin/guests/${id}`, { method: "DELETE" });
    if (response.ok) { setMessage("Đã xóa khách và thu hồi link."); await loadGuests(); } else setMessage("Không thể xóa khách.");
  }

  async function regenerateLink(id: string) {
    const response = await fetch(`/api/admin/guests/${id}/link`, { method: "POST" });
    const result = await response.json();
    if (response.ok) { setNewLink(result.invitationUrl); setMessage("Đã tạo link mới và thu hồi link cũ."); } else setMessage(result.error ?? "Không thể tạo lại link.");
  }

  return (
    <main className="min-h-screen bg-cream px-6 py-12">
      <div className="mx-auto max-w-5xl">
        <a href="/admin" className="text-xs uppercase tracking-[.25em] text-wine/60">← Admin dashboard</a>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs uppercase tracking-[.3em] text-gold">Phase 4</p><h1 className="mt-2 font-display text-6xl text-wine">Khách mời</h1></div><p className="text-sm text-ink/60">Tổng cộng: {total}</p></div>
        <form onSubmit={createGuest} className="mt-10 grid gap-4 rounded-2xl border border-wine/10 bg-white/60 p-6 md:grid-cols-[1fr_180px_auto] md:items-end"><label className="text-xs font-semibold uppercase tracking-[.2em] text-wine/60">Tên khách<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} required maxLength={160} className="mt-2 w-full rounded-lg border border-wine/10 bg-cream px-4 py-3 text-sm font-normal outline-none" /></label><label className="text-xs font-semibold uppercase tracking-[.2em] text-wine/60">Nhánh<select value={guestGroup} onChange={(event) => setGuestGroup(event.target.value as "groom" | "bride")} className="mt-2 w-full rounded-lg border border-wine/10 bg-cream px-4 py-3 text-sm font-normal outline-none"><option value="groom">Nhà trai</option><option value="bride">Nhà gái</option></select></label><button className="rounded-full bg-wine px-6 py-3 text-sm font-semibold text-cream">Tạo link riêng</button></form>
        {message && <p className="mt-5 rounded-lg bg-gold/15 px-4 py-3 text-sm text-ink/75">{message}</p>}
        {newLink && <div className="mt-4 rounded-lg border border-gold/40 bg-white/60 px-4 py-3 text-sm"><p className="font-semibold text-wine">Link cần sao chép ngay:</p><code className="mt-2 block break-all text-xs text-ink/70">{newLink}</code></div>}
        <div className="mt-8 overflow-hidden rounded-2xl border border-wine/10 bg-white/60"><table className="w-full text-left text-sm"><thead className="bg-wine/5 text-xs uppercase tracking-[.15em] text-wine/60"><tr><th className="px-5 py-4">Tên khách</th><th className="px-5 py-4">Guest ID</th><th className="px-5 py-4 text-right">Thao tác</th></tr></thead><tbody>{guests.map((guest) => <tr key={guest.id} className="border-t border-wine/10"><td className="px-5 py-4 font-semibold text-ink">{guest.display_name}</td><td className="px-5 py-4 text-xs text-ink/45">{guest.id}</td><td className="px-5 py-4 text-right"><button onClick={() => void regenerateLink(guest.id)} className="mr-3 text-xs font-semibold text-wine">Tạo lại link</button><button onClick={() => void deleteGuest(guest.id)} className="text-xs font-semibold text-red-700">Xóa</button></td></tr>)}</tbody></table>{guests.length === 0 && <p className="px-5 py-10 text-center text-sm text-ink/50">Chưa có khách mời.</p>}</div>
      </div>
    </main>
  );
}
