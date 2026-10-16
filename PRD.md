# **PRD & Implementation Plan — Wedding Invitation Website**

Tài liệu yêu cầu sản phẩm và kế hoạch triển khai website thiệp cưới online. Dùng làm tài liệu gốc để Codex thực hiện theo từng phase.

* **Trạng thái:** Draft v1.1 (Đã bổ sung Yêu cầu & Hiệu ứng UI/UX cao cấp từ Shopify Themes)  
* **Ngôn ngữ giao diện:** Tiếng Việt  
* **Định hướng:** Mobile-first, responsive, màu đỏ rượu vang (`#722F37`) và be/kem (`#FDFBF7`)

# **1\. Tổng quan sản phẩm**

Xây dựng website thiệp cưới online gồm hai khu vực chính:

1. **Public Wedding Landing Page**: Trang thiệp cưới cho khách xem, có thể cá nhân hóa tên người nhận bằng link riêng.  
2. **Admin Dashboard**: Quản lý khách mời, link thiệp, nội dung thiệp, ảnh, nhạc, lời chúc và thống kê.

## **Mục tiêu**

* Giao diện thiệp cưới thanh lịch, hiện đại, ưu tiên trải nghiệm trên điện thoại.  
* Có hai nhánh khách mời: **nhà trai** và **nhà gái**.  
* Mỗi nhánh hỗ trợ link chung và link riêng cho từng khách.  
* Link riêng hiển thị tên khách được mời.  
* Quản trị viên có thể quản lý link và thu hồi link.  
* Khách có thể gửi lời chúc; quản trị viên có thể duyệt nội dung.  
* Có thể triển khai bản đầu tiên bằng dịch vụ có gói miễn phí, không bắt buộc mua domain.

## **Ngoài phạm vi MVP**

* Trình dựng website kéo-thả tự do.  
* Thanh toán, bán template hoặc marketplace.  
* Gửi SMS/email hàng loạt.  
* Hệ thống nhiều cấp vai trò phức tạp.  
* RSVP nâng cao nếu chưa được xác nhận là yêu cầu bắt buộc.

# **2\. Công nghệ đề xuất**

| Hạng mục | Công nghệ | Mục đích |
| :---- | :---- | :---- |
| **Framework** | Next.js App Router | Routing, frontend và API trong cùng codebase |
| **Ngôn ngữ** | TypeScript | Type safety |
| **Styling** | Tailwind CSS | Responsive, mobile-first |
| **Animation / UI Effects** | Framer Motion / CSS Transitions | Hiệu ứng load lần đầu, hover, scroll reveal |
| **UI components** | shadcn/ui | Form, table, dialog, dropdown |
| **Database** | Supabase PostgreSQL | Lưu dữ liệu thiệp, khách và lời chúc |
| **Authentication** | Supabase Auth | Đăng nhập quản trị |
| **Storage** | Supabase Storage hoặc Cloudinary | Ảnh cưới và media |
| **Deploy** | Vercel | Public website |
| **Version control** | GitHub | Quản lý mã nguồn |

*Lưu ý: Gói miễn phí của bên cung cấp có thể thay đổi giới hạn, chính sách lưu trữ hoặc thời gian ngừng dự án. Kiểm tra giới hạn hiện hành trước khi public. Dùng subdomain của nền tảng deploy trong giai đoạn đầu.*

# **3\. Quy chuẩn Thiết kế & Hiệu ứng UI/UX**

Học hỏi từ các theme Shopify cao cấp, giao diện website chú trọng tính thẩm mỹ, chuyển động mượt mà nhưng đảm bảo đơn giản, dễ sử dụng cho Admin Dashboard.

## **3.1. Định hướng Mỹ thuật (Art Direction)**

* **Bảng màu chủ đạo**: Đỏ rượu vang (`#722F37`), Màu Be/Kem (`#FDFBF7`), Vàng đồng accent (`#D4AF37`).  
* **Typography**: Serif cho tên cô dâu chú rể và tiêu đề section (mang tính trang trọng); Sans-serif cho nội dung văn bản dài và Dashboard (dễ đọc).

## **3.2. Hiệu ứng Tải lần đầu & Xuất hiện (Initial Load & Entrance)**

* **Fade-up & Staggered Reveal**: Các phần tử chữ và ảnh trượt nhẹ từ dưới lên (`translate-y-4` \-\> `translate-y-0`) kết hợp mờ dần (`opacity-0` \-\> `opacity-100`) với thời gian hoãn (stagger delay) tăng dần giữa các dòng.  
* **Lớp phủ Mở thiệp (Cover Envelope / Overlay)**: Màn hình mở thiệp đầu tiên sử dụng hiệu ứng vén màn nhung / bóc phong bì kết hợp làm mờ hậu cảnh (`backdrop-blur-md`). Sau khi click "Mở thiệp", nhạc nền tự động kích hoạt và giao diện chính bắt đầu chuyển động xuất hiện.

## **3.3. Hiệu ứng Hover & Tương tác Hình ảnh**

