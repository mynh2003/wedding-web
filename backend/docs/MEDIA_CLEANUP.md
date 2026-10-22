# Dọn thư viện ảnh

Thay ảnh chỉ thay liên kết trong nội dung; ảnh cũ còn nằm trong Supabase Storage cho đến khi xóa. Điều này chủ yếu tăng dung lượng lưu trữ, số bản ghi và chi phí ký/tải preview, không làm mỗi request backend tự tải toàn bộ byte ảnh.

Thư viện mới tải **24 ảnh/trang**. Màn chỉnh sửa chỉ truy vấn/ký URL cho ảnh đang gắn trong nội dung. Có nhãn **Đang dùng / Chưa dùng** và nút **Xóa vĩnh viễn**. Sau khi thay ảnh, ảnh cũ trở thành chưa dùng nếu không còn section nào tham chiếu. Hệ thống không tự động xóa ảnh cũ.

## SQL Editor

Để bật xóa ảnh, mở toàn bộ file `supabase/migrations/202610220002_safe_media_cleanup.sql`, copy vào Supabase → SQL Editor → New query → Run bằng tài khoản quản trị database. Migration này độc lập với khóa chống spam và không xóa dữ liệu sẵn có. Đã có các migration media/content trước đó thì có thể chạy lại an toàn.

Migration bổ sung `deleting_at`, index phân trang và các function/trigger. Nó kiểm tra tham chiếu trong cả nội dung đã xuất bản, bản nháp, URL ảnh cũ và `music_tracks`; chặn xóa file còn được sử dụng. Khi bắt đầu xóa, file bị đánh dấu và không thể gắn lại/xuất bản trong khi Storage đang xử lý. Database giữ khóa theo đám cưới để tuần tự hóa việc gắn ảnh và bắt đầu xóa.

Xóa diễn ra theo thứ tự:

1. Admin xác nhận xóa trong dashboard; API kiểm tra session, origin và nội dung xác nhận.
2. RPC kiểm tra quyền, tham chiếu và đánh dấu đang xóa.
3. Backend gọi **Storage API** xóa tệp.
4. RPC kiểm tra tệp đã hết trong `storage.objects` rồi mới xóa metadata.

Nếu bước 3/4 lỗi, bản ghi vẫn ở thư viện để bấm xóa thử lại. Không xóa trực tiếp SQL trên `storage.objects`: xóa dòng metadata Storage không bảo đảm xóa được byte tệp thực tế. Không chạy lại các migration policy Storage cũ sau migration này vì chúng có thể ghi đè policy mới.

Muốn xóa ảnh đang dùng: thay/gỡ ảnh khỏi tất cả section (kể cả draft), lưu nội dung rồi xóa trong thư viện. Không có nút xóa hàng loạt hoặc tự xóa file cũ để tránh mất ảnh ngoài ý muốn. Nhãn UI dựa vào nội dung vừa tải; database kiểm tra lại khi xóa, kể cả khi có người sửa ở cửa sổ khác.

## Chống spam và giới hạn thông tin

Phần này dùng migration riêng: `supabase/migrations/202610220001_backend_abuse_controls.sql`. **Trước khi chạy migration 001**, đặt `SUPABASE_SECRET_KEY` chỉ trong backend và `WISH_RATE_LIMIT_SECRET` đủ mạnh trên mọi môi trường dùng database đó (kể cả máy dev). Sau khi 001 thu hồi RPC anonymous, backend thiếu private key sẽ không gửi lời chúc được. Xem `SECURITY.md`. File `supabase/sql-editor/20261022_security_and_media.sql` gộp cả 001 và 002, dành cho khi đã cấu hình khóa.

Các file SQL đã được test trên PostgreSQL trong bộ nhớ với schema đại diện, role và trigger thật. Chưa chạy trên Supabase của bạn; vẫn cần chạy SQL và kiểm tra bằng dữ liệu test. Không có tệp thật nào bị xóa trong quá trình kiểm thử.

Nguồn: [Supabase: xóa tệp qua Storage API](https://supabase.com/docs/guides/storage/management/delete-objects).
