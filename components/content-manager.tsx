"use client";

import { useCallback, useEffect, useState } from "react";
import { useRef } from "react";
import Image from "next/image";
import { AdminHeading, AdminIcon } from "@/components/admin-shell";
import { sectionImageGroups } from "@/lib/section-images";
import { calendarRangeError } from "@/lib/wedding-calendar";
import { ImageUploadField } from "@/components/image-upload-field";

type Content = { section_key: string; content: Record<string, unknown>; is_published: boolean };
type WeddingInfo = { groomName: string; brideName: string; weddingDate: string };
type Media = { id: string; storage_path: string; mime_type: string; alt_text: string | null; is_public: boolean; url?: string | null };
type PublicMedia = Media & { url: string };
const sections: Record<string, string> = { hero: "Ảnh bìa & mở đầu", invitation: "Lời mời", families: "Gia đình & lễ cưới", venue: "Địa điểm", story: "Chuyện tình yêu", timeline: "Lịch trình", dress_code: "Trang phục", gifts: "Mừng cưới" };
const fieldLabels: Record<string, string> = { title: "Tiêu đề", description: "Nội dung", groom_father_name: "Họ tên bố chú rể", groom_mother_name: "Họ tên mẹ chú rể", bride_father_name: "Họ tên bố cô dâu", bride_mother_name: "Họ tên mẹ cô dâu", invitation_text: "Lời mời của gia đình", groom_ceremony_name: "Tên lễ nhà trai", bride_ceremony_name: "Tên lễ nhà gái", groom_ceremony_time: "Giờ tổ chức nhà trai", bride_ceremony_time: "Giờ tổ chức nhà gái", groom_ceremony_date_text: "Ngày tổ chức nhà trai", bride_ceremony_date_text: "Ngày tổ chức nhà gái", groom_venue_address: "Địa chỉ nhà trai", bride_venue_address: "Địa chỉ nhà gái", groom_map_url: "Liên kết bản đồ nhà trai", bride_map_url: "Liên kết bản đồ nhà gái" };
const emptyContent = { title: "", description: "" };
const familiesContent = { groom_father_name: "", groom_mother_name: "", bride_father_name: "", bride_mother_name: "", invitation_text: "", lunar_date_text: "", calendar_start_date: "", calendar_end_date: "", groom_ceremony_name: "", bride_ceremony_name: "", groom_ceremony_time: "", bride_ceremony_time: "", groom_venue_address: "", bride_venue_address: "", groom_map_url: "", bride_map_url: "" };
const giftsContent = { gift_banner_url: "", gift_banner_media_id: "", bride_qr_url: "", bride_bank_name: "", bride_account_name: "", bride_account_number: "", groom_qr_url: "", groom_bank_name: "", groom_account_name: "", groom_account_number: "" };
const giftLabels: Record<string, string> = { qr_url: "Đường dẫn mã QR", bank_name: "Tên ngân hàng", account_name: "Tên chủ tài khoản", account_number: "Số tài khoản" };
function fieldLabel(key: string) {
  if (fieldLabels[key]) return fieldLabels[key];
  const side = key.startsWith("bride_") ? "Nhà gái" : key.startsWith("groom_") ? "Nhà trai" : "";
  const suffix = key.replace(/^(bride|groom)_/, "");
  return side && giftLabels[suffix] ? `${side} · ${giftLabels[suffix]}` : key.replaceAll("_", " ");
}
function defaults(key: string) { return key === "families" ? familiesContent : key === "gifts" ? giftsContent : emptyContent; }

