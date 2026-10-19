"use client";

import { DRESS_CODE_PLACEHOLDER } from "@/lib/dress-code";

const suggestions = [
  { name: "Ấm áp & thanh lịch", colors: ["#722F37", "#C49A83", "#E7C9B8", "#F3E9DA", "#FBF8F1"] },
  { name: "Nhẹ nhàng & lãng mạn", colors: ["#A56978", "#D6A6B2", "#EBD3D7", "#DDD9CF", "#F8F4ED"] },
  { name: "Tự nhiên & tinh tế", colors: ["#66705B", "#A7AE94", "#D2D5BE", "#D8C4A8", "#F6F1E7"] },
];

export function DressColorEditor({ colors, onChange }: { colors: string[]; onChange: (colors: string[]) => void }) {
  return <div className="admin-palette-editor">
    <div className="admin-palette-preview">
      <div><span className="admin-palette-eyebrow">BẢNG MÀU TRANG PHỤC</span><h3>Những sắc màu cho ngày chung đôi</h3><p>Chọn tối đa 5 màu để khách mời dễ phối trang phục.</p></div>
      <div className="admin-palette-strip" aria-label="Xem trước bảng màu">{colors.map((color, index) => <span key={index} style={{ backgroundColor: color || DRESS_CODE_PLACEHOLDER }} aria-label={`Màu ${index + 1}: ${color || "chưa chọn"}`} />)}</div>
      <span className="admin-palette-count">{colors.filter(Boolean).length}/5 màu đã chọn · Xem trước thay đổi của bạn</span>
    </div>
    <div className="admin-color-grid">{colors.map((color, index) => <div className="admin-color-card" key={index}>
      <label className="admin-color-picker" style={{ backgroundColor: color || DRESS_CODE_PLACEHOLDER }}>
        <input type="color" aria-label={`Chọn màu trang phục ${index + 1}`} value={color || DRESS_CODE_PLACEHOLDER} onChange={(event) => onChange(colors.map((value, position) => position === index ? event.target.value : value))} />
        <span aria-hidden="true">+</span>
      </label>
      <div className="admin-color-description"><strong>Màu {index + 1}</strong><span>{color ? color.toUpperCase() : "Chưa chọn màu"}</span></div>
      <button type="button" className="admin-color-clear" disabled={!color} aria-label={`Xóa màu ${index + 1}`} onClick={() => onChange(colors.map((value, position) => position === index ? "" : value))}>Xóa</button>
    </div>)}</div>
    <div className="admin-palette-suggestions"><h3>Gợi ý phối màu</h3><p>Chạm vào một bảng màu để thử. Thay đổi chỉ xuất hiện trên thiệp sau khi lưu.</p>
      <div className="admin-palette-presets">{suggestions.map((palette) => <button key={palette.name} type="button" aria-label={`Dùng bảng màu ${palette.name}`} onClick={() => onChange([...palette.colors])}>
        <span className="admin-preset-colors" aria-hidden="true">{palette.colors.map((color) => <span key={color} style={{ backgroundColor: color }} />)}</span><span>{palette.name}</span><span aria-hidden="true">↗</span>
      </button>)}</div>
    </div>
  </div>;
}
