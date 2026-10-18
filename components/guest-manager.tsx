"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AdminHeading, AdminIcon } from "@/components/admin-shell";

type Guest = { id: string; display_name: string; guest_group_id: string; attendance_status: "unconfirmed" | "attending" | "not-attending"; created_at: string; deleted_at: string | null };
type GuestAction = "delete-guest" | "hard-delete-guest" | "restore-guest" | "regenerate-link";
type ResponseData = { data: Guest[]; total: number };
const pageSize = 20;
const attendanceLabels = { unconfirmed: "Chưa xác nhận", attending: "Có tham gia", "not-attending": "Bận không tham gia" };
const guestActions = {
  "delete-guest": { title: "Chuyển khách vào thùng rác?", label: "chuyển khách vào thùng rác", icon: "trash", danger: true, submit: "Xác thực & chuyển vào thùng rác", description: "Khách sẽ được chuyển vào thùng rác và link thiệp tạm ngừng hoạt động. Thông tin, trạng thái tham dự và lời chúc được giữ lại để khôi phục. Lời chúc sẽ tạm ẩn khỏi thiệp trong thời gian khách ở thùng rác.", success: "Đã chuyển khách vào thùng rác. Bạn có thể khôi phục trong mục Thùng rác." },
  "hard-delete-guest": { title: "Xóa vĩnh viễn khách mời?", label: "xóa vĩnh viễn khách mời", icon: "trash", danger: true, submit: "Xác thực & xóa vĩnh viễn", description: "Thông tin khách, trạng thái tham dự, tất cả link thiệp và lời chúc liên kết với khách này sẽ bị xóa vĩnh viễn, không thể khôi phục. Lời chúc không liên kết với khách mời vẫn được giữ lại để admin quản lý riêng.", success: "Đã xóa vĩnh viễn khách, các link thiệp và lời chúc liên kết với khách." },
  "restore-guest": { title: "Khôi phục khách mời?", label: "khôi phục khách mời", icon: "restore", danger: false, submit: "Xác thực & khôi phục", description: "Khách sẽ trở lại danh sách cùng trạng thái tham dự và lời chúc đã lưu. Các link chưa bị thu hồi và lời chúc vẫn ở trạng thái đã duyệt sẽ hoạt động trở lại. Lời chúc chờ duyệt hoặc đã ẩn vẫn không hiển thị.", success: "Đã khôi phục khách. Các link chưa bị thu hồi đã hoạt động trở lại." },
  "regenerate-link": { title: "Xác nhận tạo lại link", label: "tạo lại link", icon: "refresh", danger: false, submit: "Xác thực & tạo lại link", description: "Tất cả link thiệp cũ của khách sẽ ngừng hoạt động ngay khi tạo link mới. Bạn cần gửi lại link mới cho khách. Thông tin khách, trạng thái tham dự và lời chúc vẫn được giữ lại.", success: "Đã tạo đường dẫn mới. Hãy gửi lại link mới cho khách; đường dẫn cũ đã ngừng hoạt động." },
};

