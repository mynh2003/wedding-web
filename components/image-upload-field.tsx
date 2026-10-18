"use client";

type ImageUploadFieldProps = {
  label: string;
  imageUrl?: string | null;
  disabled?: boolean;
  onSelect: () => void;
};

export function ImageUploadField({ label, imageUrl, disabled = false, onSelect }: ImageUploadFieldProps) {
  return <div>
    <p className="admin-field">{label}</p>
    {imageUrl ? <img src={imageUrl} alt={`Xem trước: ${label}`} className="mb-2 h-32 w-32 rounded border bg-white object-contain" /> : <div className="mb-2 grid h-32 w-32 place-items-center rounded border border-dashed border-gray-300 bg-gray-50 text-center text-xs text-gray-500">Chưa có ảnh xem trước</div>}
    <button type="button" className="admin-button admin-button-secondary" disabled={disabled} onClick={onSelect}>{imageUrl ? "Thay ảnh" : "Tải ảnh lên"}</button>
  </div>;
}
