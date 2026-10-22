"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { MediaLibrary } from "@/components/media-library";
import { InvitationPreviewLink } from "@/components/invitation-preview-link";
import { AdminHeading, AdminIcon } from "@/components/admin-shell";
import { AdminSkeleton } from "@/components/admin-skeleton";
import { DressColorEditor } from "@/components/dress-color-editor";
import { ImageUploadField } from "@/components/image-upload-field";
import { resolveDressCodeColors } from "@/lib/dress-code";
import { resolveInvitationCopy, type InvitationCopy } from "@/lib/invitation-copy";
import { sectionImageGroups } from "@/lib/section-images";
import { MAX_MEDIA_BYTES, MAX_MEDIA_LABEL } from "@/lib/validation/content";

type Content = {
  section_key: string;
  content: Record<string, unknown>;
  is_published: boolean;
};
type WeddingInfo = { groomName: string; brideName: string; weddingDate: string };
type Media = {
  id: string;
  storage_path: string;
  mime_type: string;
  alt_text: string | null;
  is_public: boolean;
  url?: string | null;
};
const sections: Record<string, string> = { hero: "Ảnh bìa & mở đầu", invitation: "Lời mời", families: "Gia đình & lễ cưới", venue: "Địa điểm", story: "Chuyện tình yêu", timeline: "Lịch trình", dress_code: "Trang phục", gifts: "Mừng cưới" };
const fieldLabels: Record<string, string> = { title: "Tiêu đề", description: "Nội dung", groom_father_name: "Họ tên bố chú rể", groom_mother_name: "Họ tên mẹ chú rể", bride_father_name: "Họ tên bố cô dâu", bride_mother_name: "Họ tên mẹ cô dâu", invitation_text: "Lời mời của gia đình", groom_ceremony_name: "Tên lễ nhà trai", bride_ceremony_name: "Tên lễ nhà gái", groom_ceremony_time: "Giờ tổ chức nhà trai", bride_ceremony_time: "Giờ tổ chức nhà gái", groom_ceremony_date_text: "Ngày tổ chức nhà trai", bride_ceremony_date_text: "Ngày tổ chức nhà gái", groom_venue_address: "Địa chỉ nhà trai", bride_venue_address: "Địa chỉ nhà gái", groom_map_url: "Liên kết bản đồ nhà trai", bride_map_url: "Liên kết bản đồ nhà gái" };
const familiesContent = { groom_father_name: "", groom_mother_name: "", bride_father_name: "", bride_mother_name: "", invitation_text: "", lunar_date_text: "", meal_date: "", meal_lunar_date_text: "", groom_meal_time: "", bride_meal_time: "", groom_ceremony_time: "", groom_venue_address: "", bride_venue_address: "", groom_map_url: "", bride_map_url: "" };
const giftsContent = { gift_banner_url: "", gift_banner_media_id: "", bride_qr_url: "", bride_bank_name: "", bride_account_name: "", bride_account_number: "", groom_qr_url: "", groom_bank_name: "", groom_account_name: "", groom_account_number: "" };
const giftLabels: Record<string, string> = { qr_url: "Đường dẫn mã QR", bank_name: "Tên ngân hàng", account_name: "Tên chủ tài khoản", account_number: "Số tài khoản" };
function fieldLabel(key: string) {
  if (fieldLabels[key]) return fieldLabels[key];
  const side = key.startsWith("bride_") ? "Nhà gái" : key.startsWith("groom_") ? "Nhà trai" : "";
  const suffix = key.replace(/^(bride|groom)_/, "");
  return side && giftLabels[suffix] ? `${side} · ${giftLabels[suffix]}` : key.replaceAll("_", " ");
}

