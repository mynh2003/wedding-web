# Tài nguyên hỗ trợ

- `prompts/`: prompt tạo hình; ảnh runtime ở frontend/public.
- `design/`, `PRD.md`: yêu cầu sản phẩm và tham chiếu UI.
- `docs/`: hướng dẫn triển khai hai dịch vụ.

Hai app không import hay cần thư mục này để cài đặt, chạy hoặc build.

Test và công cụ kỹ thuật nằm trong `frontend/tests`, `frontend/scripts`, `backend/tests`, `backend/scripts` theo app sở hữu. Test tích hợp giữa hai app nằm trong `backend/tests/integration`, chỉ chạy khi checkout có cả hai app.