* **Subtle Zoom-in**: Ảnh trong gallery/slideshow khi hover hoặc tap nhẹ phóng to mượt mà (`scale-105`, `duration-500 ease-out`).  
* **Elevated Shadows**: Khung ảnh và card thông tin khi hover nhấc nhẹ lên và tăng độ đổ bóng (`shadow-xl`).  
* **Glow Button**: Các nút CTA chính ("Chỉ đường", "Gửi lời chúc", "Mở thiệp") có hiệu ứng viền sáng nhẹ hoặc hiệu ứng sóng lan (ripple effect) khi hover/click.

## **3.4. Tối ưu UX Dashboard Quản trị (Admin Dashboard)**

* **Triết lý**: Minimalist, tối giản, lấy hiệu suất công việc làm trung tâm.  
* **Thẻ Chỉ số Trực quan (Card Metrics)**: Tổng khách, số link riêng, lời chúc chờ duyệt hiển thị rõ ràng với icon tinh tế.  
* **Phản hồi Tức thì (Instant Feedback)**: Nút "Tạo link" hay "Sao chép link" có toast notification/tooltip "Đã sao chép" dạng hiệu ứng mượt mà.  
* **Bố cục Tab/Sidebar rõ ràng**: Tách biệt rõ giữa Quản lý Khách mời, Duyệt Lời chúc, Cấu hình Nội dung và Thư viện Media.

# **4\. Bố cục Public Landing Page**

1. **Invitation Cover / Mở thiệp**: Gồm nút "Mở thiệp", tên khách nếu là link riêng, hiệu ứng mở phong bì.  
2. **Hero Banner**: Ảnh cưới nổi bật, hiệu ứng parallax trượt nhẹ.  
3. **Slideshow ảnh cưới**: Vuốt mượt trên mobile, hỗ trợ lazy loading.  
4. **Rich Text / Lời mời**: Đoạn giới thiệu thanh lịch.  
5. **Save the Date**: Ngày giờ rõ ràng theo định dạng tiếng Việt.  
6. **Thông tin nhà trai và nhà gái**: Chi tiết thông tin hai họ.  
7. **Wedding Details / Địa điểm tổ chức**: Địa chỉ, giờ giấc, nút "Chỉ đường" Google Maps.  
8. **Storyline**: Hành trình tình yêu theo dòng thời gian.  
9. **Timeline of Wedding**: Lịch trình các mốc sự kiện trong ngày cưới.  
10. **Dress Code**: Gợi ý màu sắc trang phục.  
11. **Album of Love**: Gallery dạng grid/masonry, hover zoom, click xem ảnh lớn.  
12. **Countdown**: Đặt ngay sau Album of Love, trước Form lời chúc. Đếm ngược ngày/giờ/phút/giây theo timezone `Asia/Ho_Chi_Minh`.  
13. **Form lời chúc**: Gửi lời chúc, tự động liên kết ID nếu đi từ link riêng, trạng thái chờ duyệt.  
14. **Image Banner / Lời cảm ơn**: Cảm ơn khách mời và đính kèm lại tên cô dâu chú rể.

*Thanh nhạc nền: Cố định góc trái phía dưới, phát 3 bài tuần tự lặp lại (chỉ phát sau tương tác của người dùng), đĩa nhạc xoay mượt mà khi đang chạy.*

# **5\. Luồng link và Bảo mật Token**

## **Các loại link**

* Link chung nhà trai (`/wedding/groom`) & nhà gái (`/wedding/bride`).  
* Link riêng (`/i/<random-token>`): Hiển thị đích danh "Trân trọng kính mời \[Tên Khách\]".

## **Yêu cầu bảo mật**

* Token sinh bằng CSPRNG ngẫu nhiên 32-byte ở server.  
* Database **chỉ lưu SHA-256 hash** của token.  
* Quản trị viên có thể thu hồi và re-generate token bất kỳ lúc nào.

# **6\. Tóm tắt Database Schema**

Bao gồm các bảng chính:

* `weddings`  
* `guest_groups`  
* `guests`  
* `invitation_links`  
* `wedding_events`  
* `wedding_content`  
* `media_assets`  
* `music_tracks`  
* `wishes`  
* `admin_users`

# **7\. Kế hoạch triển khai chi tiết theo Phase**

## **Phase 1 — Khởi tạo dự án & UI/UX Foundation**

* Setup Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui.  
* Tích hợp Framer Motion hoặc CSS transition utilities cho animation.  
* Thiết lập Design Tokens: Màu sắc (`#722F37`, `#FDFBF7`), typography, spacing, hiệu ứng hover/fade-up.  
* Tạo Layout Public & Admin responsive.  
* **Nghiệm thu**: Chạy local, dựng xong skeleton & layout token, 0 lỗi build/type.

## **Phase 2 — Landing Page & Animation Integration**

