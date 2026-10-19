# Supabase Phase 3 setup

## Tab Content trong Nội dung & hình ảnh

Mở **Admin → Nội dung & hình ảnh → Content** để sửa câu trích dẫn về hôn nhân, bốn đoạn chuyện tình yêu, lời nhắn trước form xác nhận tham dự và lời cảm ơn cuối thiệp. Chọn **Lưu & xuất bản nội dung** để cập nhật chung trên thiệp nhà trai, nhà gái và link riêng. Nội dung đang sửa được giữ khi chuyển tab; trang sẽ nhắc nếu rời đi khi chưa lưu.

Dữ liệu lưu trong section `copy` của `wedding_content` với các trường `quote_text`, `story_pages` (4 đoạn), `rsvp_text`, `thank_you_text`. Nội dung thuần văn bản; Enter được giữ để xuống dòng. Mỗi đoạn chuyện tình yêu tối đa 500 ký tự, các ô còn lại tối đa 2.000 ký tự. Để trống một ô sẽ dùng nội dung mặc định hiện tại. Không cần migration mới; lần lưu đầu tạo section này tự động bằng API admin hiện có.

## Tạm ẩn lời chúc của khách trong thùng rác

Chạy `migrations/202610180011_inactive_guest_wishes.sql` sau migration 010. Khi xóa mềm khách, lời chúc liên kết được giữ để khôi phục nhưng bị gỡ khỏi thiệp ngay trong cùng transaction. Admin thấy lời chúc trong mục **Khách trong thùng rác** và không thể duyệt hiển thị khi chưa khôi phục khách. Khôi phục chỉ hiển thị lại lời chúc vẫn được duyệt; lời chúc chờ duyệt hoặc đã ẩn vẫn không hiển thị. Lời chúc không liên kết khách không bị ảnh hưởng. Migration cũng ẩn lời chúc của khách đã ở thùng rác từ trước.

## Xóa mềm, khôi phục và xóa vĩnh viễn khách mời

Chạy lần lượt `migrations/202610180009_guest_deletion.sql` và `migrations/202610180010_linked_wish_deletion.sql` sau `202610180008_guest_attendance.sql`, trước khi triển khai mã mới. Migration bổ sung thùng rác và xử lý dữ liệu liên kết, không tự xóa khách hiện có.

- **Đang hoạt động → Xóa:** chuyển vào thùng rác, giữ thông tin, trạng thái tham dự và lời chúc. Link tạm ngừng mở thiệp và gửi phản hồi; admin không được tạo lại link hoặc chỉnh sửa khách trong thùng rác.
- **Thùng rác → Khôi phục:** đưa khách về danh sách, bật lại các link chưa bị thu hồi. Link đã thu hồi trước đó vẫn không hoạt động.
- **Thùng rác → Xóa vĩnh viễn:** chỉ cho phép với khách đã xóa mềm, xóa bản ghi khách, toàn bộ link và lời chúc liên kết trong cùng transaction. Lời chúc không liên kết với khách vẫn do admin quản lý riêng. Không thể khôi phục sau bước này.

Mỗi thao tác yêu cầu xác nhận đúng khách, đúng hành động và nhập lại mật khẩu quản trị. Backend và SQL kiểm tra quyền theo đám cưới; thao tác với cùng một khách được khóa để tránh xung đột với phản hồi hoặc tạo lại link. Danh sách, tìm kiếm và phân trang tách riêng khách đang hoạt động và khách trong thùng rác; số khách ở Tổng quan chỉ tính khách đang hoạt động.

## Xóa lời chúc liên kết khi xóa vĩnh viễn khách

Chạy `migrations/202610180010_linked_wish_deletion.sql` sau `202610180009_guest_deletion.sql`. Xóa mềm giữ lời chúc để khôi phục. Xóa vĩnh viễn khách sẽ tự xóa lời chúc có `guest_id` liên kết và bản hiển thị công khai của lời chúc đó. Lời chúc có `guest_id = null` không bị ảnh hưởng và chỉ bị xóa khi admin thao tác riêng. Migration không tự xóa dữ liệu hiện có.

## Trạng thái tham dự và phản hồi mới nhất

