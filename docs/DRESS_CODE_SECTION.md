# Dress Code — revealed-image

Tham khảo: https://impact-theme-sound.myshopify.com/ (kiểm tra HTML, CSS và JavaScript công khai ngày 17/10/2026).

Mẫu dùng ô ảnh mở từ `inset(37% 37% 41% 37%)`, ảnh di chuyển từ `translate(-10%, -1.5%) scale(1.4)` về vị trí gốc. Hai lớp chữ tối và sáng chồng khít, lớp sáng dùng cùng clip-path với ảnh. Chữ hiện trong 25% tiến trình đầu.

Triển khai tại `components/dress-code.tsx`, CSS tại `app/globals.css`. Dùng Framer Motion useScroll/useTransform để chạy trên cả trình duyệt không hỗ trợ CSS view timeline. Ảnh và chữ sáng mở cùng một mask; chữ DRESS CODE dùng Playfair Display 800. Vùng cuộn 260svh, sticky 100svh, giữ canvas 430px. Bảng màu trượt lên sau khi ảnh mở hoàn tất. Cuộn ngược đảo lại hiệu ứng.

Với prefers-reduced-motion, hiển thị ảnh, chữ và bảng màu ngay, vùng chỉ cao 100svh. Không thay đổi luồng mở phong bì và hero.
`nSửa lỗi theo dõi cuộn: truyền container `.mobile-landing` cho useScroll vì body bị khóa cuộn. Đã kiểm tra trên trình duyệt local: clip-path thay đổi từ 37% xuống 0%, stage giữ top 0 khi sticky và bảng màu bắt đầu trượt lên.