export function ContentManager() {
  const [sectionKey, setSectionKey] = useState("families");
  const [activeTab, setActiveTab] = useState<"info" | "images">("info");
  const [weddingInfo, setWeddingInfo] = useState<WeddingInfo>({ groomName: "", brideName: "", weddingDate: "" });
  const [gifts, setGifts] = useState<Record<string, string>>({});
  const [content, setContent] = useState(JSON.stringify(familiesContent, null, 2));
  const [published, setPublished] = useState(false);
  const [items, setItems] = useState<Content[]>([]);
  const [media, setMedia] = useState<Media[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [heroImages, setHeroImages] = useState<{ cover: PublicMedia | null; intro: PublicMedia | null }>({ cover: null, intro: null });
  const coverFile = useRef<HTMLInputElement>(null);
  const introFile = useRef<HTMLInputElement>(null);
  const sectionFile = useRef<HTMLInputElement>(null);
  const [imageTarget, setImageTarget] = useState<{ section: string; field: string } | null>(null);
  let fields: Record<string, unknown> | null = null;
  try { const parsed: unknown = JSON.parse(content); if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) fields = parsed as Record<string, unknown>; } catch { /* Show JSON editor for invalid source. */ }

  const load = useCallback(async () => {
    const [contentResponse, mediaResponse, weddingResponse] = await Promise.all([fetch("/api/admin/content", { cache: "no-store" }), fetch("/api/admin/media", { cache: "no-store" }), fetch("/api/admin/content", { method: "PATCH", cache: "no-store" })]);
    if (!contentResponse.ok || !mediaResponse.ok || !weddingResponse.ok) throw new Error();
    const loaded = (await contentResponse.json()).data as Content[];
    const weddingData = (await weddingResponse.json()).data as { groom_name: string; bride_name: string; wedding_date: string };
    const familyRow = loaded.find((item) => item.section_key === "families");
    const family = familyRow?.content ?? {};
    const date = new Date(weddingData.wedding_date);
    const localDate = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
    const groomTime = typeof family.groom_ceremony_time === "string" && /^\d{2}:\d{2}$/.test(family.groom_ceremony_time) ? family.groom_ceremony_time : "18:00";
    setWeddingInfo({ groomName: weddingData.groom_name, brideName: weddingData.bride_name, weddingDate: `${localDate}T${groomTime}` });
    const library = (await mediaResponse.json()).data as Media[];
    const publicItems = library as (Media & { url?: string | null })[];
    const hero = loaded.find((item) => item.section_key === "hero")?.content ?? {};
    const byId = (key: string): PublicMedia | null => { const item = publicItems.find((entry) => entry.id === hero[key] && entry.is_public && entry.url); return item?.url ? { ...item, url: item.url } : null; };
    setItems(loaded); setMedia(library); setHeroImages({ cover: byId("cover_media_id"), intro: byId("intro_media_id") });
    const giftContent = loaded.find((item) => item.section_key === "gifts")?.content ?? giftsContent;
    setGifts(Object.fromEntries(Object.entries(giftContent).map(([key, value]) => [key, typeof value === "string" ? value : ""])));
    const familyContent = loaded.find((item) => item.section_key === "families")?.content ?? familiesContent;
    setContent(JSON.stringify(familyContent, null, 2)); setPublished(loaded.find((item) => item.section_key === "families")?.is_published ?? false);
    return loaded;
  }, []);
  const initialize = useCallback(async () => {
    setLoading(true); setFailed(false);
    try { const loaded = await load(); const initial = loaded.find((item) => item.section_key === "families"); setContent(JSON.stringify(initial?.content ?? defaults("families"), null, 2)); setPublished(initial?.is_published ?? false); }
    catch { setFailed(true); } finally { setLoading(false); }
  }, [load]);
  useEffect(() => { void initialize(); }, [initialize]);
  useEffect(() => {
    function warn(event: BeforeUnloadEvent) { if (dirty) event.preventDefault(); }
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function selectSection(key: string) {
    if (dirty && !window.confirm("Bạn có thay đổi chưa lưu. Chuyển mục và bỏ các thay đổi này?")) return;
    const existing = items.find((item) => item.section_key === key);
    setSectionKey(key); setContent(JSON.stringify(existing?.content ?? defaults(key), null, 2)); setPublished(existing?.is_published ?? false); setDirty(false); setMessage("");
  }
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (!fields) { setMessage("Nội dung JSON chưa hợp lệ. Vui lòng kiểm tra lại."); return; }
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/content", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sectionKey, content: fields, isPublished: published }) });
      if (!response.ok) { setMessage((await response.json()).error ?? "Không thể lưu nội dung."); return; }
      setItems((current) => [...current.filter((item) => item.section_key !== sectionKey), { section_key: sectionKey, content: fields!, is_published: published }]); setDirty(false); setMessage(published ? "Đã lưu và xuất bản nội dung trên thiệp." : "Đã lưu bản nháp. Nội dung này đang được ẩn khỏi thiệp.");
    } catch { setMessage("Không thể kết nối. Vui lòng thử lại."); } finally { setBusy(false); }
  }
  async function saveWeddingInfo(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const rangeError = calendarRangeError(fields?.calendar_start_date, fields?.calendar_end_date);
    if (rangeError) { setMessage(rangeError); return; }
    setBusy(true); setMessage("");
    try {
      const familyFields = { ...(JSON.parse(content) as Record<string, unknown>), groom_ceremony_time: weddingInfo.weddingDate.slice(11, 16) };
      const familyResponse = await fetch("/api/admin/content", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sectionKey: "families", content: familyFields, isPublished: true }) });
      if (!familyResponse.ok) { setMessage((await familyResponse.json()).error ?? "Không thể lưu ngày âm."); return; }
      const groomTime = typeof familyFields.groom_ceremony_time === "string" && /^\d{2}:\d{2}$/.test(familyFields.groom_ceremony_time) ? familyFields.groom_ceremony_time : "18:00";
      const response = await fetch("/api/admin/content", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "wedding-info", ...weddingInfo, weddingDate: `${weddingInfo.weddingDate.slice(0, 10)}T${groomTime}` }) });
      if (!response.ok) { setMessage((await response.json()).error ?? "Không thể lưu thông tin thiệp."); return; }
      setDirty(false); await load(); setMessage("Đã cập nhật ngày cưới, ngày âm và dãy ngày đánh dấu trên lịch.");
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
  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const formElement = event.currentTarget; const form = new FormData(formElement); const file = form.get("file");
    if (file instanceof File && file.size > 10 * 1024 * 1024) { setMessage("Tệp quá lớn. Vui lòng chọn tệp tối đa 10 MB."); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/admin/media", { method: "POST", body: form });
      if (!response.ok) { setMessage((await response.json()).error ?? "Không thể tải tệp lên."); return; }
      formElement.reset(); await load(); setMessage("Đã tải tệp lên. Chọn Xuất bản để hiển thị công khai.");
    } catch { setMessage("Chưa xác nhận được kết quả tải tệp. Vui lòng tải lại trang để kiểm tra."); } finally { setBusy(false); }
  }
  async function uploadHeroImage(slot: "cover" | "intro", input: HTMLInputElement) {
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setMessage("Tệp quá lớn. Vui lòng chọn ảnh tối đa 10 MB."); input.value = ""; return; }
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
      const libraryResponse = await fetch("/api/admin/media", { cache: "no-store" });
      if (libraryResponse.ok) { const library = (await libraryResponse.json()).data as (Media & { url?: string | null })[]; setMedia(library); const item = library.find((entry) => entry.id === media.id); if (item?.url) setHeroImages((current) => ({ ...current, [slot]: { ...item, url: item.url! } })); }
      setItems((current) => [...current.filter((item) => item.section_key !== "hero"), { section_key: "hero", content: nextContent, is_published: true }]);
      setPublished(true); setMessage(slot === "cover" ? "Đã cập nhật ảnh bìa thiệp." : "Đã cập nhật ảnh mở đầu thiệp.");
    } catch { setMessage("Chưa xác nhận được kết quả tải ảnh. Vui lòng tải lại trang để kiểm tra."); }
    finally { input.value = ""; setBusy(false); }
  }
  async function uploadSectionImage(section: string, field: string, input: HTMLInputElement) {
    if (section === "hero" && (field === "cover_media_id" || field === "intro_media_id")) { await uploadHeroImage(field === "cover_media_id" ? "cover" : "intro", input); return; }
    const file = input.files?.[0]; if (!file) return;
    if (file.size > 10 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setMessage("Chọn ảnh JPEG, PNG hoặc WebP tối đa 10 MB."); input.value = ""; return; }
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
  async function changeMedia(item: Media, remove = false) {
    if (remove && !window.confirm("Xóa vĩnh viễn tệp này?")) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/media/${item.id}`, { method: remove ? "DELETE" : "PATCH", headers: { "Content-Type": "application/json" }, ...(remove ? {} : { body: JSON.stringify({ isPublic: !item.is_public, altText: item.alt_text ?? "" }) }) });
      if (!response.ok) throw new Error();
      setMedia((current) => remove ? current.filter((entry) => entry.id !== item.id) : current.map((entry) => entry.id === item.id ? { ...entry, is_public: !entry.is_public } : entry)); setMessage(remove ? "Đã xóa tệp." : "Đã cập nhật trạng thái hiển thị.");
    } catch { setMessage("Không thể cập nhật tệp. Vui lòng thử lại."); } finally { setBusy(false); }
  }
  const imageNames: Record<string, string> = { cover_media_id: "Ảnh bìa", intro_media_id: "Mở đầu", banner_media_id: "Ảnh lời mời", calendar_banner_media_id: "Ảnh nền lịch ngày cưới · 7:6", family_photo_media_id: "Ảnh gia đình", venue_photo_media_id: "Ảnh địa điểm", story_photo_media_id: "Ảnh chuyện tình yêu", timeline_photo_media_id: "Ảnh lịch trình", dress_code_photo_media_id: "Ảnh trang phục", gift_banner_media_id: "Ảnh mừng cưới dùng chung", bride_qr_media_id: "Mã QR nhà gái", groom_qr_media_id: "Mã QR nhà trai" };
  const attachedMedia = (section: string, field: string) => media.find((asset) => items.find((entry) => entry.section_key === section)?.content[field] === asset.id);
  return <main><AdminHeading title="Nội dung & hình ảnh" description="Quản lý thông tin và hình ảnh hiển thị trên thiệp cưới."><a href={process.env.NEXT_PUBLIC_SITE_URL ?? "/"} target="_blank" rel="noreferrer" className="admin-button admin-button-secondary"><AdminIcon name="external" />Xem trước thiệp</a></AdminHeading>
    {message && <p className="admin-notice" role="status">{message}</p>}
    <input ref={sectionFile} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={busy} onChange={(event) => imageTarget && void uploadSectionImage(imageTarget.section, imageTarget.field, event.currentTarget)} />
    {failed ? <section className="admin-card admin-empty"><h3>Chưa tải được nội dung</h3><button className="admin-button admin-button-secondary mt-3" onClick={() => void initialize()}>Thử lại</button></section> : loading ? <section className="admin-card admin-empty" role="status">Đang tải nội dung và thư viện…</section> : <>
    <section className="admin-card"><div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3"><div className="flex gap-2"><button type="button" className={`admin-button ${activeTab === "info" ? "" : "admin-button-secondary"}`} onClick={() => setActiveTab("info")}>Thông tin</button><button type="button" className={`admin-button ${activeTab === "images" ? "" : "admin-button-secondary"}`} onClick={() => setActiveTab("images")}>Hình ảnh</button></div>{activeTab === "info" && <span className={`admin-badge ${dirty ? "amber" : "neutral"}`}>{dirty ? "Chưa lưu" : "Đã đồng bộ"}</span>}</div>
    {activeTab === "info" ? <>
      <section className="border-t border-gray-200 pt-5"><form onSubmit={saveWeddingInfo}><fieldset disabled={busy}><div className="admin-section-heading"><div><h2>Ngày cưới</h2><p>Ngày dương và ngày âm dùng chung cho hai nhà.</p></div></div><div className="admin-editor-fields"><label className="admin-field">Ngày dương<input className="admin-input" type="date" required value={weddingInfo.weddingDate.slice(0, 10)} onChange={(event) => { setWeddingInfo((current) => ({ ...current, weddingDate: `${event.target.value}T${current.weddingDate.slice(11, 16) || "18:00"}` })); setDirty(true); }} /></label><label className="admin-field">Ngày âm<input className="admin-input" value={String(fields?.lunar_date_text ?? "")} placeholder="Ví dụ: 15 tháng 8 năm Bính Ngọ" onChange={(event) => { setContent(JSON.stringify({ ...fields, lunar_date_text: event.target.value }, null, 2)); setDirty(true); }} /></label></div><div className="mt-5 rounded-xl border border-gray-200 p-4"><h3 className="text-sm font-semibold">Ngày đánh dấu trên lịch</h3><p className="mt-1 text-sm text-gray-500">Đánh dấu trái tim cho tất cả ngày từ ngày bắt đầu đến ngày kết thúc. Chọn cùng một ngày để đánh dấu một ngày; để trống cả hai để dùng ngày cưới.</p><div className="admin-editor-fields mt-3">{([["calendar_start_date", "Từ ngày"], ["calendar_end_date", "Đến ngày"]] as const).map(([key, label]) => <label key={key} className="admin-field">{label}<input type="date" className="admin-input" value={String(fields?.[key] ?? "")} required={Boolean(fields?.calendar_start_date || fields?.calendar_end_date)} min={key === "calendar_end_date" ? String(fields?.calendar_start_date || "") : undefined} onChange={(event) => { setContent(JSON.stringify({ ...fields, [key]: event.target.value }, null, 2)); setDirty(true); }} /></label>)}</div><p className="mt-3 text-xs text-gray-500">Ảnh nền tỷ lệ 7:6: tab Hình ảnh · Section 4 · Lịch ngày cưới.</p></div><button className="admin-button mt-5" disabled={busy || !dirty}>{busy ? "Đang lưu…" : "Lưu ngày cưới"}</button></fieldset></form></section>
      <section className="mt-6 border-t border-gray-200 pt-5">
        <form onSubmit={saveGifts}>
          <div className="admin-section-heading"><div><h2>Mừng cưới</h2><p>Một ảnh chung cho hai nhà; thông tin chuyển khoản và mã QR riêng theo từng người nhận.</p></div></div>
          <p className="mb-5 text-sm text-gray-500">Ảnh mừng cưới được quản lý tại tab Hình ảnh · Section 9.</p>
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
                  <label className="admin-field">Tên ngân hàng<input className="admin-input" maxLength={160} value={gifts[`${prefix}_bank_name`] ?? ""} onChange={(event) => { setGifts((current) => ({ ...current, [`${prefix}_bank_name`]: event.target.value })); setDirty(true); }} /></label>
                  <label className="admin-field">Số tài khoản<input className="admin-input" maxLength={100} value={gifts[`${prefix}_account_number`] ?? ""} onChange={(event) => { setGifts((current) => ({ ...current, [`${prefix}_account_number`]: event.target.value })); setDirty(true); }} /></label>
                  <label className="admin-field">Tên chủ tài khoản<input className="admin-input" maxLength={120} value={gifts[`${prefix}_account_name`] ?? ""} onChange={(event) => { setGifts((current) => ({ ...current, [`${prefix}_account_name`]: event.target.value })); setDirty(true); }} /></label>
                  <ImageUploadField label="Mã QR chuyển khoản" imageUrl={qr?.url} disabled={busy} onSelect={() => { setImageTarget({ section: "gifts", field: `${prefix}_qr_media_id` }); sectionFile.current?.click(); }} />
                </div>
              </section>;
            })}
          </div>
          <button className="admin-button mt-5" disabled={busy || !dirty}>{busy ? "Đang lưu…" : "Lưu thông tin mừng cưới"}</button>
        </form>
      </section>
      <section className="mt-6 border-t border-gray-200 pt-5"><form onSubmit={saveFamilies}><div className="admin-section-heading"><div><h2>Nhà trai / Nhà gái</h2><p>Ngày cưới dùng chung; giờ tổ chức, nghi lễ, địa chỉ và bản đồ được nhập riêng cho từng nhà.</p></div></div><div className="grid gap-5 md:grid-cols-2">{(["groom", "bride"] as const).map((side) => { const prefix = side; const label = side === "groom" ? "Nhà trai" : "Nhà gái"; return <section key={side} className="rounded-xl border border-gray-200 p-4"><h3 className="mb-4 text-sm font-semibold">{label}</h3><div className="grid gap-3">{([[`${prefix}_father_name`, "Tên bố"], [`${prefix}_mother_name`, "Tên mẹ"], [`${prefix}_ceremony_name`, "Tên nghi lễ"], [`${prefix}_ceremony_time`, side === "groom" ? "Giờ tổ chức · countdown" : "Giờ tổ chức"], [`${prefix}_venue_address`, "Địa chỉ"]] as const).map(([field, labelText]) => <label key={field} className="admin-field">{labelText}<input className="admin-input" maxLength={500} type={field.endsWith("_time") ? "time" : "text"} value={field === "groom_ceremony_time" ? weddingInfo.weddingDate.slice(11, 16) : String(fields?.[field] ?? "")} onChange={(event) => { if (field === "groom_ceremony_time") setWeddingInfo((current) => ({ ...current, weddingDate: `${current.weddingDate.slice(0, 10)}T${event.target.value}` })); setContent(JSON.stringify({ ...fields, [field]: event.target.value }, null, 2)); setDirty(true); }} /></label>)}<label className="admin-field">Liên kết bản đồ<input className="admin-input" type="url" value={String(fields?.[`${prefix}_map_url`] ?? "")} onChange={(event) => { setContent(JSON.stringify({ ...fields, [`${prefix}_map_url`]: event.target.value }, null, 2)); setDirty(true); }} /></label></div></section>; })}</div><button className="admin-button mt-5" disabled={busy || !dirty}>{busy ? "Đang lưu…" : "Lưu thông tin nhà trai / nhà gái"}</button></form></section>
    </> : <><div className="admin-section-heading"><div><h2>Hình ảnh</h2><p>Tất cả ảnh được nhóm theo section; tải lên để thêm hoặc thay ảnh đúng vị trí.</p></div><span className="admin-badge neutral">{media.filter((item) => item.mime_type.startsWith("image/")).length} ảnh</span></div><div className="mt-5 space-y-8">{sectionImageGroups.map(({ title, section, fields: imageList }) => <section key={title}><h3 className="border-b border-gray-200 pb-2 text-sm font-semibold">{title} · {imageList.length} ảnh</h3><div className="mt-3 grid gap-5 sm:grid-cols-2">{imageList.map((field, index) => { const attached = attachedMedia(section, field); return <article key={field} className="rounded-xl border border-gray-200 p-4"><h4 className="text-sm font-semibold">{imageNames[field] ?? `Ảnh ${index + 1}`}</h4>{attached?.url ? <div className={`relative mt-3 ${field === "calendar_banner_media_id" ? "aspect-[6/7]" : "aspect-[4/3]"} overflow-hidden rounded-lg bg-gray-100`}><img src={attached.url} alt={attached.alt_text ?? ""} className="h-full w-full object-cover" /></div> : <div className="admin-empty mt-3"><p>{attached ? "Ảnh đang ẩn" : "Chưa có ảnh trong mục này"}</p></div>}<p className="mt-2 break-all text-xs text-gray-500">{attached?.alt_text || "Chưa chọn ảnh"}</p><button type="button" className="admin-button mt-4" disabled={busy} onClick={() => { setImageTarget({ section, field }); sectionFile.current?.click(); }}>{attached ? "Thay ảnh" : "Tải ảnh lên"}</button></article>; })}</div></section>)}</div>
      <div className="admin-section-heading mt-8"><div><h2>Thư viện ảnh</h2><p>Tất cả ảnh tải lên cho thiệp này.</p></div></div><div className="mt-4 grid gap-3">{media.filter((item) => item.mime_type.startsWith("image/")).map((item) => <article key={item.id} className="flex items-center gap-3 border-t border-gray-100 py-3">{(item as Media & { url?: string }).url && <img src={(item as Media & { url?: string }).url} alt={item.alt_text ?? ""} className="h-14 w-20 rounded object-cover" />}<div className="min-w-0 flex-1"><strong className="break-all text-xs">{item.alt_text || item.storage_path}</strong><p className="text-xs text-gray-500">{item.is_public ? "Đang công khai" : "Đang ẩn"}</p></div><button type="button" disabled={busy} onClick={() => void changeMedia(item)} className="admin-button admin-button-secondary">{item.is_public ? "Ẩn" : "Xuất bản"}</button></article>)}<div className="mt-8">    <details className="admin-card mt-6"><summary className="cursor-pointer text-sm font-semibold">Tài nguyên thiết kế có sẵn</summary><p className="mt-3 text-xs text-gray-500">Chọn một hình để tải xuống.</p><div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[["/assets/monogram-minh-hue.svg", "Bình Minh - Ninh Huệ"], ["/fabric-red-transparent.png", "Mảnh bao thư phía trên"], ["/fabric-red-panel.png", "Mảnh bao thư phía dưới"], ["/wax-seal-monogram-mh.png", "Dấu sáp monogram MH"]].map(([src, label]) => <a key={src} href={src} download className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center hover:border-wine/40"><div className="grid h-36 place-items-center"><Image src={src} alt={label} width={120} height={140} className="max-h-32 w-auto" /></div><span className="mt-2 block text-xs font-medium text-wine">{label} ↓</span></a>)}</div></details></div></div></>}</section>
    </>}

  </main>;
}

