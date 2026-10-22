# Dashboard

Giao diện quản trị dùng chung token, nút, trường nhập và breakpoint trong `app/admin/admin.css`. Icon SVG nằm ở `components/admin-icon.tsx`; không cần tải thư viện icon hoặc ảnh trang trí từ dịch vụ ngoài.

- Desktop dùng sidebar; màn hình tối đa 760 px dùng thanh điều hướng dưới, header cố định và khoảng trống theo safe area.
- Các thao tác danh sách có icon và nhãn chữ. Nút xóa dùng màu riêng; các bước xác nhận/xác thực hiện có được giữ nguyên.
- Form thêm khách có thể mở/đóng để dành chỗ cho danh sách. Bảng khách chuyển thành thẻ trên mobile.
- Skeleton dùng chung ở `components/admin-skeleton.tsx`, có bố cục riêng cho tổng quan, khách, lời chúc, nội dung và thư viện ảnh. Không thêm thời gian chờ giả.
- Shimmer, spinner và chuyển động nút tắt theo `prefers-reduced-motion`. Input mobile dùng cỡ chữ 16 px; vùng chạm nút tối thiểu 44 px.
- Đăng nhập vẫn gửi native POST đến `/auth/login`; nút báo đang xử lý và tránh bấm lặp trong khi điều hướng. Nút hiện mật khẩu có nhãn và trạng thái cho trình đọc màn hình.

Kiểm tra ngày 22/10/2026: 44 trường hợp render component bằng dữ liệu mẫu ở 320, 390, 768 và 1440 px không tràn ngang; các nút hiển thị đều cao tối thiểu 44 px. Form thêm khách đã kiểm tra ở cả trạng thái đóng và mở. Đã đối chiếu ảnh mobile/desktop, kiểm tra giảm chuyển động và tương tác hiện/ẩn mật khẩu trên trang dev. Kiểm tra trạng thái gửi đăng nhập chặn request ngay trong trình duyệt, không đăng nhập hoặc ghi dữ liệu thử vào Supabase.

Khi kiểm tra với tài khoản thật, thử tên khách dài, chuyển bộ lọc, phân trang, xem/sao chép link, hộp thoại xác nhận, lưu nội dung và upload ảnh. Không kiểm tra xóa dữ liệu thật chỉ để xác nhận giao diện.
