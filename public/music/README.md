# Nhạc nền thiệp cưới

Đặt các file MP3 vào thư mục `public/music` (không đặt trong `lib/music`).
API tự nhận các file `.mp3` trực tiếp trong thư mục, không cần cấu hình danh sách.
Hiện có `le-duong.mp3` — Lễ đường. Có thể thêm 4 bài nữa để có 5 bài.
Khi deploy, cần đưa các file nhạc vào cùng bản deploy.

Mỗi lần tải trang, player gọi `GET /api/music` một lần để chọn ngẫu nhiên
một trong các bài có sẵn (không cache). Bài được giữ trong bộ nhớ và phát lặp lại.
Bật/tắt nhạc không gọi lại API. Reload sẽ random lại, có thể trùng bài cũ.
Nhạc bắt đầu khi mở thiệp; nếu trình duyệt chặn tự phát, bấm nút nhạc.