* Hoàn thiện 14 section theo đúng thứ tự.  
* Tích hợp hiệu ứng Mở thiệp (Cover Envelope opening).  
* Cài đặt hiệu ứng Staggered reveal khi cuộn trang cho các section.  
* Thêm hiệu ứng hover zoom mượt cho Album of Love.  
* Lắp đặt Countdown đặt ngay sau Album of Love.  
* Thanh nhạc nền 3 bài phát tuần tự với đĩa nhạc xoay nhẹ.  
* **Nghiệm thu**: Hiển thị đúng chuẩn UI/UX, responsive mượt trên mobile/desktop, reduced motion fallback.

## **Phase 3 — Supabase, Database & Auth**

* Migration DB, RLS policies, Supabase Auth, Server-side Data Access Layer.

## **Phase 4 — Quản lý Khách mời & Token Link**

* CRUD Khách, sinh token ngẫu nhiên, lưu SHA-256 hash, thu hồi link, render tên khách.

## **Phase 5 — Lời chúc & Thống kê Dashboard**

* Form gửi lời chúc, lưu DB (pending status), duyệt lời chúc ở Dashboard, thống kê chi tiết.

## **Phase 6 — Content & Media Management Dashboard**

* Form quản lý thông tin cưới, upload ảnh/nhạc, preview thiệp live.

## **Phase 7 — Testing & Production Deployment**

* Cross-device testing, SEO/OpenGraph, deploy Vercel, kiểm tra biến môi trường.

# **8\. Prompt khởi đầu cho Codex (Phase 1\)**

Đọc toàn bộ file PRD.md trước khi thực hiện.

