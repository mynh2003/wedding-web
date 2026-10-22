# Frontend thiệp mời

Ứng dụng Next.js độc lập. Node.js 24; không cần source backend để cài đặt/build.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

PowerShell: dùng `Copy-Item .env.example .env.local` nếu chưa có file env. Nhập Supabase URL và publishable key thực tế; tuyệt đối không thêm khóa server.

Dev: `http://localhost:3000/groom`, `/bride` hoặc `/i/[token]`. Backend mặc định ở `http://127.0.0.1:3001`, có thể đổi `BACKEND_INTERNAL_URL`. Cả localhost và LAN dùng proxy API công khai trong dev. Admin ở domain/cổng backend.

`npm run typecheck`, `npm run lint`, `npm run build`; `npm start` chạy production cổng 3000. Production bắt buộc `NEXT_PUBLIC_SITE_URL` và `NEXT_PUBLIC_API_URL` là hai origin HTTPS khác hostname. Build không cần backend online, nhưng SSR khi truy cập thiệp cần API online.

Vercel: Next.js, Node 24, install `npm ci --include=dev`, build `npm run build`, output mặc định. Repo riêng: Root Directory `.`; repo hiện tại: `frontend`. Không cần bật đọc source bên ngoài. Branch `develop` dùng Preview, `main` dùng Production; đặt cặp URL cố định tương ứng trước build. Không đưa `.env.local` lên Git.

Backend cung cấp API công khai `/api/public/wedding`, `/api/public/invitation`, `/api/wishes`, `/api/music`. File nhạc `/music/...` thuộc frontend; đồng bộ tên file trong catalog backend khi thay đổi bài. Giữ tương thích response API khi tách repo; các kiểu dữ liệu trong `lib/` là bản cục bộ của contract.

Workflow .github/workflows/ci.yml trong thư mục app sẽ hoạt động sau khi chuyển app thành repo riêng; repo hiện tại dùng workflow ở gốc.

Test và công cụ nằm trong `tests/` và `scripts/`. Chạy `npm test`, `npm run audit:source`, `npm run check:dev` (khi hai dev server đang chạy) hoặc `npm run smoke` (cặp production). Không cần dependency ở gốc repo.

Ảnh tĩnh mới phải tối ưu WebP/AVIF theo `AGENTS.md`. Công cụ và số liệu nén: [IMAGES.md](docs/IMAGES.md). Ảnh nguồn chỉnh sửa nằm trong `source-assets/`; UI chỉ tham chiếu bản tối ưu trong `public/`.