Chạy `migrations/202610180008_guest_attendance.sql` sau các migration hiện có, trước khi triển khai mã mới. Admin → Khách mời hiển thị **Chưa xác nhận**, **Có tham gia**, hoặc **Bận không tham gia**. Khách có link riêng gửi lại form sẽ cập nhật trạng thái và thay lời chúc cũ trong cùng transaction; lời chúc mới trở về chờ duyệt. Tạo lại link vẫn giữ phản hồi của khách. Link bị thu hồi không thể gửi phản hồi.

Form từ link chung vẫn gửi lời chúc như trước; không suy đoán danh tính bằng tên hoặc IP. Các lần gửi trước bản cập nhật chưa lưu trạng thái hay liên kết khách nên không thể tự khôi phục trạng thái từ dữ liệu đó.

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

If the server log reports `column public_wishes.side does not exist` (code `42703`), apply `migrations/202610180004_wish_sides.sql` after the earlier migrations. This adds side labels and the side-aware submission function. Until it is applied, GET `/api/wishes` falls back to approved wishes without side labels; sending side-aware wishes still requires the migration. Do not rerun older migrations over newer ones.

Run `migrations/202610170001_phase5_wishes.sql` after Phase 3 and Phase 4. This creates the public approved-wishes projection, its read policy, the submission rate limiter, and the validated `submit_public_wish` function used by `/api/wishes`. If `GET /api/wishes` returns 500, check the Next.js server log for `[api/wishes]` and confirm this migration was applied to the Supabase project configured in `.env`.

## Phase 4 token links

Run `202610160002_phase4_token_resolution.sql` after the Phase 3 migration. The app generates 32-byte random tokens on the server, stores their SHA-256 hash for public resolution. With the recoverable-link migration below, it also stores encrypted tokens so the verified administrator can reopen a link later. The public resolver returns only the guest display name and published wedding slug; it does not return token hashes or guest contact data.

## Lưu và mở lại link thiệp

Trong danh sách khách mời, **Xóa khách** và **Tạo lại link** yêu cầu xác nhận tác động và nhập lại mật khẩu quản trị cho từng thao tác. Backend kiểm tra mật khẩu của đúng tài khoản đang đăng nhập trước khi thay đổi dữ liệu; phiên xác thực tạm không thay thế phiên đăng nhập hiện tại. Không cần migration riêng cho bước xác thực này. Xóa mềm giữ lời chúc để khôi phục; xóa vĩnh viễn xóa cả lời chúc liên kết với khách. Lời chúc không liên kết với khách do admin xóa riêng. Tạo lại link giữ thông tin và phản hồi của khách.

1. Chạy toàn bộ file `migrations/202610180002_recoverable_invitation_links.sql` trong Supabase SQL Editor sau các migration hiện có. Migration bổ sung bản mã vào bảng link và hàm thay thế link trong một transaction; giữ nguyên RLS dành cho admin.
2. Trên máy chủ backend, đặt `INVITATION_LINK_ENCRYPTION_KEY` thành chuỗi 64 ký tự hex ngẫu nhiên (32 byte). Sinh bằng lệnh dưới đây, lưu trong secret của hosting và khởi động lại backend. Không dùng tiền tố NEXT_PUBLIC_. Local đã có khóa riêng trong file .env được Git bỏ qua; không đưa file này lên Git.

```sh
node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))"
```

3. Tạo khách mời mới, tải lại trang hoặc đăng nhập lại, chọn **Mở / sao chép link** rồi **Sao chép link**. Mở lại link dùng GET có kiểm tra admin và không thay đổi token. Không lưu link trong localStorage.

Token được mã hóa bằng AES-256-GCM, nonce ngẫu nhiên và gắn với wedding/guest. Chỉ API admin giải mã; public vẫn xác minh bằng hash. Sao lưu khóa an toàn và dùng cùng khóa trên mọi instance backend. Thay hoặc mất khóa sẽ khiến các link đã lưu không mở lại được, dù link khách đang giữ vẫn hoạt động.

Link cũ chỉ có hash không thể tự chuyển thành link có thể khôi phục. Chúng vẫn hoạt động bình thường. Nếu còn giữ URL cũ trong tin nhắn, có thể tiếp tục dùng URL đó. Nếu đã mất, admin phải chủ động tạo lại một lần (link cũ bị thu hồi); từ đó link mới được lưu để mở lại. GET không tự tạo lại hay thu hồi link.

Nút **Tạo lại link** thay token và thu hồi link cũ trong cùng transaction. Nếu lưu link mới thất bại, link cũ không bị thu hồi. Cần triển khai migration trước mã backend mới.