Hiện tại chỉ thực hiện Phase 1 — Khởi tạo dự án và UI foundation (bao gồm setup Tailwind color tokens \#722F37, \#FDFBF7, Framer Motion/CSS transitions cho hiệu ứng load/hover, và layout base).

Trước khi sửa file, hãy kiểm tra repo và báo:

\- Công nghệ/dependency hiện có.

\- Những file cần tạo hoặc sửa.

\- Các rủi ro tương thích.

Sau đó thực hiện đúng phạm vi Phase 1, không triển khai database, authentication hoặc business logic của các phase sau.

Khi hoàn thành, chạy các lệnh kiểm tra phù hợp và báo kết quả thực tế.

# 9. Backend, Admin Authentication & Security Hardening

Mục tiêu của phần này là bảo vệ Dashboard quản trị và API, đồng thời giữ public landing page nhẹ và có khả năng phục vụ nhiều lượt truy cập trong phạm vi tài nguyên của gói deploy miễn phí. Không có hệ thống nào có thể cam kết “bảo mật tuyệt đối” hoặc “chịu mọi lượng truy cập”; cần thiết kế nhiều lớp bảo vệ, theo dõi giới hạn nhà cung cấp và kiểm thử trước khi public.

## 9.1. Ranh giới hệ thống

Tách rõ ba loại truy cập:

1. **Public landing page**: đọc nội dung thiệp đã publish, ảnh, lịch trình và countdown; không cần đăng nhập.
2. **Public write endpoints**: chỉ gồm thao tác cần thiết như gửi lời chúc; phải validate, giới hạn tần suất và không được tin dữ liệu quyền do client gửi lên.
3. **Admin Dashboard / Admin API**: bắt buộc xác thực phiên đăng nhập và kiểm tra quyền ở server cho mọi request.

Không để landing page gọi các API quản trị. Không coi việc ẩn nút hoặc bảo vệ route phía client là biện pháp bảo mật đủ dùng.

## 9.2. Đăng nhập Admin

- **Chỉ tồn tại đúng một tài khoản admin** cho toàn bộ ứng dụng trong MVP; không hỗ trợ nhiều admin, nhiều vai trò quản trị hoặc tự đăng ký công khai.
- Dùng Supabase Auth với email/password. Chỉ tạo tài khoản duy nhất này qua quy trình bootstrap/thiết lập riêng có kiểm soát; không hard-code email hoặc mật khẩu mặc định trong repository và không cung cấp endpoint công khai để tạo admin.
- **Bắt buộc xác minh email** trước khi tài khoản được phép đăng nhập và truy cập Dashboard. Chỉ chấp nhận email đã xác minh; kiểm tra trạng thái xác minh ở server, không chỉ ẩn/hiện giao diện phía client.
- Nếu cần thay đổi email, yêu cầu xác thực lại và hoàn tất quy trình xác minh email mới trước khi cập nhật.
- Khi bootstrap xong, vô hiệu hóa hoặc bảo vệ chặt quy trình tạo admin ban đầu để không thể tạo tài khoản thứ hai. Có kiểm tra ràng buộc ở tầng database/server nhằm bảo đảm chỉ có một admin được phép.
- Dùng cookie/session theo hướng dẫn chính thức của Supabase SSR cho Next.js; không tự lưu access token trong `localStorage`.
- Mọi trang admin phải xác minh session phía server trước khi trả dữ liệu riêng.
- Mọi Admin API phải kiểm tra session và quyền ở server; không chỉ dựa vào middleware hoặc client state.
- Có chức năng đăng xuất và xử lý session hết hạn.
- Có luồng quên mật khẩu/reset password an toàn, không tiết lộ email có tồn tại hay không.
- Nếu nhà cung cấp và phương thức triển khai hỗ trợ, bật MFA cho tài khoản admin; ưu tiên TOTP hoặc passkey.
- Không ghi session cookie, access token, refresh token hoặc mật khẩu vào log.
- Dùng HTTPS trên môi trường public; không triển khai trang đăng nhập qua HTTP.

## 9.3. Session và bảo vệ tài khoản

- Điều kiện cho phép vào Dashboard: có session hợp lệ **và** email đã xác minh **và** tài khoản là admin duy nhất được cấu hình. Nếu thiếu bất kỳ điều kiện nào, từ chối truy cập ở server.
- Không cho phép người dùng chưa xác minh email truy cập Admin API dù họ có session hợp lệ. Sau khi xác minh email, yêu cầu đăng nhập lại nếu session hiện tại chưa được cập nhật đáng tin cậy.

- Dùng thư viện/cách tích hợp SSR chính thức được khuyến nghị cho phiên bản Supabase hiện hành; tránh tự viết cơ chế refresh token nếu không cần.
- Cookie phiên phải có thuộc tính an toàn phù hợp như `Secure`, `HttpOnly` và `SameSite`; không tự tạo cookie xác thực bằng dữ liệu do client cung cấp.
- Khi đăng xuất, thu hồi/đóng phiên theo cơ chế được hỗ trợ và xóa cookie phía ứng dụng.
- Hạn chế thông tin chi tiết trong lỗi đăng nhập; thông báo chung cho thông tin xác thực sai.
- Bật rate limit/chống brute-force theo khả năng của Supabase Auth và/hoặc lớp bảo vệ bổ sung.
- Không xây cơ chế “khóa tài khoản vĩnh viễn” dễ bị lợi dụng để gây DoS; nếu thêm khóa tạm thời, cần giới hạn hợp lý và audit.
- Kiểm thử session hết hạn, đăng xuất, reset mật khẩu và truy cập trực tiếp URL admin khi chưa đăng nhập.

## 9.4. Authorization và Row Level Security (RLS)

- Bật RLS cho tất cả bảng có dữ liệu ứng dụng.
- Mặc định từ chối truy cập nếu chưa có policy cho phép.
- Admin chỉ được thao tác dữ liệu thuộc `wedding_id` mà tài khoản được cấp quyền.
- Không tin `wedding_id`, `role`, `guest_id`, `status` hoặc `is_admin` gửi từ client; xác định quyền từ session và dữ liệu quan hệ trong database.
- Không cho public đọc bảng `guests`, `invitation_links`, `admin_users` hoặc dữ liệu liên hệ.
- Public chỉ được đọc nội dung thiệp đã publish và các lời chúc có trạng thái `approved`.
- Public insert lời chúc chỉ được phép qua API/server action được kiểm tra; client không được tự đặt `status=approved`, `guest_id` hoặc các trường nội bộ tùy ý.
- Không dùng Supabase `service_role` key ở browser. Nếu dùng server-side service role để bypass RLS, chỉ sử dụng trong module server được bảo vệ, với kiểm tra quyền rõ ràng và thao tác tối thiểu; ưu tiên truy cập bằng session user và RLS khi có thể.
- Viết test cho phép truy cập hợp lệ và từ chối truy cập trái phép cho từng nhóm bảng quan trọng.

## 9.5. Bảo vệ API và dữ liệu đầu vào

- Validate toàn bộ body, params, query và file upload ở server bằng schema validation (ví dụ Zod).
- Chỉ chấp nhận các field được cho phép; không spread trực tiếp object client vào câu lệnh insert/update.
- Giới hạn kích thước request body, độ dài tên/lời chúc và số lượng item theo endpoint.
- Dùng parameterized queries hoặc Supabase query builder; không ghép chuỗi SQL từ input.
- Với link token, hash token nhận được ở server trước khi tìm database; không trả token hash cho client.
- Với API gửi lời chúc: giới hạn tần suất, kiểm tra độ dài, xử lý nội dung an toàn, honeypot hoặc CAPTCHA nếu bị spam; không dựa vào CAPTCHA như lớp bảo vệ duy nhất.
- Chỉ cho phép loại MIME/đuôi file và dung lượng upload đã định; xác minh file thực tế phía server khi có thể.
- Kiểm tra URL Maps và các URL cấu hình theo allowlist/validation phù hợp; tránh biến server thành proxy tùy ý.
- Không trả stack trace, SQL details, secret hoặc thông tin khách khác về client.
- Dùng status code nhất quán và thông báo lỗi không tiết lộ chi tiết nội bộ.

## 9.6. CSRF, XSS, clickjacking và headers

- Nếu xác thực dựa trên cookie, đánh giá CSRF cho các thao tác thay đổi dữ liệu; dùng `SameSite`, kiểm tra Origin/Referer và CSRF token khi phù hợp với kiến trúc.
- Không dùng GET cho thao tác tạo, sửa, xóa hoặc thu hồi link.
- Không render HTML rich text không tin cậy trực tiếp; ưu tiên nội dung có cấu trúc hoặc sanitize bằng thư viện phù hợp.
- Tránh `dangerouslySetInnerHTML` trừ khi nội dung đã được xử lý an toàn.
- Cấu hình security headers phù hợp: `Content-Security-Policy` được kiểm thử theo các nguồn ảnh/font cần thiết, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy` và chính sách chống nhúng trang (`frame-ancestors` trong CSP hoặc header tương thích).
- Không bật CSP quá chặt một cách mù quáng nếu sẽ làm hỏng ảnh, font hoặc script; kiểm thử trên production preview.
- Tránh đưa token link cá nhân vào analytics, third-party scripts hoặc referrer. Dùng `Referrer-Policy: no-referrer` cho route link cá nhân nếu phù hợp.
- Không log URL đầy đủ có token; redact token trong logging và error reporting.

## 9.7. Secrets và môi trường

- Commit file `.env.example` chỉ chứa tên biến và giá trị placeholder.
- Đưa `.env`, credential JSON, service-role key, access token và file backup chứa dữ liệu thật vào `.gitignore`.
- Tách biến public và secret; chỉ các biến có tiền tố public được phép dùng trong client.
- Dùng Environment Variables của Vercel/Supabase; không ghi secret trực tiếp vào source code, prompt, screenshot hoặc tài liệu công khai.
- Nếu secret từng bị commit hoặc lộ, rotate ngay và kiểm tra lịch sử Git; xóa khỏi file hiện tại không làm secret cũ mất hiệu lực.
- Có quy trình thiết lập admin đầu tiên không yêu cầu mật khẩu mặc định.
- Không dùng dữ liệu khách thật trong môi trường development/test nếu chưa được ẩn danh.

## 9.8. Audit log và sao lưu

- Ghi nhận các hành động quản trị quan trọng: tạo/thu hồi link, sửa nội dung, duyệt/xóa lời chúc, thay đổi quyền.
- Audit log không lưu token thô, mật khẩu, cookie hoặc dữ liệu nhạy cảm không cần thiết.
- Có cách export dữ liệu khách/lời chúc theo quyền admin.
- Kiểm tra lịch sao lưu, khả năng khôi phục và giới hạn backup của gói miễn phí đang dùng; không mặc định rằng gói free có backup/PITR đầy đủ.
- Trước thay đổi schema hoặc xóa dữ liệu, tạo bản export phù hợp.
- Định nghĩa thời hạn lưu/xóa dữ liệu khách sau đám cưới.

## 9.9. Security acceptance checklist

- [ ] Không thể mở Dashboard khi chưa đăng nhập.
- [ ] Gõ trực tiếp URL Admin API không vượt qua kiểm tra session.
- [ ] User không có quyền không thể gọi mutation admin.
- [ ] RLS từ chối đọc/sửa dữ liệu không thuộc phạm vi được cấp.
- [ ] Public không đọc được danh sách khách hoặc token hash.
- [ ] Public không thể tự duyệt lời chúc.
- [ ] Chỉ có đúng một tài khoản admin; không thể tự đăng ký hoặc tạo admin thứ hai qua API công khai.
- [ ] Admin chưa xác minh email bị từ chối truy cập Dashboard và Admin API ở phía server.
- [ ] Lời chúc vừa được duyệt có thể hiện toast trên landing đang mở mà không refresh; lời chúc pending/rejected không xuất hiện trong toast hoặc realtime payload.
- [ ] Token bị thu hồi không còn hoạt động.
- [ ] Thử XSS trong tên/lời chúc không thực thi script.
- [ ] Kiểm tra CSRF cho thao tác quản trị dùng cookie.
- [ ] Rate limit hoạt động cho login và gửi lời chúc theo khả năng triển khai.
- [ ] Không có secret trong bundle frontend, Git hoặc log.
- [ ] Session hết hạn và logout được xử lý đúng.
- [ ] Security headers được kiểm tra trên môi trường production preview.
- [ ] Có quy trình rotate secret và export/restore dữ liệu.

---

# 10. Kế hoạch hiệu năng, tải cao và ổn định

Mục tiêu là tối ưu trang thiệp công khai để phần lớn lượt xem không cần gọi database theo từng request, đồng thời bảo vệ các endpoint ghi dữ liệu. Không thể cam kết chịu “mọi lượng truy cập” trên gói miễn phí; khả năng thực tế phụ thuộc số lượt truy cập đồng thời, dung lượng ảnh, số request, giới hạn CPU/băng thông/database và điều khoản nhà cung cấp.

## 10.1. Kiến trúc ưu tiên nội dung tĩnh

- Landing page dùng Server Components khi phù hợp; chỉ dùng Client Components cho animation, slideshow, countdown, audio và form tương tác.
- Tách dữ liệu ít thay đổi (nội dung thiệp, thông tin sự kiện, gallery) khỏi dữ liệu động (gửi lời chúc).
- Với thiệp đã publish, ưu tiên static generation/ISR hoặc cache phù hợp cho nội dung công khai. Không cache response chứa dữ liệu cá nhân chưa được phép công khai.
- Khi admin cập nhật nội dung, làm mới cache theo tag/path có kiểm soát.
- Không truy vấn database riêng cho từng section nếu có thể lấy dữ liệu thiệp trong ít truy vấn hợp lý.
- Countdown chạy ở client từ thời điểm cưới đã được render; không gọi server mỗi giây.
- Không tải nhạc cho đến khi khách chủ động mở thiệp hoặc bật nhạc.
- Lazy-load ảnh phía dưới màn hình đầu tiên và gallery; preload có chọn lọc ảnh hero quan trọng.
- Dùng ảnh responsive (`srcset`/Image component phù hợp), định dạng hiện đại khi được hỗ trợ, kích thước phù hợp; tránh ảnh gốc dung lượng lớn.
- Đặt kích thước/khung ảnh để giảm layout shift (CLS).
- Hạn chế thư viện animation lớn và JavaScript không cần thiết; ưu tiên CSS cho hiệu ứng đơn giản.
- Dùng pagination cho Dashboard; không tải toàn bộ khách và lời chúc cùng lúc.

## 10.2. Chiến lược cache

- Cache nội dung thiệp đã public và asset tĩnh dài hạn khi URL có version/hash.
- Không cache trang Dashboard, API admin, response chứa session hoặc dữ liệu khách riêng tư ở cache công cộng.
- Không để CDN cache phản hồi token sai/đúng theo cách có thể làm rò dữ liệu giữa các khách.
- Nếu trang `/i/<token>` được render động, xác minh token ở server và tránh cache HTML cá nhân hóa dùng chung. Cấu hình `private/no-store` khi cần.
- Ảnh và file nhạc nên dùng URL storage/CDN phù hợp, không đi qua API Next.js để proxy từng byte.
- Đo hiệu quả cache bằng header/log/analytics của nhà cung cấp; không chỉ giả định cache đã hoạt động.

## 10.3. Ảnh, nhạc và tài nguyên tĩnh

- Chuẩn hóa ảnh upload: giới hạn dung lượng, kích thước, định dạng và số lượng.
- Tạo thumbnail/ảnh nhiều kích thước nếu dịch vụ hỗ trợ.
- Không đưa video hoặc nhạc không nén dung lượng lớn vào bundle.
- Dùng storage/CDN cho ảnh và nhạc; lưu metadata trong database.
- Thiết lập giới hạn upload và quota nội bộ để tránh một tài khoản làm đầy storage.
- Có placeholder hoặc fallback nếu media không tải được.
- Tối ưu font: chỉ tải weight cần thiết, ưu tiên self-host hoặc cách tích hợp được framework tối ưu.

## 10.4. Database và API

- Tạo index cho các cột thường truy vấn: `wedding_id`, `guest_group_id`, `guest_id`, `token_hash`, `status`, `created_at` theo truy vấn thực tế.
- Dùng pagination/cursor cho danh sách khách và lời chúc.
- Tránh N+1 queries và query toàn bảng.
- Giữ các thao tác ghi ngắn, dùng transaction khi cần đảm bảo thu hồi/tạo token nhất quán.
- Không truy vấn Supabase liên tục cho countdown, slideshow hoặc mỗi lần animation chạy.
- Thêm timeout, xử lý lỗi và retry có giới hạn cho thao tác có thể retry; không retry vô hạn khi provider lỗi.
- Public write endpoints phải có rate limit và giới hạn payload.
- Với burst traffic, xem xét queue cho tác vụ không cần hoàn thành đồng bộ; không thêm hệ thống queue phức tạp nếu MVP chưa cần.

## 10.5. Kiểm thử tải và tiêu chí hiệu năng

Trước khi public rộng rãi:
- Tạo dữ liệu test giả lập, không dùng thông tin khách thật.
- Đo trang tải lần đầu và các request quan trọng trên mạng di động.
- Kiểm tra nhiều request đọc landing page đồng thời.
- Kiểm tra burst gửi lời chúc, API lỗi và database chậm.
- Kiểm tra quota provider và cảnh báo khi gần đạt giới hạn.
- Không chạy load test lớn trên production free tier nếu chưa được nhà cung cấp cho phép; dùng môi trường staging và mức tải tăng dần.

Tiêu chí nghiệm thu đề xuất (cần đo trên môi trường thực tế):
- Không có lỗi console nghiêm trọng trong luồng xem thiệp.
- Không có layout overflow ở viewport mobile phổ biến.
- Nội dung chính hiển thị được ngay cả khi animation bị tắt.
- Trang public đã publish ưu tiên được phục vụ từ cache khi kiến trúc cho phép.
- Countdown không tạo request mạng theo từng giây.
- Danh sách Dashboard có pagination.
- Burst lời chúc bị giới hạn hợp lý và không làm lộ dữ liệu.
- Ghi nhận lỗi 4xx/5xx, độ trễ và mức sử dụng quota ở mức nhà cung cấp cho phép.

---

# 11. Kế hoạch deploy miễn phí và domain miễn phí

## 11.1. Phương án MVP đề xuất

| Thành phần | Phương án ban đầu | Điểm cần kiểm tra |
|---|---|---|
| Source code | GitHub private repository nếu gói hiện tại hỗ trợ | Quyền truy cập repository và secret scanning |
| Web hosting | Vercel Hobby hoặc nền tảng có free tier phù hợp | Điều khoản sử dụng, băng thông, build minutes, function limits |
| Database/Auth | Supabase Free | Giới hạn database, Auth, số project, trạng thái pause và backup |
| Ảnh/nhạc | Supabase Storage hoặc dịch vụ media có free tier | Dung lượng, egress, giới hạn file và quyền sử dụng |
| Domain | Subdomain do hosting cấp, ví dụ `project-name.vercel.app` | Tên subdomain có sẵn và chính sách hiện hành |
| Monitoring | Công cụ/log miễn phí tích hợp của hosting và database | Giới hạn lưu log, alert và retention |

**Quan trọng:** free tier không đồng nghĩa với uptime được đảm bảo, không giới hạn lượt truy cập hoặc luôn miễn phí trong mọi trường hợp. Kiểm tra điều khoản hiện hành trước khi chọn nhà cung cấp. Không cam kết một mức concurrent users cụ thể nếu chưa benchmark.

## 11.2. Quy trình deploy

1. Đưa code lên GitHub, không commit `.env`.
2. Tạo project Supabase và chạy migration.
3. Cấu hình Auth URL, redirect URL và site URL theo domain preview/production.
4. Cấu hình biến môi trường cho Vercel theo từng environment.
5. Deploy preview từ branch phát triển.
6. Chạy smoke tests: public landing, link chung, link cá nhân, login, CRUD khách, gửi/duyệt lời chúc.
7. Kiểm tra security headers, RLS, cache và log không chứa token.
8. Merge branch production và deploy.
9. Kiểm tra lại URL public, Open Graph preview, ảnh/nhạc, Maps và countdown.
10. Ghi lại quy trình rollback nếu deploy lỗi.

## 11.3. Environment variables

Tạo `.env.example` chỉ gồm tên biến và placeholder. Ví dụ các biến cần thiết tùy cách tích hợp:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (hoặc publishable key theo SDK hiện hành)
- `SUPABASE_SERVICE_ROLE_KEY` (chỉ khi thật sự cần; server-only)
- `NEXT_PUBLIC_SITE_URL`

Tên biến phải được đối chiếu với phiên bản SDK và cách triển khai thực tế. Không đưa secret vào biến có tiền tố `NEXT_PUBLIC_`. Không lưu giá trị thật trong tài liệu.

## 11.4. Domain miễn phí

- Dùng subdomain mặc định của hosting để không phải mua domain.
- Chọn tên project/subdomain dễ nhớ, tránh thông tin riêng tư.
- Không phụ thuộc vào domain miễn phí bên thứ ba không ổn định hoặc có điều khoản không rõ ràng.
- Khi muốn dùng domain riêng về sau, có thể mua domain và trỏ DNS mà không cần thay đổi logic link nếu URL được tạo từ `NEXT_PUBLIC_SITE_URL` cấu hình đúng.
- Không hard-code domain vào nhiều component; tạo helper duy nhất để dựng URL.

## 11.5. Vận hành khi traffic tăng

- Theo dõi quota hosting, database, storage và băng thông.
- Tối ưu cache/static delivery trước khi nâng cấp hạ tầng.
- Giảm các request database không cần thiết.
- Khi traffic vượt khả năng free tier, chọn một hoặc nhiều hướng: tối ưu thêm, dùng CDN/cache, nâng gói, hoặc tách media sang dịch vụ phù hợp.
- Không tự động tạo tài nguyên trả phí nếu chưa được chủ dự án chấp thuận.
- Chuẩn bị trang fallback/thông báo khi database tạm thời không sẵn sàng; landing đã cache có thể tiếp tục đọc được nếu kiến trúc cho phép, nhưng gửi lời chúc có thể tạm lỗi.
- Không hứa “chịu tải không giới hạn”; công bố rõ giới hạn kỹ thuật thực tế nếu cần.

---

# 12. Bổ sung Phase triển khai

Các phase hiện có được mở rộng như sau:

## Phase 3 — Supabase, Database, Auth & Security Foundation

Ngoài migration/RLS/Auth đã nêu:
- Thiết lập duy nhất một tài khoản admin an toàn.
- Bắt buộc xác minh email trước khi cho phép đăng nhập/truy cập Dashboard.
- Không có public admin signup và kiểm thử không thể tạo admin thứ hai.
- Session SSR và bảo vệ server-side route/API.
- RLS theo `wedding_id`.
- Validate input và error handling.
- Quản lý secrets và `.env.example`.
- Security headers ban đầu.
- Test truy cập trái phép và session hết hạn.

**Không chuyển sang quản lý dữ liệu thật trước khi kiểm thử auth/RLS cơ bản đạt.**

## Phase 4 — Guests & Token Links

Ngoài CRUD/token:
- Không để public đọc danh sách khách hoặc token hash.
- Kiểm tra quyền admin cho tạo/thu hồi link.
- Thêm rate limit phù hợp.
- Redact token trong log và analytics.
- Test token sai, token thu hồi, truy cập chéo wedding và brute-force cơ bản.

## Phase 5 — Wishes & Public Write API

- Validation server-side.
- Giới hạn payload và độ dài.
- Rate limit/chống spam.
- Chỉ admin duy nhất được duyệt/ẩn/xóa.
- Public chỉ đọc lời chúc đã duyệt.
- Tích hợp Supabase Realtime hoặc cơ chế push phù hợp để thông báo lời chúc mới được duyệt đến landing page đang mở; không yêu cầu tải lại trang.
- Realtime channel chỉ phát các trường công khai cần thiết và chỉ với bản ghi `approved`; không phát email, token, ID nội bộ nhạy cảm, lời chúc chờ duyệt hoặc sự kiện admin.
- Tạo toast theo hàng đợi, giới hạn tần suất hiển thị, cắt ngắn nội dung dài, chống XSS bằng render text an toàn; khi mất kết nối, tự thử kết nối lại có giới hạn và landing page vẫn hoạt động bình thường.
- Tôn trọng hiệu năng: không mở nhiều subscription trùng lặp; hủy subscription khi component unmount; cân nhắc giảm/chặn toast khi tab không hoạt động hoặc người dùng đã tắt toast.
- Test spam burst, quyền sửa trạng thái, sự kiện realtime và xác nhận rằng lời chúc chưa duyệt không bao giờ xuất hiện công khai.

## Phase 6 — Content & Media Management

- Giới hạn file upload và loại file.
- Kiểm tra quyền upload.
- Không public hóa file nội bộ.
- Xử lý rich text an toàn.
- Cache invalidation khi nội dung được publish/cập nhật.

## Phase 7 — Performance, Security Testing & Deployment

Bổ sung:
- Kiểm tra cache và response headers.
- Kiểm tra Core Web Vitals/hiệu năng mobile.
- Smoke test production.
- Load test staging có kiểm soát.
- Kiểm tra quota và phương án khi provider quá tải.
- Xác minh không lộ secret/token.
- Kiểm tra backup/export và hướng dẫn rollback.

---

# 13. Prompt cập nhật cho Codex

```text
Đọc toàn bộ PRD.md trước khi làm việc.

Yêu cầu:
- Triển khai đúng từng phase, không làm toàn bộ dự án trong một lần.
- Bảo mật Admin Dashboard phải được kiểm tra ở server; không chỉ ẩn giao diện client.
- Dùng Supabase Auth theo hướng dẫn SSR hiện hành, RLS deny-by-default và không để service-role key ở client.
- Link cá nhân dùng token ngẫu nhiên sinh ở server, database chỉ lưu hash.
- Public landing ưu tiên static/cached content; không cache response chứa dữ liệu cá nhân hóa sai phạm vi.
- Countdown chạy client-side, không gọi API theo từng giây.
- Tối ưu ảnh/media và pagination; không tuyên bố chịu tải không giới hạn.
- Dùng subdomain miễn phí của nền tảng deploy; không tự mua domain hoặc bật tài nguyên trả phí.
- Không ghi secret, cookie, session hoặc token vào log.
- Viết test cho authorization, RLS, token revoke và validation.

Trước khi sửa code:
1. Kiểm tra cấu trúc repo và dependency hiện có.
2. Đưa ra kế hoạch file sẽ tạo/sửa.
3. Nêu rủi ro bảo mật và tương thích.
4. Chỉ thực hiện phase được yêu cầu.

Sau khi thực hiện:
- Chạy lint, typecheck, test/build phù hợp.
- Báo kết quả thực tế, các test chưa chạy và việc còn tồn tại.
- Không tự nhận hệ thống bảo mật tuyệt đối hoặc chịu tải không giới hạn.
```

---

## 14. Nguồn chính thức cần kiểm tra trước khi triển khai

Các chính sách free tier và API có thể thay đổi; hãy xác minh tại thời điểm deploy:

- Next.js: https://nextjs.org/docs
- Supabase Auth SSR: https://supabase.com/docs/guides/auth/server-side
- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Pricing: https://supabase.com/pricing
- Vercel Pricing: https://vercel.com/pricing
- Vercel Security: https://vercel.com/docs/security

**Nguyên tắc cuối cùng:** ưu tiên bảo vệ admin và dữ liệu trước, tối ưu landing page để phục vụ từ cache/CDN, đo tải thực tế trên staging, và chỉ nâng cấp hạ tầng khi đã xác định được giới hạn thực sự. Không có giải pháp free nào bảo đảm bảo mật tuyệt đối hoặc khả năng chịu tải vô hạn.
