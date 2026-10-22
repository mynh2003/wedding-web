# Triển khai frontend và backend lên Vercel

Repository có hai ứng dụng Next.js độc lập; mỗi ứng dụng có package.json, lockfile và cấu hình riêng. Có thể chuyển nguyên thư mục thành repo riêng. Mỗi ứng dụng dùng một Vercel Project; frontend phục vụ thiệp, backend phục vụ API và `/admin`. Tài liệu này hướng dẫn cấu hình; các file trong repository không tự tạo Project, gắn domain hoặc triển khai lên tài khoản Vercel.

## 1. Tạo hai Project từ cùng repository

Import repository hai lần và cấu hình như bảng sau. Vercel hỗ trợ mỗi thư mục của monorepo thành một Project với Root Directory riêng. [Hướng dẫn monorepo của Vercel](https://vercel.com/docs/monorepos).

| Cài đặt | Project frontend | Project backend |
| --- | --- | --- |
| Root Directory | `frontend` | `backend` |
| Framework Preset | Next.js | Next.js |
| Node.js Version | `24.x` | `24.x` |
| Production Branch | `main` | `main` |
| Install Command | `npm ci --include=dev` | `npm ci --include=dev` |
| Build Command | `npm run build` | `npm run build` |
| Output Directory | Giữ mặc định Next.js | Giữ mặc định Next.js |

Các file `frontend/vercel.json` và `backend/vercel.json` đã khai báo framework và hai command. Build chạy trong Root Directory tương ứng; Next config cục bộ chọn đúng vai trò. Giữ thư mục build production mặc định `.next`; không đặt `NEXT_BUILD_DIR` trên Vercel. [Cấu hình vercel.json](https://vercel.com/docs/project-configuration/vercel-json).

Không cần bật **Include source files outside of the Root Directory**: hai app không import source ngoài thư mục của mình. Nếu tách thành hai repo, chọn Root Directory `.` cho mỗi Project.

Chọn Node `24.x` trong cài đặt Build and Deployment của cả hai Project để khớp CI. [Node.js được Vercel hỗ trợ](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).

## 2. Chuẩn bị hai cặp domain cố định

Chọn bốn origin HTTPS thực tế trước khi nhập biến môi trường:

| Môi trường | Branch | Origin frontend | Origin backend |
| --- | --- | --- | --- |
| Production | `main` | Domain thiệp chính thức | Domain API/admin chính thức |
| Preview để test | `develop` | Domain thiệp test cố định | Domain API/admin test cố định |

Frontend và backend phải có **hostname khác nhau**. Mỗi giá trị là origin đầy đủ gồm `https://` và hostname, không có đường dẫn, query hoặc thông tin đăng nhập. Không dùng `localhost`, IP LAN hay URL HTTP cho bản Vercel.

Gắn hai domain chính thức vào Production của hai Project. Với hai domain test, vào **Settings → Domains → Edit**, chọn **Preview** và Git Branch `develop`. Domain sẽ theo bản build của branch đó. [Gắn domain vào Git branch](https://vercel.com/docs/domains/working-with-domains/assign-domain-to-a-git-branch).

Ứng dụng kiểm tra chính xác origin đã cấu hình. URL deployment ngẫu nhiên `*.vercel.app` không tự thay thế domain cố định và có thể bị từ chối. Mở bằng domain đúng của môi trường. Nếu cần test một PR bằng URL riêng, phải cấu hình đúng **cả cặp frontend/backend** của PR đó rồi build lại hai app; không nối frontend PR với backend Production.

## 3. Nhập biến môi trường cho cả hai Project

Trong **Settings → Environment Variables**, tạo bộ **Production** và bộ **Preview** riêng. Bộ Preview dùng dữ liệu test; có thể đặt giới hạn branch `develop` để ghi đè giá trị Preview mặc định. Nếu bật build cho các branch PR khác, chúng cũng cần bộ Preview dùng dữ liệu test phù hợp. Biến Production không được dùng làm giá trị dự phòng cho Preview. [Phạm vi biến môi trường Vercel](https://vercel.com/docs/environment-variables).

### Biến chung trên cả frontend và backend

| Biến | Production | Preview / `develop` |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Origin frontend chính thức | Origin frontend test |
| `NEXT_PUBLIC_API_URL` | Origin backend chính thức | Origin backend test |
| `NEXT_PUBLIC_SUPABASE_URL` | URL Supabase Production | URL Supabase test |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key của Supabase Production | Publishable key của Supabase test |
| `NEXT_PUBLIC_WEDDING_SLUG` | Slug thiệp chính thức | Slug thiệp trong dữ liệu test |

Hai Project trong **cùng môi trường** phải có cùng hai origin, Supabase URL/key và wedding slug. Nên dùng hai Supabase Project riêng cho test và Production; áp dụng migration, Storage và cấu hình tài khoản admin tương ứng cho từng bên.

### Biến chỉ đặt trên backend

| Biến | Cách đặt |
| --- | --- |
| `WISH_RATE_LIMIT_SECRET` | Secret ngẫu nhiên; dùng giá trị riêng cho Preview và Production |
| `INVITATION_LINK_ENCRYPTION_KEY` | 32 byte ngẫu nhiên dạng 64 ký tự hex; lưu ổn định và sao lưu riêng theo môi trường |

Không đặt hai secret này trên Project frontend hoặc thêm tiền tố `NEXT_PUBLIC_`. Không đổi encryption key Production khi triển khai lại; đổi key khiến các link đã lưu không thể mở lại. Có thể tạo một key mới bằng lệnh dưới đây rồi nhập trực tiếp vào dashboard, không commit kết quả:

```sh
node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))"
```

Frontend có thể dùng `BACKEND_INTERNAL_URL` khi cần một địa chỉ server-to-server riêng. Trên Vercel thông thường, để trống để dùng origin backend của cùng môi trường; không sao chép giá trị `127.0.0.1:3001` từ máy local. Vai trò app được các script/config xác định tự động; không cần đặt `APP_ROLE` thủ công.

Giá trị `NEXT_PUBLIC_*` được đưa vào bản build. Sau khi đổi domain, Supabase hoặc scope môi trường, **redeploy cả hai Project** để build và runtime cùng dùng cấu hình mới; không chỉ sửa env rồi dùng lại bản build cũ. [Biến môi trường Next.js](https://nextjs.org/docs/app/guides/environment-variables).

## 4. Preview phải cho phép thiệp gọi API công khai

Backend Preview cần cho phép truy cập ẩn danh các API công khai từ frontend, kể cả request của server frontend và trình duyệt khách. Nếu Vercel Authentication/Deployment Protection chặn backend Preview, API có thể trả trang xác thực hoặc HTTP 401 trước khi request tới ứng dụng. Chọn chính sách Preview cho phép truy cập công khai backend test; `/admin` vẫn yêu cầu đăng nhập của ứng dụng. Không đưa protection bypass token vào biến `NEXT_PUBLIC_*`. [Deployment Protection](https://vercel.com/docs/deployment-protection).

## 5. Thứ tự kiểm tra trước khi dùng thật

Upload admin đi qua Vercel Function. Vercel giới hạn body request/response ở **4,5 MB**. Bản build Vercel tự giới hạn file **4 MiB** ở cả giao diện và API, chừa dung lượng cho multipart fields; local giữ mức 10 MiB. Tệp lớn hơn cần nén hoặc chia nhỏ trước khi tải. Danh sách bài nhạc được version trong catalog JSON của backend, cập nhật có chủ đích khi thêm hoặc bỏ file MP3 của frontend, nên backend serverless không cần đọc filesystem của frontend. Sau khi thêm nhạc, deploy cả hai Project cùng phiên bản. [Giới hạn payload Vercel Functions](https://vercel.com/docs/functions/limitations).

1. Hoàn tất Project settings, domain, env và Supabase test; triển khai backend Preview và frontend Preview từ cùng commit trên `develop`.
2. Mở domain backend test: `/api/health` phải trả JSON; `/admin/login` phải hiện form và đăng nhập trên chính domain backend. Kiểm tra lưu thông tin, upload ảnh và nhãn nhà trai/nhà gái.
3. Mở domain frontend test: `/groom`, `/bride` và link khách riêng. Kiểm tra mở phong bì, hero, animation, nhạc, gửi lời chúc và ticker trên desktop/điện thoại. Kiểm tra chế độ giảm chuyển động.
4. Trong Network, xác nhận request công khai đi tới backend test và không có request nào tới backend/Supabase Production. `/api/music` phải trả bài hát tải được từ domain frontend test.
5. Khi Preview đạt, triển khai cùng phiên bản với env Production: **backend trước, frontend sau**. Kiểm tra lại domain chính thức; giữ phiên bản frontend/backend tương thích khi rollback.

Chưa có domain, quyền truy cập Vercel và tài khoản môi trường nên repository chưa xác nhận được DNS, TLS, đăng nhập, dữ liệu hoặc âm nhạc trên bản Vercel thực tế.

## 6. CI trong repository

Workflow `.github/workflows/ci.yml` chạy khi mở/cập nhật PR, push `main` hoặc `develop`, và khi chạy thủ công. Nó dùng Node 24, cài lockfile riêng của từng app, chạy test, TypeScript, lint, audit source và build theo matrix frontend/backend. Job integration dùng dependency của hai app để chạy `backend/tests/integration`; không cài dependency ở gốc. Các URL/key trong job là placeholder công khai để build, không kết nối dữ liệu thật và không cần secret tài khoản.

Workflow không chạy Vercel CLI, không chứa token deploy và không tự publish. Khi bạn kết nối Git repository với Vercel, việc triển khai theo push là cơ chế riêng của Vercel. Nếu muốn bắt buộc CI đạt trước merge, chọn các check **verify (frontend)**, **verify (backend)** và **integration** trong branch protection. Khi tách repo, mỗi app đã có workflow riêng chỉ cài dependency và kiểm tra app đó.

## 7. Kiểm tra đã thực hiện tại local

Cập nhật bảo mật/thư viện ảnh ngày 22/10/2026: cần đọc `backend/docs/SECURITY.md` và `backend/docs/MEDIA_CLEANUP.md` trước rollout. Đặt `SUPABASE_SECRET_KEY` chỉ trên backend và dùng `WISH_RATE_LIMIT_SECRET` đủ mạnh; áp dụng migration 001 sau khi cấu hình khóa ở mọi backend dùng cùng database. Migration 002 bật xóa ảnh an toàn. Có file SQL Editor gộp trong `backend/supabase/sql-editor/`. Chưa tự chạy migration trên Supabase hay triển khai Vercel. 197 test đã qua (69 frontend, 76 backend, 52 tích hợp); hai migration được chạy thử trên PostgreSQL trong bộ nhớ, gồm role, RLS Storage và trigger xóa ảnh.

Ngày 22/10/2026: TypeScript, lint và audit source đạt, không còn cảnh báo lint. Mỗi app cài dependency từ lockfile riêng và build production thành công với cấu hình Vercel. Kiểm tra dev qua localhost và IP LAN xác nhận thiệp nhà trai/nhà gái, API dữ liệu, nhạc streaming/range request, CORS, form đăng nhập và ranh giới admin. Chưa tạo Project hoặc deploy lên tài khoản Vercel.

Layout được đối chiếu render trước/sau ở 8 trường hợp. Chưa đo Lighthouse trên điện thoại hoặc kiểm tra bản live Vercel, DNS và TLS.
