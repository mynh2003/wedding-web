"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { mediaUsage } from "@/lib/media/usage";
import { AdminIcon } from "@/components/admin-icon";
import { AdminSkeleton } from "@/components/admin-skeleton";

type Asset = { id: string; storage_path: string; mime_type: string; alt_text: string | null; is_public: boolean; created_at: string; url?: string | null };
type Content = { section_key: string; content: unknown };

export function MediaLibrary({ content, refreshKey, disabled, unsavedChanges, onChange }: { content: Content[]; refreshKey: unknown; disabled: boolean; unsavedChanges: boolean; onChange: () => Promise<unknown> }) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const inFlight = useRef(false);
  const reload = useCallback(() => setRevision(value => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setFailed(false);
    void fetch(`/api/admin/media?page=${page}`, { cache: "no-store", signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error();
      const result = await response.json();
      if (controller.signal.aborted) return;
      if (page > 1 && !result.data.length) { setPage(value => value - 1); return; }
      setAssets(result.data); setTotal(result.total);
    }).catch(() => { if (!controller.signal.aborted) setFailed(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page, revision, refreshKey]);

  async function change(asset: Asset, remove: boolean) {
    if (inFlight.current || disabled) return;
    if (remove && !window.confirm(`Xóa vĩnh viễn “${asset.alt_text || "ảnh chưa đặt tên"}”?\nTệp sẽ bị xóa khỏi thư viện và Storage. Không thể khôi phục.`)) return;
    inFlight.current = true; setPending(asset.id); setMessage("");
    try {
      const response = await fetch(`/api/admin/media/${asset.id}`, {
        method: remove ? "DELETE" : "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(remove ? { confirmed: true } : { isPublic: !asset.is_public, altText: asset.alt_text ?? "" }),
      });
      const result = await response.json();
      if (!response.ok) { setMessage(result.error ?? "Không thể cập nhật ảnh. Vui lòng thử lại."); reload(); return; }
      setMessage(remove ? "Đã xóa vĩnh viễn ảnh và tệp trong Storage." : "Đã cập nhật trạng thái ảnh.");
      reload(); await onChange();
    } catch { setMessage("Chưa xác nhận được kết quả. Hãy tải lại thư viện trước khi thử lại."); reload(); }
    finally { inFlight.current = false; setPending(null); }
  }

  return <section className="mt-8" aria-label="Thư viện ảnh">
    <div className="admin-section-heading"><div><h2>Thư viện ảnh · {total}</h2><p>Ảnh cũ vẫn được giữ khi thay ảnh. Chỉ xóa ảnh không còn gắn trong nội dung thiệp.</p></div></div>
    {unsavedChanges && <p className="admin-notice mt-4">Hãy lưu nội dung đang sửa trước khi thay đổi hoặc xóa ảnh trong thư viện.</p>}
    {message && <p role="status" className="admin-notice mt-4">{message}</p>}
    <div className="admin-media-list mt-4" aria-busy={loading}>
      {failed ? <div className="admin-empty"><p>Không thể tải thư viện ảnh.</p><button type="button" onClick={reload} className="admin-button admin-button-secondary mt-3"><AdminIcon name="refresh" />Thử lại</button></div>
        : loading ? <AdminSkeleton variant="media" />
          : assets.length ? assets.map(asset => {
            const usage = mediaUsage(asset, content);
            const used = usage.length > 0;
            return <article key={asset.id} className="admin-media-row">
              {asset.url ? <Image unoptimized src={asset.url} alt={asset.alt_text ?? "Ảnh trong thư viện"} width={80} height={64} className="h-16 w-20 rounded object-cover" /> : <div className="h-16 w-20 rounded bg-gray-100" aria-hidden="true" />}
              <div className="min-w-0 flex-1"><strong className="break-words text-sm">{asset.alt_text || "Ảnh chưa đặt tên"}</strong><p className="mt-1 text-xs text-gray-500">{new Date(asset.created_at).toLocaleDateString("vi-VN")}</p><span className={`admin-badge mt-2 ${used ? "sage" : "neutral"}`}>{used ? "Đang dùng" : "Chưa dùng"}</span></div>
              <div className="admin-media-actions">
                <button type="button" disabled={disabled || pending !== null} onClick={() => void change(asset, false)} className="admin-button admin-button-secondary"><AdminIcon name={asset.is_public ? "hide" : "eye"} />{asset.is_public ? "Ẩn" : "Xuất bản"}</button>
                <button type="button" disabled={disabled || pending !== null || used} title={used ? "Thay hoặc gỡ ảnh khỏi nội dung trước khi xóa" : "Xóa tệp không thể khôi phục"} onClick={() => void change(asset, true)} className="admin-button admin-button-danger"><AdminIcon name={pending === asset.id ? "loader" : "trash"} />{pending === asset.id ? "Đang xử lý…" : "Xóa vĩnh viễn"}</button>
              </div>
            </article>;
          }) : <p className="admin-empty">Thư viện chưa có ảnh.</p>}
    </div>
    <div className="admin-pagination"><span>Trang {page}/{Math.max(1, Math.ceil(total / 24))} · 24 ảnh/trang</span><div>
      <button type="button" disabled={loading || page === 1} onClick={() => setPage(value => value - 1)} className="admin-button admin-button-secondary"><AdminIcon name="back" />Trang trước</button>
      <button type="button" disabled={loading || page * 24 >= total} onClick={() => setPage(value => value + 1)} className="admin-button admin-button-secondary">Trang sau<AdminIcon name="chevron" /></button>
    </div></div>
  </section>;
}
