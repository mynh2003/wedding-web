# Nhạc nền thiệp cưới

Frontend phục vụ năm file MP3 trong thư mục này. Backend chọn ngẫu nhiên từ catalog của backend và trả đường dẫn `/music/...` tương đối với origin thiệp.

Khi thêm/bỏ bài, cập nhật `lib/music-catalog.generated.json` trong repo backend để khớp tên file. Hai repo không đọc filesystem của nhau khi build. Trong checkout hiện tại có thể chạy `npm --prefix backend run sync:music` từ gốc để đồng bộ catalog trước khi commit cả hai bên.

Player gọi API một lần mỗi lần tải trang, tránh bài vừa phát khi còn lựa chọn khác; phát streaming khi mở thiệp. Nếu trình duyệt chặn tự phát, bấm nút nhạc. File MP3 phải nằm trong deployment frontend.
