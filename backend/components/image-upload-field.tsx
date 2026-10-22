"use client";

import Image from "next/image";
import { AdminIcon } from "@/components/admin-icon";

type ImageUploadFieldProps = {
  label: string;
  imageUrl?: string | null;
  disabled?: boolean;
  onSelect: () => void;
};

export function ImageUploadField({ label, imageUrl, disabled = false, onSelect }: ImageUploadFieldProps) {
  return <div>
    <p className="admin-field">{label}</p>
    {imageUrl ? <Image unoptimized width={128} height={128} src={imageUrl} alt={`Xem trước: ${label}`} className="mb-2 h-32 w-32 rounded border bg-white object-contain" /> : <div className="mb-2 grid h-32 w-32 place-items-center rounded border border-dashed border-gray-300 bg-gray-50 text-center text-xs text-gray-500">Chưa có ảnh xem trước</div>}
    <button type="button" className="admin-button admin-button-secondary" disabled={disabled} onClick={onSelect}><AdminIcon name={imageUrl ? "edit" : "upload"} />{imageUrl ? "Thay ảnh" : "Tải ảnh lên"}</button>
  </div>;
}
