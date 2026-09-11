# Change Request — Quản trị hệ thống cho vai trò Quản lý

## Nguồn yêu cầu

Yêu cầu bổ sung được người dùng phê duyệt sau khi SRS V1.0 nhà thuốc đã được chọn làm baseline: **“thêm các chức năng của 1 admin nên có”**.

## Quan hệ với SRS

SRS hiện tại xác định ba vai trò: Quản lý, Dược sĩ và Thu ngân. Quản lý có phạm vi quản lý cao nhất, nhưng SRS không định nghĩa một Use Case riêng cho quản trị tài khoản. UC001 chỉ nêu điều kiện tài khoản đã tồn tại và trường hợp tài khoản bị khóa.

Vì vậy thay đổi này **không tạo role thứ tư**. Vai trò `MANAGER` được dùng như admin nghiệp vụ của một nhà thuốc.

## Phạm vi bổ sung

Chỉ `MANAGER` được phép:

- xem tổng quan tài khoản;
- xem danh sách tài khoản;
- tạo tài khoản mới;
- gán một trong ba vai trò `MANAGER`, `PHARMACIST`, `CASHIER`;
- khóa/mở khóa tài khoản;
- đặt lại mật khẩu;
- xem nhật ký audit gần nhất.

## Quy tắc an toàn

- Không cho phép Quản lý tự khóa chính mình.
- Không cho phép Quản lý tự hạ vai trò của chính mình khỏi `MANAGER`.
- Khi tài khoản bị khóa, đổi vai trò hoặc đặt lại mật khẩu, refresh token đang hoạt động của tài khoản đó bị thu hồi.
- Mật khẩu không được ghi vào audit log.
- Không xóa cứng tài khoản để giữ lịch sử tham chiếu và audit.

## Ngoài phạm vi thay đổi này

- Không thêm role mới ngoài ba role của SRS.
- Không tự suy diễn quyền cho UC003–UC013.
- Không đưa secret/AI API key vào màn hình quản trị này.