export function ContentManager() {
  const [activeTab, setActiveTab] = useState<"info" | "images" | "content">("info");
  const [copyDraft, setCopyDraft] = useState<InvitationCopy>(() => resolveInvitationCopy());
  const [copyDirty, setCopyDirty] = useState(false);
  const [dressColors, setDressColors] = useState<string[]>(() => resolveDressCodeColors(undefined));
  const [dressDirty, setDressDirty] = useState(false);
  const [weddingInfo, setWeddingInfo] = useState<WeddingInfo>({ groomName: "", brideName: "", weddingDate: "" });
  const [gifts, setGifts] = useState<Record<string, string>>({});
  const [content, setContent] = useState(JSON.stringify(familiesContent, null, 2));
  const [items, setItems] = useState<Content[]>([]);
  const [media, setMedia] = useState<Media[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [dirty, setDirty] = useState(false);
  const sectionFile = useRef<HTMLInputElement>(null);
  const [imageTarget, setImageTarget] = useState<{ section: string; field: string } | null>(null);
  let fields: Record<string, unknown> | null = null;
  try {
    const parsed: unknown = JSON.parse(content);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) fields = parsed as Record<string, unknown>;
  } catch { /* Invalid source is rejected by the save handlers. */ }

  const load = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch("/api/admin/editor", { cache: "no-store", signal });
    if (!response.ok) throw new Error();
    const result = await response.json() as { data: Content[]; media: Media[]; wedding: { groom_name: string; bride_name: string; wedding_date: string } };
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const loaded = result.data;
    const weddingData = result.wedding;
    const familyRow = loaded.find((item) => item.section_key === "families");
    const family = familyRow?.content ?? {};
    const date = new Date(weddingData.wedding_date);
    const localDate = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
    const groomTime = typeof family.groom_ceremony_time === "string" && /^\d{2}:\d{2}$/.test(family.groom_ceremony_time) ? family.groom_ceremony_time : "18:00";
    setWeddingInfo({ groomName: weddingData.groom_name, brideName: weddingData.bride_name, weddingDate: `${localDate}T${groomTime}` });
    const library = result.media;
    setDressColors(resolveDressCodeColors(loaded.find((item) => item.section_key === "dress_code")?.content.colors));
    setDressDirty(false);
    setItems(loaded);
    setMedia(library);
    const giftContent = loaded.find((item) => item.section_key === "gifts")?.content ?? giftsContent;
    setGifts(Object.fromEntries(Object.entries(giftContent).map(([key, value]) => [key, typeof value === "string" ? value : ""])));
    const familyContent = loaded.find((item) => item.section_key === "families")?.content ?? familiesContent;
    setContent(JSON.stringify(familyContent, null, 2));
    return loaded;
  }, []);
  const initialize = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setFailed(false);
    try {
      const loaded = await load(signal);
      setCopyDraft(resolveInvitationCopy(loaded.find((item) => item.section_key === "copy")?.content));
      setCopyDirty(false);
    } catch {
      if (!signal?.aborted) setFailed(true);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [load]);
  useEffect(() => { const controller = new AbortController(); void initialize(controller.signal); return () => controller.abort(); }, [initialize]);
  useEffect(() => {
    function warn(event: BeforeUnloadEvent) {
      if (dirty || copyDirty || dressDirty) event.preventDefault();
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, copyDirty, dressDirty]);
  async function saveDressColors(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const existing = items.find((item) => item.section_key === "dress_code");
      const response = await fetch("/api/admin/content", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sectionKey: "dress_code", content: { ...existing?.content, colors: dressColors }, isPublished: true }) });
      const result = await response.json();
      if (!response.ok) { setMessage(result.error ?? "Không thể lưu màu trang phục."); return; }
      setItems((current) => [...current.filter((item) => item.section_key !== "dress_code"), result.data as Content]);
      setDressDirty(false); setMessage("Đã lưu và xuất bản 5 màu trang phục.");
    } catch { setMessage("Không thể kết nối. Các màu đang sửa được giữ lại để thử lưu lại."); }
    finally { setBusy(false); }
  }
  async function saveCopy(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/content", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sectionKey: "copy", content: copyDraft, isPublished: true }) });
      const result = await response.json();
      if (!response.ok) { setMessage(result.error ?? "Không thể lưu nội dung."); return; }
      const saved = result.data as Content;
      setItems((current) => [...current.filter((item) => item.section_key !== "copy"), saved]);
      setCopyDraft(resolveInvitationCopy(saved.content)); setCopyDirty(false);
      setMessage("Đã lưu và xuất bản nội dung. Các đoạn văn được cập nhật trên thiệp nhà trai, nhà gái và link riêng.");
    } catch { setMessage("Không thể kết nối. Nội dung đang sửa được giữ lại để bạn thử lưu lại."); }
    finally { setBusy(false); }
  }
  async function saveWeddingInfo(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setMessage("");
    try {
      const familyFields = { ...(JSON.parse(content) as Record<string, unknown>), groom_ceremony_time: weddingInfo.weddingDate.slice(11, 16) };
      const familyResponse = await fetch("/api/admin/content", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sectionKey: "families", content: familyFields, isPublished: true }) });
      if (!familyResponse.ok) { setMessage((await familyResponse.json()).error ?? "Không thể lưu ngày âm."); return; }
      const groomTime = typeof familyFields.groom_ceremony_time === "string" && /^\d{2}:\d{2}$/.test(familyFields.groom_ceremony_time) ? familyFields.groom_ceremony_time : "18:00";
      const response = await fetch("/api/admin/content", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "wedding-info", ...weddingInfo, weddingDate: `${weddingInfo.weddingDate.slice(0, 10)}T${groomTime}` }) });
      if (!response.ok) { setMessage((await response.json()).error ?? "Không thể lưu thông tin thiệp."); return; }
      setDirty(false); await load(); setMessage("Đã cập nhật ngày dương, ngày âm và giờ của hai sự kiện.");
    } catch { setMessage("Không thể kết nối. Vui lòng thử lại."); } finally { setBusy(false); }
  }
  async function saveFamilies(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    let familyFields: Record<string, unknown>;
    try { familyFields = JSON.parse(content) as Record<string, unknown>; } catch { setMessage("Thông tin nhà trai/nhà gái không hợp lệ."); return; }
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/content", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sectionKey: "families", content: familyFields, isPublished: true }) });
      if (!response.ok) { setMessage((await response.json()).error ?? "Không thể lưu thông tin gia đình."); return; }
      await load(); setDirty(false); setMessage("Đã cập nhật thông tin nhà trai và nhà gái trên thiệp.");
    } catch { setMessage("Không thể kết nối. Vui lòng thử lại."); } finally { setBusy(false); }
  }
  async function saveGifts(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const groomTime = typeof content === "string" ? (() => { try { const family = JSON.parse(content) as Record<string, unknown>; return typeof family.groom_ceremony_time === "string" && /^\d{2}:\d{2}$/.test(family.groom_ceremony_time) ? family.groom_ceremony_time : "18:00"; } catch { return "18:00"; } })() : "18:00";
      const namesResponse = await fetch("/api/admin/content", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "wedding-info", ...weddingInfo, weddingDate: `${weddingInfo.weddingDate.slice(0, 10)}T${groomTime}` }) });
      if (!namesResponse.ok) { setMessage((await namesResponse.json()).error ?? "Không thể lưu tên cô dâu/chú rể."); return; }
      const giftsResponse = await fetch("/api/admin/content", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sectionKey: "gifts", content: gifts, isPublished: true }) });
      if (!giftsResponse.ok) { setMessage((await giftsResponse.json()).error ?? "Không thể lưu thông tin ngân hàng."); return; }
      await load(); setDirty(false); setMessage("Đã cập nhật thông tin chú rể, cô dâu, ngân hàng và QR.");
    } catch { setMessage("Không thể kết nối. Vui lòng thử lại."); } finally { setBusy(false); }
  }
  async function uploadHeroImage(slot: "cover" | "intro", input: HTMLInputElement) {
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > MAX_MEDIA_BYTES) { setMessage(`Tệp quá lớn. Vui lòng chọn ảnh tối đa ${MAX_MEDIA_LABEL}.`); input.value = ""; return; }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setMessage("Chỉ nhận ảnh JPEG, PNG hoặc WebP."); input.value = ""; return; }
    setBusy(true); setMessage("");
    try {
      const form = new FormData(); form.set("file", file); form.set("altText", slot === "cover" ? "Ảnh bìa thiệp cưới" : "Ảnh mở đầu thiệp cưới");
      const uploaded = await fetch("/api/admin/media", { method: "POST", body: form });
      if (!uploaded.ok) { setMessage((await uploaded.json()).error ?? "Không thể tải ảnh lên."); return; }
      const media = (await uploaded.json()).data as Media;
      const publishedResponse = await fetch(`/api/admin/media/${media.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isPublic: true, altText: media.alt_text ?? "" }) });
      if (!publishedResponse.ok) { setMessage("Ảnh đã tải lên nhưng chưa thể xuất bản. Vui lòng thử lại từ thư viện."); return; }
      const existing = items.find((item) => item.section_key === "hero");
      const nextContent = { ...(existing?.content ?? {}), [`${slot}_media_id`]: media.id };
      const saved = await fetch("/api/admin/content", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sectionKey: "hero", content: nextContent, isPublished: true }) });
      if (!saved.ok) { setMessage("Ảnh đã tải lên nhưng chưa gắn được vào thiệp. Vui lòng tải lại và thử lại."); return; }
      await load();
      setItems((current) => [...current.filter((item) => item.section_key !== "hero"), { section_key: "hero", content: nextContent, is_published: true }]);
      setMessage(slot === "cover" ? "Đã cập nhật ảnh bìa thiệp." : "Đã cập nhật ảnh mở đầu thiệp.");
    } catch { setMessage("Chưa xác nhận được kết quả tải ảnh. Vui lòng tải lại trang để kiểm tra."); }
    finally { input.value = ""; setBusy(false); }
  }
  async function uploadSectionImage(section: string, field: string, input: HTMLInputElement) {
    if (section === "hero" && (field === "cover_media_id" || field === "intro_media_id")) { await uploadHeroImage(field === "cover_media_id" ? "cover" : "intro", input); return; }
    const file = input.files?.[0]; if (!file) return;
    if (file.size > MAX_MEDIA_BYTES || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setMessage(`Chọn ảnh JPEG, PNG hoặc WebP tối đa ${MAX_MEDIA_LABEL}.`); input.value = ""; return; }
    setBusy(true); setMessage("");
    try {
      const form = new FormData(); form.set("file", file); form.set("altText", `${sections[section]} · ${fieldLabel(field)}`);
      const uploadResponse = await fetch("/api/admin/media", { method: "POST", body: form });
      if (!uploadResponse.ok) { setMessage((await uploadResponse.json()).error ?? "Không thể tải ảnh lên."); return; }
      const uploaded = (await uploadResponse.json()).data as Media;
      const publishResponse = await fetch(`/api/admin/media/${uploaded.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isPublic: true, altText: uploaded.alt_text ?? "" }) });
      if (!publishResponse.ok) { setMessage("Ảnh đã tải lên nhưng chưa thể xuất bản."); return; }
      const old = items.find((item) => item.section_key === section);
      const nextContent = { ...(old?.content ?? {}), ...(section === "gifts" ? gifts : {}), [field]: uploaded.id };
      const saveResponse = await fetch("/api/admin/content", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sectionKey: section, content: nextContent, isPublished: true }) });
      if (!saveResponse.ok) { setMessage("Ảnh tải lên thành công nhưng chưa gắn được vào section."); return; }
      if (section === "gifts" && (field.endsWith("_qr_media_id") || field === "gift_banner_media_id")) setGifts((current) => ({ ...current, [field]: uploaded.id }));
      await load(); setMessage(`Đã cập nhật ảnh ${sections[section]} · ${fieldLabel(field)}.`);
    } catch { setMessage("Chưa xác nhận được kết quả tải ảnh. Vui lòng tải lại để kiểm tra."); }
    finally { input.value = ""; setBusy(false); }
  }
  const imageNames: Record<string, string> = { cover_media_id: "Ảnh bìa", intro_media_id: "Mở đầu · Ảnh 1", intro_second_media_id: "Mở đầu · Ảnh 2", intro_third_media_id: "Mở đầu · Ảnh 3", banner_media_id: "Ảnh lời mời", calendar_banner_media_id: "Ảnh nền lịch ngày cưới · 7:6", family_photo_media_id: "Ảnh gia đình", venue_photo_media_id: "Ảnh địa điểm", story_photo_media_id: "Ảnh chuyện tình yêu", timeline_photo_media_id: "Ảnh lịch trình", dress_code_photo_media_id: "Ảnh trang phục", gift_banner_media_id: "Ảnh mừng cưới dùng chung", bride_qr_media_id: "Mã QR nhà gái", groom_qr_media_id: "Mã QR nhà trai" };
  const attachedMedia = (section: string, field: string) => media.find((asset) => items.find((entry) => entry.section_key === section)?.content[field] === asset.id);
  return <main><AdminHeading title="Nội dung & hình ảnh" description="Quản lý thông tin và hình ảnh hiển thị trên thiệp cưới."><InvitationPreviewLink target="_blank" rel="noreferrer" className="admin-button admin-button-secondary"><AdminIcon name="external" />Xem trước thiệp</InvitationPreviewLink></AdminHeading>
    {message && <p className="admin-notice" role="status">{message}</p>}
    <input ref={sectionFile} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={busy} onChange={(event) => imageTarget && void uploadSectionImage(imageTarget.section, imageTarget.field, event.currentTarget)} />
    {failed ? <section className="admin-card admin-empty"><h3>Chưa tải được nội dung</h3><button className="admin-button admin-button-secondary mt-3" onClick={() => void initialize()}><AdminIcon name="refresh" />Thử lại</button></section> : loading ? <AdminSkeleton variant="editor" /> : <>
    <section className="admin-card"><div className="admin-editor-toolbar"><div className="admin-tabs" role="group" aria-label="Chọn phần chỉnh sửa"><button type="button" aria-pressed={activeTab === "info"} onClick={() => setActiveTab("info")}><AdminIcon name="info" />Thông tin</button><button type="button" aria-pressed={activeTab === "images"} onClick={() => setActiveTab("images")}><AdminIcon name="content" />Hình ảnh</button><button type="button" aria-pressed={activeTab === "content"} onClick={() => setActiveTab("content")}><AdminIcon name="edit" />Nội dung</button></div>{activeTab === "info" && <span className={`admin-badge ${dirty ? "amber" : "neutral"}`}>{dirty ? "Chưa lưu" : "Đã đồng bộ"}</span>}{activeTab === "content" && <span className={`admin-badge ${copyDirty || dressDirty ? "amber" : "neutral"}`}>{copyDirty || dressDirty ? "Chưa lưu" : "Đã đồng bộ"}</span>}</div>
    {activeTab === "info" ? <>
      <section className="border-t border-gray-200 pt-5"><form onSubmit={saveWeddingInfo}><fieldset disabled={busy}><div className="admin-section-heading"><div><h2>Ngày lễ thành hôn</h2><p>Ngày dương, ngày âm và giờ theo nhà trai, dùng chung cho hai nhà.</p></div></div><div className="admin-editor-fields"><label className="admin-field">Ngày dương<input className="admin-input" type="date" required value={weddingInfo.weddingDate.slice(0, 10)} onChange={(event) => { setWeddingInfo((current) => ({ ...current, weddingDate: `${event.target.value}T${current.weddingDate.slice(11, 16) || "18:00"}` })); setDirty(true); }} /></label><label className="admin-field">Ngày âm<input className="admin-input" value={String(fields?.lunar_date_text ?? "")} placeholder="Ví dụ: 15 tháng 8 năm Bính Ngọ" onChange={(event) => { setContent(JSON.stringify({ ...fields, lunar_date_text: event.target.value }, null, 2)); setDirty(true); }} /></label></div><label className="admin-field mt-4">Giờ lễ thành hôn · dùng chung<input className="admin-input" type="time" required value={weddingInfo.weddingDate.slice(11, 16)} onChange={(event) => { setWeddingInfo((current) => ({ ...current, weddingDate: current.weddingDate.slice(0, 10) + "T" + event.target.value })); setDirty(true); }} /></label><div className="mt-5 rounded-xl border border-gray-200 p-4"><h3 className="text-sm font-semibold">Bữa cơm thân mật</h3><p className="mt-1 text-sm text-gray-500">Ngày dương và ngày âm dùng chung; giờ nhập riêng tại mỗi nhà bên dưới. Lịch tự đánh dấu hai ngày có sự kiện.</p><div className="admin-editor-fields mt-3">{([["meal_date", "Ngày dương", "date"], ["meal_lunar_date_text", "Ngày âm", "text"]] as const).map(([key, label, type]) => <label key={key} className="admin-field">{label}<input type={type} className="admin-input" value={String(fields?.[key] ?? "")} onChange={(event) => { setContent(JSON.stringify({ ...fields, [key]: event.target.value }, null, 2)); setDirty(true); }} /></label>)}</div></div><button className="admin-button mt-5" disabled={busy || !dirty}><AdminIcon name={busy ? "loader" : "save"} />{busy ? "Đang lưu…" : "Lưu ngày cưới"}</button></fieldset></form></section>
      <section className="mt-6 border-t border-gray-200 pt-5">
        <form onSubmit={saveGifts}>
          <div className="admin-section-heading"><div><h2>Mừng cưới</h2><p>Một ảnh chung cho hai nhà; thông tin chuyển khoản và mã QR riêng theo từng người nhận.</p></div></div>
          <div className="grid gap-5 md:grid-cols-2">
            {(["groom", "bride"] as const).map((side) => {
              const prefix = side;
              const label = side === "groom" ? "Nhà trai · Chú rể" : "Nhà gái · Cô dâu";
              const qr = media.find((asset) => asset.id === gifts[`${prefix}_qr_media_id`]);
              const nameField = side === "groom" ? "groomName" : "brideName";
              return <section key={side} className="rounded-xl border border-gray-200 p-4">
                <h3 className="mb-4 text-sm font-semibold">{label}</h3>
                <div className="grid gap-3">
                  <label className="admin-field">Tên<input className="admin-input" maxLength={120} value={weddingInfo[nameField]} onChange={(event) => { setWeddingInfo((current) => ({ ...current, [nameField]: event.target.value })); setDirty(true); }} /></label>
                  <label className="admin-field">Tên tài khoản<input className="admin-input" maxLength={120} placeholder={side === "groom" ? "Họ và tên đầy đủ của chú rể" : "Họ và tên đầy đủ của cô dâu"} value={gifts[`${prefix}_account_name`] ?? ""} onChange={(event) => { setGifts((current) => ({ ...current, [`${prefix}_account_name`]: event.target.value })); setDirty(true); }} /></label>
                  <label className="admin-field">Tên ngân hàng<input className="admin-input" maxLength={160} value={gifts[`${prefix}_bank_name`] ?? ""} onChange={(event) => { setGifts((current) => ({ ...current, [`${prefix}_bank_name`]: event.target.value })); setDirty(true); }} /></label>
                  <label className="admin-field">Số tài khoản<input className="admin-input" maxLength={100} value={gifts[`${prefix}_account_number`] ?? ""} onChange={(event) => { setGifts((current) => ({ ...current, [`${prefix}_account_number`]: event.target.value })); setDirty(true); }} /></label>
                  <ImageUploadField label="Mã QR chuyển khoản" imageUrl={qr?.url} disabled={busy} onSelect={() => { setImageTarget({ section: "gifts", field: `${prefix}_qr_media_id` }); sectionFile.current?.click(); }} />
                </div>
              </section>;
            })}
          </div>
          <button className="admin-button mt-5" disabled={busy || !dirty}><AdminIcon name={busy ? "loader" : "save"} />{busy ? "Đang lưu…" : "Lưu thông tin mừng cưới"}</button>
        </form>
      </section>
      <section className="mt-6 border-t border-gray-200 pt-5"><form onSubmit={saveFamilies}><div className="admin-section-heading"><div><h2>Nhà trai / Nhà gái</h2><p>Hai ngày dùng chung; giờ bữa cơm thân mật, địa chỉ và bản đồ nhập riêng từng nhà. Lễ thành hôn theo nhà trai.</p></div></div><div className="grid gap-5 md:grid-cols-2">{(["groom", "bride"] as const).map((side) => { const prefix = side; const label = side === "groom" ? "Nhà trai" : "Nhà gái"; return <section key={side} className="rounded-xl border border-gray-200 p-4"><h3 className="mb-4 text-sm font-semibold">{label}</h3><div className="grid gap-3">{([[`${prefix}_father_name`, "Tên bố"], [`${prefix}_mother_name`, "Tên mẹ"], [`${prefix}_meal_time`, "Giờ bữa cơm thân mật"], [`${prefix}_venue_address`, "Địa chỉ"]] as const).map(([field, labelText]) => <label key={field} className="admin-field">{labelText}<input className="admin-input" maxLength={500} type={field.endsWith("_time") ? "time" : "text"} value={String(fields?.[field] ?? "")} onChange={(event) => { setContent(JSON.stringify({ ...fields, [field]: event.target.value }, null, 2)); setDirty(true); }} /></label>)}<label className="admin-field">Liên kết bản đồ<input className="admin-input" type="url" value={String(fields?.[`${prefix}_map_url`] ?? "")} onChange={(event) => { setContent(JSON.stringify({ ...fields, [`${prefix}_map_url`]: event.target.value }, null, 2)); setDirty(true); }} /></label></div></section>; })}</div><button className="admin-button mt-5" disabled={busy || !dirty}><AdminIcon name={busy ? "loader" : "save"} />{busy ? "Đang lưu…" : "Lưu thông tin nhà trai / nhà gái"}</button></form></section>
    </> : activeTab === "content" ? <><form onSubmit={saveDressColors} className="mb-8 border-b border-gray-200 pb-6"><fieldset disabled={busy}>
      <div className="admin-section-heading"><div><h2>Dress code · 5 màu trang phục</h2><p>Chạm vào ô màu để chỉnh, hoặc bắt đầu từ một bảng phối màu gợi ý.</p></div></div>
      <DressColorEditor colors={dressColors} onChange={(colors) => { setDressColors(colors); setDressDirty(true); }} />
      <button className="admin-button mt-4" disabled={busy || !dressDirty}><AdminIcon name={busy ? "loader" : "save"} />{busy ? "Đang lưu…" : "Lưu & xuất bản màu trang phục"}</button>
    </fieldset></form><form onSubmit={saveCopy}><fieldset disabled={busy} className="space-y-6">
      <div className="admin-section-heading"><div><h2>Nội dung trên thiệp</h2><p>Chỉnh các đoạn văn dùng chung cho nhà trai, nhà gái và link riêng. Để trống một ô để dùng lại nội dung mặc định.</p></div></div>
      <label className="admin-field">Câu trích dẫn về hôn nhân<textarea className="admin-input" rows={4} maxLength={2000} value={copyDraft.quote_text} onChange={(event) => { setCopyDraft((current) => ({ ...current, quote_text: event.target.value })); setCopyDirty(true); }} /><small>{copyDraft.quote_text.length}/2.000 ký tự</small></label>
      <section><h3 className="mb-2 text-sm font-semibold">Chuyện tình yêu</h3><p className="mb-4 text-xs text-gray-500">Bốn đoạn xuất hiện lần lượt khi cuộn qua phần The Love Story of Us.</p><div className="grid gap-4 md:grid-cols-2">{copyDraft.story_pages.map((text, index) => <label key={index} className="admin-field">Đoạn {index + 1}<textarea className="admin-input" rows={4} maxLength={500} value={text} onChange={(event) => { setCopyDraft((current) => ({ ...current, story_pages: current.story_pages.map((page, position) => position === index ? event.target.value : page) })); setCopyDirty(true); }} /><small>{text.length}/500 ký tự</small></label>)}</div></section>
      <label className="admin-field">Lời nhắn trước form xác nhận tham dự<textarea className="admin-input" rows={4} maxLength={2000} value={copyDraft.rsvp_text} onChange={(event) => { setCopyDraft((current) => ({ ...current, rsvp_text: event.target.value })); setCopyDirty(true); }} /><small>{copyDraft.rsvp_text.length}/2.000 ký tự</small></label>
      <label className="admin-field">Lời cảm ơn cuối thiệp<textarea className="admin-input" rows={5} maxLength={2000} value={copyDraft.thank_you_text} onChange={(event) => { setCopyDraft((current) => ({ ...current, thank_you_text: event.target.value })); setCopyDirty(true); }} /><small>Nhấn Enter để xuống dòng trên thiệp. {copyDraft.thank_you_text.length}/2.000 ký tự</small></label>
      <button className="admin-button" disabled={busy || !copyDirty}><AdminIcon name={busy ? "loader" : "save"} />{busy ? "Đang lưu…" : "Lưu & xuất bản nội dung"}</button>
    </fieldset></form></> : <><div className="admin-section-heading"><div><h2>Hình ảnh</h2><p>Tất cả ảnh được nhóm theo section; tải lên để thêm hoặc thay ảnh đúng vị trí.</p></div><span className="admin-badge neutral">{media.filter((item) => item.mime_type.startsWith("image/")).length} ảnh đang gắn</span></div><div className="mt-5 space-y-8">{sectionImageGroups.map(({ title, section, fields: imageList }) => <section key={title}><h3 className="border-b border-gray-200 pb-2 text-sm font-semibold">{title} · {imageList.length} ảnh</h3><div className="mt-3 grid gap-5 sm:grid-cols-2">{imageList.map((field, index) => { const attached = attachedMedia(section, field); return <article key={field} className="rounded-xl border border-gray-200 p-4"><h4 className="text-sm font-semibold">{imageNames[field] ?? `Ảnh ${index + 1}`}</h4>{attached?.url ? <div className={`relative mt-3 ${field === "calendar_banner_media_id" ? "aspect-[6/7]" : "aspect-[4/3]"} overflow-hidden rounded-lg bg-gray-100`}><Image unoptimized fill sizes="(min-width: 640px) 50vw, 100vw" src={attached.url} alt={attached.alt_text ?? ""} className="h-full w-full object-cover" /></div> : <div className="admin-empty mt-3"><p>{attached ? "Ảnh đang ẩn" : "Chưa có ảnh trong mục này"}</p></div>}<p className="mt-2 break-all text-xs text-gray-500">{attached?.alt_text || "Chưa chọn ảnh"}</p><button type="button" className="admin-button mt-4" disabled={busy} onClick={() => { setImageTarget({ section, field }); sectionFile.current?.click(); }}><AdminIcon name={busy ? "loader" : attached ? "edit" : "upload"} />{attached ? "Thay ảnh" : "Tải ảnh lên"}</button></article>; })}</div></section>)}</div>
      <MediaLibrary content={items} refreshKey={media} disabled={busy || dirty || copyDirty || dressDirty} unsavedChanges={dirty || copyDirty || dressDirty} onChange={load} /><div className="mt-8"><details className="admin-card mt-6"><summary className="cursor-pointer text-sm font-semibold">Tài nguyên thiết kế có sẵn</summary><p className="mt-3 text-xs text-gray-500">Chọn một hình để tải xuống.</p><div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[["/design/monogram-minh-hue.svg", "Bình Minh - Ninh Huệ"], ["/design/fabric-red-transparent.png", "Mảnh bao thư phía trên"], ["/design/fabric-red-panel.png", "Mảnh bao thư phía dưới"], ["/design/wax-seal-monogram-mh.png", "Dấu sáp monogram MH"]].map(([src, label]) => <a key={src} href={src} download className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center hover:border-wine/40"><div className="grid h-36 place-items-center"><Image src={src} alt={label} width={120} height={140} className="max-h-32 w-auto" /></div><span className="mt-2 block text-xs font-medium text-wine">{label} ↓</span></a>)}</div></details></div></>}</section>
    </>}

  </main>;
}

