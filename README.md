# Wedding invitation

Hai ứng dụng độc lập, có thể chuyển nguyên từng thư mục thành repo riêng:

- `frontend/`: thiệp mời, layout, animation và tài nguyên tĩnh. Dev: `http://localhost:3000/groom`.
- `backend/`: API, xác thực, dashboard và migration Supabase. Dev: `http://localhost:3001/admin/login`.
- `ai/`: prompt và tài liệu tham chiếu thiết kế. Không dùng khi build/deploy app.

## Phát triển

Dùng Node.js 24. Trong **mỗi thư mục app**, chạy `npm ci`, sao chép `.env.example` thành `.env.local` rồi nhập cấu hình Supabase thực tế. File `.env.local` có sẵn được giữ riêng trên máy và không commit. Next chỉ đọc env trong thư mục app; `.env` ở gốc là cấu hình cũ, không còn được nạp tự động.

Mở hai terminal:

```powershell
cd backend
npm run dev
```

```powershell
cd frontend
npm run dev
```

Cả hai bind `0.0.0.0`. Trên điện thoại cùng Wi-Fi, dùng IP LAN của máy với cổng 3000 để mở thiệp, cổng 3001 để mở admin. Không dùng `0.0.0.0` làm địa chỉ truy cập. Frontend dev proxy các API công khai để localhost và điện thoại cùng hoạt động; admin đăng nhập trực tiếp trên backend.

Không chạy npm ở gốc repo: gốc không có package.json, lockfile hoặc node_modules. Mỗi app có `tests/` và `scripts/` riêng. Trong từng app chạy `npm test`, `npm run typecheck`, `npm run lint`, `npm run audit:source`, `npm run build`.

Khi checkout có cả hai app, có thể chạy `npm --prefix backend run dev:stack` để mở cả hai dev server. Bộ kiểm tra liên ứng dụng nằm ở `backend/tests/integration`; chạy `npm --prefix backend run test:integration` sau khi cài dependency của hai app. Công cụ dev và test tích hợp này là tùy chọn; mỗi repo riêng vẫn dùng `npm run dev` và `npm test` của mình. Frontend có `npm run check:dev` để kiểm tra HTTP localhost/LAN và `npm run smoke` để kiểm tra cặp deployment.

## Giao tiếp và triển khai

Frontend gọi API backend qua `NEXT_PUBLIC_API_URL`; SSR có thể dùng `BACKEND_INTERNAL_URL`. Không chia sẻ filesystem, cookie quản trị hay import source giữa hai app. Realtime công khai vẫn kết nối Supabase với quyền anonymous/RLS.

Các kiểu dữ liệu/hàm thuần cần thiết được lưu riêng trong từng app. Khi đổi contract API, cập nhật hai bên có chủ đích và kiểm tra tương thích. Danh mục nhạc thuộc backend; file MP3 được frontend phục vụ theo đường dẫn `/music/...`. Khi đổi bài, cập nhật catalog backend tương ứng (ở checkout hiện tại có tiện ích `npm --prefix backend run sync:music`). Build backend không đọc frontend.

Vercel: hai Project, Root Directory tương ứng `frontend`/`backend`; sau khi tách repo chọn `.`. Mỗi bên dùng `npm ci --include=dev` và `npm run build`, không cần source ngoài Root Directory. Xem [hướng dẫn triển khai](ai/docs/VERCEL_DEPLOYMENT.md), [frontend](frontend/README.md) và [backend](backend/README.md). Hiện chưa deploy hoặc tạo repo từ cấu trúc này.
