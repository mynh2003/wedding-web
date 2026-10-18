# Supabase Phase 3 setup

## Lịch ngày cưới

Chạy `migrations/202610180006_wedding_calendar.sql` trong Supabase SQL Editor sau các migration hiện có. Chạy lại không ghi đè nội dung hay trạng thái xuất bản.

Trong **Nội dung & hình ảnh → Thông tin → Ngày cưới**, chọn **Ngày đánh dấu trên lịch → Từ ngày / Đến ngày**, rồi **Lưu ngày cưới**. Dãy ngày bao gồm cả hai đầu; để trống cả hai sẽ đánh dấu ngày cưới. Lịch hỗ trợ dãy ngày qua tháng/năm với nút chuyển tháng.

Trong tab **Hình ảnh → Section 4 · Lịch ngày cưới (7:6)**, tải ảnh nền JPEG/PNG/WebP tối đa 10 MB. Ảnh được cắt phủ khung 7:6, lịch và trái tim được dựng tự động trên ảnh. Các trường lưu tại `invitation.calendar_banner_media_id` và `families.calendar_start_date` / `calendar_end_date` (định dạng `YYYY-MM-DD`).

## Sửa lỗi upload “Không thể lưu file”

Sau schema Phase 3 và `202610170002_auth_admin_policy_fix.sql`, chạy toàn bộ
`migrations/202610180005_repair_media_storage.sql` trong **Supabase Dashboard → SQL Editor**
của đúng project được cấu hình bởi `NEXT_PUBLIC_SUPABASE_URL` trên backend.
Migration tạo hoặc sửa bucket private `wedding-private`, giới hạn 10MB và MIME type,
đồng thời khôi phục quyền insert/select/delete theo wedding của admin. Có thể chạy lại;
không xóa file hay metadata hiện có. Không cần thêm service key vào ứng dụng.

Đăng nhập admin, upload một ảnh JPEG/PNG/WebP, tải lại danh sách media và kiểm tra ảnh.
Nếu vẫn lỗi, xem log backend có tiền tố `[api/admin/media]`: lỗi Storage và lỗi ghi
`media_assets` được ghi riêng. API trả hướng dẫn khi thiếu bucket hoặc thiếu quyền;
không trả nguyên văn lỗi nội bộ cho trình duyệt. Kiểm tra kết nối từ backend tới
Supabase nếu log báo `fetch failed`.

## Khởi tạo phần quà mừng cưới bằng SQL Editor

Sau khi đã có schema Phase 3 và bản ghi trong `weddings`, mở **Supabase Dashboard → SQL Editor → New query**, dán toàn bộ nội dung file `migrations/202610180001_wedding_gifts.sql` và nhấn **Run**.

SQL tạo section `gifts` riêng cho mỗi đám cưới hiện có, lấy tên cô dâu/chú rể từ `weddings`. Chạy lại không ghi đè cấu hình đã lưu. Nếu vừa thêm đám cưới mới, có thể chạy lại để khởi tạo cho đám cưới đó.

Vào **Admin → Nội dung & Media → gifts**, điền các trường `bride_*` cho nhà gái và `groom_*` cho nhà trai:

- `banner_url`: URL ảnh ngang phía trên hộp thoại.
- `qr_url`: URL ảnh QR chuyển khoản.
- `bank_name`: Tên ngân hàng.
- `account_name`: Tên chủ tài khoản.
- `account_number`: Số tài khoản (chuỗi để giữ số 0 đầu).

Các hậu tố trên cần có tiền tố đầy đủ, ví dụ `bride_qr_url` và `groom_qr_url`. Ảnh dùng đường dẫn public bắt đầu bằng `/` hoặc URL `https://`. Sau khi điền đúng thông tin, bật **Publish** rồi **Lưu section**. Bản khởi tạo để ở trạng thái nháp, số tài khoản và QR để trống.

1. Create a Supabase project and copy its URL and publishable key to `.env.local`.
2. Run `migrations/202610160001_phase3_foundation.sql` in the Supabase SQL editor or through the Supabase CLI.
3. Create exactly one Auth user manually in the Supabase dashboard. Require email confirmation; do not expose signup in the app.
4. Create one `weddings` row, then insert the single mapping into `admin_users` from the SQL editor. Never put a service-role key in browser code.
5. Verify with a non-admin session that `guests`, `invitation_links` and `admin_users` are not readable, and that only published public rows are visible.

The migration deliberately does not create public insert policies for `wishes`; that endpoint belongs to Phase 5 and must add server validation and rate limiting first.

## Phase 5 public wishes

Run `migrations/202610170001_phase5_wishes.sql` after Phase 3 and Phase 4. This creates the public approved-wishes projection, its read policy, the submission rate limiter, and the validated `submit_public_wish` function used by `/api/wishes`. If `GET /api/wishes` returns 500, check the Next.js server log for `[api/wishes]` and confirm this migration was applied to the Supabase project configured in `.env`.

## Phase 4 token links

Run `202610160002_phase4_token_resolution.sql` after the Phase 3 migration. The app generates 32-byte random tokens on the server, stores their SHA-256 hash for public resolution. With the recoverable-link migration below, it also stores encrypted tokens so the verified administrator can reopen a link later. The public resolver returns only the guest display name and published wedding slug; it does not return token hashes or guest contact data.

## Lưu và mở lại link thiệp

1. Chạy toàn bộ file `migrations/202610180002_recoverable_invitation_links.sql` trong Supabase SQL Editor sau các migration hiện có. Migration bổ sung bản mã vào bảng link và hàm thay thế link trong một transaction; giữ nguyên RLS dành cho admin.
2. Trên máy chủ backend, đặt `INVITATION_LINK_ENCRYPTION_KEY` thành chuỗi 64 ký tự hex ngẫu nhiên (32 byte). Sinh bằng lệnh dưới đây, lưu trong secret của hosting và khởi động lại backend. Không dùng tiền tố NEXT_PUBLIC_. Local đã có khóa riêng trong file .env được Git bỏ qua; không đưa file này lên Git.

```sh
node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))"
```

3. Tạo khách mời mới, tải lại trang hoặc đăng nhập lại, chọn **Mở / sao chép link** rồi **Sao chép link**. Mở lại link dùng GET có kiểm tra admin và không thay đổi token. Không lưu link trong localStorage.

Token được mã hóa bằng AES-256-GCM, nonce ngẫu nhiên và gắn với wedding/guest. Chỉ API admin giải mã; public vẫn xác minh bằng hash. Sao lưu khóa an toàn và dùng cùng khóa trên mọi instance backend. Thay hoặc mất khóa sẽ khiến các link đã lưu không mở lại được, dù link khách đang giữ vẫn hoạt động.

Link cũ chỉ có hash không thể tự chuyển thành link có thể khôi phục. Chúng vẫn hoạt động bình thường. Nếu còn giữ URL cũ trong tin nhắn, có thể tiếp tục dùng URL đó. Nếu đã mất, admin phải chủ động tạo lại một lần (link cũ bị thu hồi); từ đó link mới được lưu để mở lại. GET không tự tạo lại hay thu hồi link.

Nút **Tạo lại link** thay token và thu hồi link cũ trong cùng transaction. Nếu lưu link mới thất bại, link cũ không bị thu hồi. Cần triển khai migration trước mã backend mới.