export function GuestManager() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [listView, setListView] = useState<"active" | "trash">("active");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [guestGroup, setGuestGroup] = useState<"groom" | "bride">("groom");
  const [openedLink, setOpenedLink] = useState<{ name: string; url: string } | null>(null);
  const [copyMessage, setCopyMessage] = useState("");
  const [pendingAction, setPendingAction] = useState<{ guest: Guest; action: GuestAction } | null>(null);
  const [actionPassword, setActionPassword] = useState("");
  const [actionConfirmed, setActionConfirmed] = useState(false);
  const [actionError, setActionError] = useState("");
  const actionDialog = useRef<HTMLDialogElement>(null);
  const actionInFlight = useRef(false);
  const linkDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (openedLink && !linkDialog.current?.open) linkDialog.current?.showModal(); }, [openedLink]);
  useEffect(() => { if (pendingAction && !actionDialog.current?.open) actionDialog.current?.showModal(); }, [pendingAction]);
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
        const response = await fetch(`/api/admin/guests?page=${page}&pageSize=${pageSize}&view=${listView}&search=${encodeURIComponent(query)}`, { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error();
        const result = await response.json() as ResponseData;
        if (controller.signal.aborted) return;
        if (page > 1 && result.data.length === 0) { setPage((value) => value - 1); return; }
        setGuests(result.data); setTotal(result.total);
      } catch { if (!controller.signal.aborted) setLoadError(true); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load(); return () => controller.abort();
  }, [page, query, revision, listView]);

  async function createGuest(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/guests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ displayName, guestGroup }) });
      const result = await response.json();
      if (!response.ok) { setMessage(result.error ?? "Không thể tạo khách."); return; }
      setDisplayName("");
      setMessage("Đã thêm khách mời và lưu link. Bạn có thể mở lại link bất kỳ lúc nào tại dòng khách mời."); setSearch(""); setQuery(""); setPage(1); setListView("active"); refresh();
    } catch { setMessage("Không thể kết nối. Vui lòng thử lại."); } finally { setBusy(false); }
  }

  function requestGuestAction(guest: Guest, action: GuestAction) {
    setActionPassword(""); setActionConfirmed(false); setActionError("");
    setPendingAction({ guest, action });
  }

  async function confirmAction(event: React.FormEvent) {
    event.preventDefault();
    if (!pendingAction || !actionConfirmed || actionInFlight.current) return;
    actionInFlight.current = true;
    setBusy(true); setActionError("");
    const { guest, action } = pendingAction;
    const password = actionPassword;
    setActionPassword("");
    try {
      const deleting = action === "delete-guest" || action === "hard-delete-guest";
      const suffix = action === "hard-delete-guest" ? "?mode=permanent" : action === "restore-guest" ? "/restore" : action === "regenerate-link" ? "/link" : "";
      const response = await fetch(`/api/admin/guests/${guest.id}${suffix}`, {
        method: deleting ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, confirmed: true, action, guestId: guest.id }),
      });
      const result = response.status === 204 ? {} : await response.json();
      if (!response.ok) { setActionError(result.error ?? "Không thể thực hiện thao tác. Vui lòng thử lại."); return; }
      actionDialog.current?.close();
      setMessage(guestActions[action].success);
      if (action === "regenerate-link") { setCopyMessage(""); setOpenedLink({ name: guest.display_name, url: result.invitationUrl }); }
      refresh();
    } catch { setActionError("Kết nối bị gián đoạn. Hãy tải lại danh sách hoặc kiểm tra link đã lưu trước khi thử lại."); }
    finally { actionInFlight.current = false; setBusy(false); }
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
    <AdminHeading title="Khách mời" description="Thêm người thân, bạn bè và gửi đến mỗi người một lời mời riêng."><span className="admin-badge rose">{total} khách{query ? " phù hợp" : listView === "trash" ? " trong thùng rác" : " trong danh sách"}</span></AdminHeading>
    <section className="admin-card"><div className="admin-section-heading"><div><h2>Thêm khách mời mới</h2><p>Chọn nhà trai hoặc nhà gái để tạo đúng phiên bản thiệp.</p></div><AdminIcon name="guests" /></div><form onSubmit={createGuest} className="admin-form-grid"><label className="admin-field">Tên khách mời<input className="admin-input" placeholder="Ví dụ: Anh Tuấn và gia đình" value={displayName} onChange={(event) => setDisplayName(event.target.value)} required maxLength={160} /></label><label className="admin-field">Bên mời<select className="admin-input" value={guestGroup} onChange={(event) => setGuestGroup(event.target.value as "groom" | "bride")}><option value="groom">Nhà trai</option><option value="bride">Nhà gái</option></select></label><button className="admin-button" disabled={busy}>{busy ? "Đang xử lý…" : "Thêm & tạo thiệp"}</button></form></section>
    {message && <p className="admin-notice" role="status">{message}</p>}
    <dialog ref={actionDialog} className="admin-link-dialog admin-confirm-dialog" aria-labelledby="guest-action-title" aria-describedby="guest-action-description" onCancel={(event) => { if (actionInFlight.current) event.preventDefault(); }} onClose={() => { setPendingAction(null); setActionPassword(""); setActionConfirmed(false); setActionError(""); }}>
      {pendingAction && <form onSubmit={confirmAction} aria-busy={busy}>
        <div className="admin-section-heading"><div><h2 id="guest-action-title">{guestActions[pendingAction.action].title}</h2><p>{pendingAction.guest.display_name}</p></div><AdminIcon name={guestActions[pendingAction.action].icon} /></div>
        <p id="guest-action-description" className="admin-confirm-description">{guestActions[pendingAction.action].description}</p>
        <label className="admin-confirm-checkbox"><input type="checkbox" checked={actionConfirmed} onChange={(event) => setActionConfirmed(event.target.checked)} required disabled={busy} /><span>Tôi hiểu và xác nhận {guestActions[pendingAction.action].label} cho <strong>{pendingAction.guest.display_name}</strong>.</span></label>
        <label className="admin-field" htmlFor="guest-action-password">Nhập lại mật khẩu quản trị<input id="guest-action-password" className="admin-input" type="password" autoComplete="current-password" value={actionPassword} onChange={(event) => setActionPassword(event.target.value)} required maxLength={256} disabled={busy} /></label>
        {actionError && <p className="admin-notice" role="alert">{actionError}</p>}
        <div className="admin-confirm-actions"><button type="button" className="admin-button admin-button-secondary" disabled={busy} onClick={() => actionDialog.current?.close()}>Hủy</button><button type="submit" className={`admin-button ${guestActions[pendingAction.action].danger ? "admin-button-danger" : ""}`} disabled={busy || !actionConfirmed || !actionPassword}>{busy ? "Đang xác thực…" : guestActions[pendingAction.action].submit}</button></div>
      </form>}
    </dialog>
    <dialog ref={linkDialog} className="admin-link-dialog" aria-labelledby="saved-link-title" onClose={() => { setOpenedLink(null); setCopyMessage(""); }}>
      {openedLink && <><div className="admin-section-heading"><div><h2 id="saved-link-title">Link thiệp đã lưu</h2><p>{openedLink.name}</p></div><button className="admin-button admin-button-secondary" onClick={() => linkDialog.current?.close()} aria-label="Đóng hộp thoại link">Đóng</button></div><label className="admin-field">Đường dẫn thiệp<input className="admin-input" readOnly value={openedLink.url} onFocus={(event) => event.target.select()} /></label><p className="mt-3 text-xs text-gray-500">Link được lưu để bạn mở lại ở những lần đăng nhập sau. Mở hoặc sao chép không làm thay đổi link.</p><div className="mt-5 flex flex-wrap gap-3"><button className="admin-button" onClick={() => void copyLink()}>Sao chép link</button><a className="admin-button admin-button-secondary" href={openedLink.url} target="_blank" rel="noreferrer">Mở thiệp ↗</a></div>{copyMessage && <p className="admin-notice" role="status">{copyMessage}</p>}</>}
    </dialog>
    <section className="admin-card mt-6"><div className="admin-toolbar"><h2>Danh sách khách mời</h2><label className="admin-search"><span className="sr-only">Tìm tên khách mời</span><input className="admin-input" type="search" placeholder="Tìm tên khách mời…" value={search} onChange={(event) => setSearch(event.target.value)} /></label></div>
      <div className="admin-tabs mb-4" aria-label="Lọc khách mời"><button disabled={busy} aria-pressed={listView === "active"} onClick={() => { setListView("active"); setPage(1); }}>Đang hoạt động</button><button disabled={busy} aria-pressed={listView === "trash"} onClick={() => { setListView("trash"); setPage(1); }}>Thùng rác</button></div>
      {listView === "trash" && <p className="mb-4 text-xs text-gray-500">Khách trong thùng rác có thể khôi phục. Link thiệp tạm ngừng hoạt động; lời chúc được giữ lại nhưng tạm ẩn khỏi thiệp.</p>}
      <div aria-busy={loading}>{loadError ? <div className="admin-empty"><h3>Không thể tải danh sách khách</h3><button onClick={refresh} className="admin-button admin-button-secondary mt-3">Thử lại</button></div> : loading ? <div className="admin-empty" role="status">Đang tải danh sách khách mời…</div> : guests.length ? <div className="admin-table-wrap admin-guest-list"><table className="admin-table admin-guest-table" role="table"><thead role="rowgroup"><tr><th>Tên khách mời</th><th>Trạng thái</th><th>{listView === "trash" ? "Ngày xóa" : "Ngày thêm"}</th><th className="text-right">Thao tác</th></tr></thead><tbody role="rowgroup">{guests.map((guest) => <tr key={guest.id} role="row"><td role="cell" className="admin-guest-name"><div className="admin-row-name"><span className="admin-avatar">{guest.display_name.slice(0, 1).toUpperCase()}</span><span>{guest.display_name}</span></div></td><td role="cell" className="admin-guest-status"><span className={`admin-badge ${guest.attendance_status === "attending" ? "sage" : guest.attendance_status === "not-attending" ? "neutral" : "amber"}`}>{attendanceLabels[guest.attendance_status]}</span></td><td role="cell" className="admin-guest-date text-gray-500"><span className="admin-guest-date-label">{listView === "trash" ? "Ngày xóa: " : "Ngày thêm: "}</span>{new Date(guest.deleted_at ?? guest.created_at).toLocaleDateString("vi-VN")}</td><td role="cell" className="admin-guest-controls"><div className="admin-actions" role="group" aria-label={`Thao tác với ${guest.display_name}`}>{listView === "trash" ? <><button disabled={busy} onClick={() => requestGuestAction(guest, "restore-guest")} className="admin-button admin-button-secondary admin-icon-button" title="Khôi phục khách" aria-label={`Khôi phục khách ${guest.display_name}`}><AdminIcon name="restore" /></button><button disabled={busy} onClick={() => requestGuestAction(guest, "hard-delete-guest")} className="admin-button admin-button-danger admin-icon-button" title="Xóa vĩnh viễn" aria-label={`Xóa vĩnh viễn khách ${guest.display_name}`}><AdminIcon name="trash" /></button></> : <><button disabled={busy} onClick={() => requestGuestAction(guest, "regenerate-link")} className="admin-button admin-button-secondary admin-icon-button" title="Tạo lại link" aria-label={`Tạo lại link của ${guest.display_name}`}><AdminIcon name="refresh" /></button><button onClick={() => void openLink(guest)} disabled={busy} aria-label={`Mở và sao chép link của ${guest.display_name}`} className="admin-button admin-button-secondary admin-icon-button" title="Mở / sao chép link"><AdminIcon name="link" /></button><button disabled={busy} onClick={() => requestGuestAction(guest, "delete-guest")} className="admin-button admin-button-danger admin-icon-button" title="Chuyển vào thùng rác" aria-label={`Chuyển khách ${guest.display_name} vào thùng rác`}><AdminIcon name="trash" /></button></>}</div></td></tr>)}</tbody></table></div> : <div className="admin-empty"><h3>{query ? "Không tìm thấy khách phù hợp" : listView === "trash" ? "Thùng rác đang trống" : "Chưa có khách mời nào"}</h3><p>{query ? "Thử tìm bằng tên khác hoặc xóa từ khóa." : listView === "trash" ? "Khách đã xóa mềm sẽ xuất hiện ở đây." : "Thêm vị khách đầu tiên bằng biểu mẫu phía trên."}</p></div>}</div>
      <div className="admin-pagination"><span>{total} khách · Trang {page}/{Math.max(1, Math.ceil(total / pageSize))}</span><div><button className="admin-button admin-button-secondary" disabled={loading || page === 1} onClick={() => setPage((value) => value - 1)}>Trang trước</button><button className="admin-button admin-button-secondary" disabled={loading || page * pageSize >= total} onClick={() => setPage((value) => value + 1)}>Trang sau</button></div></div>
    </section>
  </main>;
}
