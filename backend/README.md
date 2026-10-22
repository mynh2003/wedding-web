# Backend API và dashboard

Ứng dụng Next.js độc lập. Node.js 24; không cần thư mục frontend để cài đặt/build.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

PowerShell: dùng `Copy-Item .env.example .env.local` nếu chưa có file env. Nhập Supabase và hai khóa server theo `.env.example`; giữ khóa mã hóa link ổn định. Migration, hướng dẫn RLS và storage nằm trong `supabase/`.

Admin: `http://localhost:3001/admin/login`. Thiệp ở frontend cổng 3000. LAN dùng IP máy chủ, cổng 3001; admin form và cookie thuộc origin backend. API công khai chấp nhận origin frontend theo cấu hình; API quản trị yêu cầu session và cùng origin.

`npm run typecheck`, `npm run lint`, `npm run build`; `npm start` chạy production cổng 3001. Danh mục nhạc nằm trong `lib/music-catalog.generated.json`, file MP3 do frontend phục vụ. Build không đọc filesystem app khác. `WEDDING_PUBLIC_DIR` chỉ là tùy chọn dev để quét một thư mục tài nguyên do bạn chỉ định.

Vercel: Next.js, Node 24, install `npm ci --include=dev`, build `npm run build`, output mặc định. Repo riêng: Root Directory `.`; repo hiện tại: `backend`. Không cần source bên ngoài. Đặt hai origin HTTPS khác hostname trên cả hai Project; dùng cặp domain riêng cho Preview/develop và Production/main. Deploy backend trước frontend. API Preview phải truy cập được từ frontend; không đặt bypass secret trong client.

Chi tiết vận hành, backup và rollback: [runbook](docs/PRODUCTION_RUNBOOK.md). Danh sách API và CORS: `lib/deployment.ts`; contract công khai: `lib/wedding-types.ts` và response `app/api/public/wedding/route.ts`.

Workflow .github/workflows/ci.yml trong thư mục app sẽ hoạt động sau khi chuyển app thành repo riêng; repo hiện tại dùng workflow ở gốc.

Test và công cụ nằm trong `tests/` và `scripts/`. `npm test` kiểm tra riêng backend; `npm run audit:source` kiểm tra source. Khi checkout có cả hai app, `npm run test:integration` kiểm tra liên ứng dụng, `npm run dev:stack` mở hai dev server và `npm run sync:music` cập nhật catalog từ tài nguyên frontend. Các lệnh tùy chọn này không dùng trong install/build hoặc CI của repo backend riêng.

Chống spam và ảnh upload: xem [SECURITY.md](docs/SECURITY.md). Production yêu cầu `SUPABASE_SECRET_KEY` chỉ ở backend, `WISH_RATE_LIMIT_SECRET` mạnh và migration `202610220001_backend_abuse_controls.sql`. Dev chưa có private key dùng limiter trong bộ nhớ để tiếp tục làm việc; không coi đây là bảo vệ bền vững cho production.

Thư viện ảnh có phân trang 24 ảnh/trang và xóa vĩnh viễn ảnh chưa dùng. SQL Editor và thứ tự cập nhật: [MEDIA_CLEANUP.md](docs/MEDIA_CLEANUP.md). Chạy npm run sql:bundle nếu cần tạo lại file SQL gộp từ migration nguồn.
