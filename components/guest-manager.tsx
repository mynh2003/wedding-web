"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AdminHeading, AdminIcon } from "@/components/admin-shell";

type Guest = { id: string; display_name: string; guest_group_id: string; created_at: string };
type ResponseData = { data: Guest[]; total: number };
const pageSize = 20;

export function GuestManager() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [guestGroup, setGuestGroup] = useState<"groom" | "bride">("groom");
  const [openedLink, setOpenedLink] = useState<{ name: string; url: string } | null>(null);
  const [copyMessage, setCopyMessage] = useState("");
  const linkDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (openedLink && !linkDialog.current?.open) linkDialog.current?.showModal(); }, [openedLink]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => { const timer = setTimeout(() => { setQuery(search.trim()); setPage(1); }, 300); return () => clearTimeout(timer); }, [search]);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true); setLoadError(false);
      try {
        const response = await fetch(`/api/admin/guests?page=${page}&pageSize=${pageSize}&search=${encodeURIComponent(query)}`, { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error();
        const result = await response.json() as ResponseData;
        if (controller.signal.aborted) return;
        if (page > 1 && result.data.length === 0) { setPage((value) => value - 1); return; }
        setGuests(result.data); setTotal(result.total);
      } catch { if (!controller.signal.aborted) setLoadError(true); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load(); return () => controller.abort();
  }, [page, query, revision]);

  async function createGuest(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/guests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ displayName, guestGroup }) });
      const result = await response.json();
      if (!response.ok) { setMessage(result.error ?? "Không thể tạo khách."); return; }
      setDisplayName("");
      setMessage("Đã thêm khách mời và lưu link. Bạn có thể mở lại link bất kỳ lúc nào tại dòng khách mời."); setSearch(""); setQuery(""); setPage(1); refresh();
    } catch { setMessage("Không thể kết nối. Vui lòng thử lại."); } finally { setBusy(false); }
  }

  async function deleteGuest(guest: Guest) {
    if (!window.confirm(`Xóa khách “${guest.display_name}” và thu hồi đường dẫn thiệp?`)) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/guests/${guest.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error();
      setMessage("Đã xóa khách và thu hồi đường dẫn thiệp."); refresh();
    } catch { setMessage("Không thể xóa khách. Vui lòng thử lại."); } finally { setBusy(false); }
  }

  async function regenerateLink(guest: Guest) {
    if (!window.confirm(`Tạo đường dẫn mới cho “${guest.display_name}”? Đường dẫn cũ sẽ ngừng hoạt động.`)) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/guests/${guest.id}/link`, { method: "POST" });
      const result = await response.json();
      if (!response.ok) { setMessage(result.error ?? "Không thể tạo lại đường dẫn."); return; }
      setMessage("Đã tạo đường dẫn mới. Đường dẫn cũ đã được thu hồi.");
    } catch { setMessage("Không thể kết nối. Vui lòng thử lại."); } finally { setBusy(false); }
  }

  async function openLink(guest: Guest) {
    setBusy(true); setMessage(""); setCopyMessage("");
    try {
      const response = await fetch(`/api/admin/guests/${guest.id}/link`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) { setMessage(result.error ?? "Không thể mở link thiệp."); return; }
      setOpenedLink({ name: guest.display_name, url: result.invitationUrl });
    } catch { setMessage("Không thể kết nối. Vui lòng thử lại."); } finally { setBusy(false); }
  }
  async function copyLink() {
    if (!openedLink) return;
    try { await navigator.clipboard.writeText(openedLink.url); setCopyMessage("Đã sao chép link. Bạn có thể gửi cho khách mời."); }
    catch { setCopyMessage("Trình duyệt chưa cho phép sao chép. Hãy chọn đường dẫn bên trên để sao chép thủ công."); }
  }

  return <main>
    <AdminHeading title="Khách mời" description="Thêm người thân, bạn bè và gửi đến mỗi người một lời mời riêng."><span className="admin-badge rose">{total} khách{query ? " phù hợp" : " trong danh sách"}</span></AdminHeading>
    <section className="admin-card"><div className="admin-section-heading"><div><h2>Thêm khách mời mới</h2><p>Chọn nhà trai hoặc nhà gái để tạo đúng phiên bản thiệp.</p></div><AdminIcon name="guests" /></div><form onSubmit={createGuest} className="admin-form-grid"><label className="admin-field">Tên khách mời<input className="admin-input" placeholder="Ví dụ: Anh Tuấn và gia đình" value={displayName} onChange={(event) => setDisplayName(event.target.value)} required maxLength={160} /></label><label className="admin-field">Bên mời<select className="admin-input" value={guestGroup} onChange={(event) => setGuestGroup(event.target.value as "groom" | "bride")}><option value="groom">Nhà trai</option><option value="bride">Nhà gái</option></select></label><button className="admin-button" disabled={busy}>{busy ? "Đang xử lý…" : "Thêm & tạo thiệp"}</button></form></section>
    {message && <p className="admin-notice" role="status">{message}</p>}
    <dialog ref={linkDialog} className="admin-link-dialog" aria-labelledby="saved-link-title" onClose={() => { setOpenedLink(null); setCopyMessage(""); }}>
      {openedLink && <><div className="admin-section-heading"><div><h2 id="saved-link-title">Link thiệp đã lưu</h2><p>{openedLink.name}</p></div><button className="admin-button admin-button-secondary" onClick={() => linkDialog.current?.close()} aria-label="Đóng hộp thoại link">Đóng</button></div><label className="admin-field">Đường dẫn thiệp<input className="admin-input" readOnly value={openedLink.url} onFocus={(event) => event.target.select()} /></label><p className="mt-3 text-xs text-gray-500">Link được lưu để bạn mở lại ở những lần đăng nhập sau. Mở hoặc sao chép không làm thay đổi link.</p><div className="mt-5 flex flex-wrap gap-3"><button className="admin-button" onClick={() => void copyLink()}>Sao chép link</button><a className="admin-button admin-button-secondary" href={openedLink.url} target="_blank" rel="noreferrer">Mở thiệp ↗</a></div>{copyMessage && <p className="admin-notice" role="status">{copyMessage}</p>}</>}
    </dialog>
    <section className="admin-card mt-6"><div className="admin-toolbar"><h2>Danh sách khách mời</h2><label className="admin-search"><span className="sr-only">Tìm tên khách mời</span><input className="admin-input" type="search" placeholder="Tìm tên khách mời…" value={search} onChange={(event) => setSearch(event.target.value)} /></label></div>
      <div aria-busy={loading}>{loadError ? <div className="admin-empty"><h3>Không thể tải danh sách khách</h3><button onClick={refresh} className="admin-button admin-button-secondary mt-3">Thử lại</button></div> : loading ? <div className="admin-empty" role="status">Đang tải danh sách khách mời…</div> : guests.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Tên khách mời</th><th>Ngày thêm</th><th className="text-right">Thao tác</th></tr></thead><tbody>{guests.map((guest) => <tr key={guest.id}><td><div className="admin-row-name"><span className="admin-avatar">{guest.display_name.slice(0, 1).toUpperCase()}</span>{guest.display_name}</div></td><td className="whitespace-nowrap text-gray-500">{new Date(guest.created_at).toLocaleDateString("vi-VN")}</td><td><div className="admin-actions"><button disabled={busy} onClick={() => void regenerateLink(guest)} className="admin-button admin-button-secondary">Tạo lại link</button><button onClick={() => void openLink(guest)} disabled={busy} aria-label={`Mở và sao chép link của ${guest.display_name}`} className="admin-button admin-button-secondary">Mở / sao chép link</button><button disabled={busy} onClick={() => void deleteGuest(guest)} className="admin-button admin-button-danger" aria-label={`Xóa khách ${guest.display_name}`}>Xóa</button></div></td></tr>)}</tbody></table></div> : <div className="admin-empty"><h3>{query ? "Không tìm thấy khách phù hợp" : "Chưa có khách mời nào"}</h3><p>{query ? "Thử tìm bằng tên khác hoặc xóa từ khóa." : "Thêm vị khách đầu tiên bằng biểu mẫu phía trên."}</p></div>}</div>
      <div className="admin-pagination"><span>{total} khách · Trang {page}/{Math.max(1, Math.ceil(total / pageSize))}</span><div><button className="admin-button admin-button-secondary" disabled={loading || page === 1} onClick={() => setPage((value) => value - 1)}>Trang trước</button><button className="admin-button admin-button-secondary" disabled={loading || page * pageSize >= total} onClick={() => setPage((value) => value + 1)}>Trang sau</button></div></div>
    </section>
  </main>;
}
