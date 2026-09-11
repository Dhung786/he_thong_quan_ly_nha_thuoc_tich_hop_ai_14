# User Guide — Giao diện hiện tại

> Hướng dẫn này khớp với UI đang có trên branch `phase2b-core-inventory`. Các module nghiệp vụ được ghi **CHƯA MỞ** trong giao diện chưa có hướng dẫn thao tác vì chưa được triển khai.

## 1. Khởi động hệ thống local

Yêu cầu:

- Docker Desktop đang chạy.
- Đã checkout branch `phase2b-core-inventory`.

Từ thư mục repository:

```bash
docker compose up -d --build
```

Kiểm tra container:

```bash
docker compose ps
```

Backend health:

```text
http://localhost:8000/health
```

Frontend:

```text
http://localhost:5173
```

## 2. Đăng nhập

Mở:

```text
http://localhost:5173/login
```

Màn hình có hai trường:

- Tên đăng nhập.
- Mật khẩu.

Với cấu hình Docker Compose development mặc định, có ba tài khoản demo local:

```text
ADMIN
Tên đăng nhập: admin
Mật khẩu: Admin123!ChangeMe

WAREHOUSE_KEEPER
Tên đăng nhập: keeper
Mật khẩu: Keeper123!ChangeMe

ACCOUNTANT
Tên đăng nhập: accountant
Mật khẩu: Accountant123!ChangeMe
```

Đây là credential **development-only**. Có thể override bằng các cặp biến môi trường `SEED_ADMIN_*`, `SEED_WAREHOUSE_KEEPER_*` và `SEED_ACCOUNTANT_*`.

Ba tài khoản trên chỉ chứng minh authentication và role identity hoạt động. User Guide **không suy diễn quyền nghiệp vụ** cho từng role khi Permission Matrix `ROLE × FR × ACTION × API` chưa được phê duyệt.

Bấm **Đăng nhập**. Khi thành công, hệ thống chuyển tới:

```text
/dashboard
```

### Khi đăng nhập lỗi

- Sai username/password: giao diện báo thông tin đăng nhập không đúng.
- Dữ liệu không hợp lệ: giao diện báo validation error.
- Service unavailable: giao diện báo dịch vụ chưa sẵn sàng.
- Nếu backend trả correlation ID, giao diện hiển thị `Mã hỗ trợ` để tra log.

Frontend không hiển thị password, JWT hay refresh token trong thông báo lỗi.

## 3. Phiên đăng nhập

Token của phiên hiện tại được lưu trong `sessionStorage`, tức là phạm vi theo tab/session trình duyệt thay vì lưu vĩnh viễn trong `localStorage`.

Frontend có cơ chế:

- kiểm tra `/api/v1/auth/me` khi khôi phục phiên;
- dùng refresh token nếu access token hết hạn;
- lên lịch refresh access token trước thời điểm hết hạn;
- tránh chạy nhiều refresh rotation đồng thời trong cùng provider instance;
- xóa phiên local nếu refresh thất bại.

Refresh token bị rotate khi refresh thành công. Logout revoke refresh token được gửi lên backend; access token JWT đã phát hành vẫn tuân theo thời hạn hết hạn của token.

## 4. Dashboard

Dashboard hiện có sidebar bên trái và vùng tổng quan ở bên phải.

### Thông tin người dùng

Sidebar hiển thị:

- role hiện tại, ví dụ `ADMIN`, `WAREHOUSE_KEEPER` hoặc `ACCOUNTANT`;
- username;
- user ID;
- nút **Đăng xuất**.

Thông tin này lấy từ backend thật qua:

```text
GET /api/v1/auth/me
```

### System health

Các card tổng quan lấy dữ liệu từ:

```text
GET /health
```

Các mục hiện có:

- **Core application** — trạng thái application.
- **PostgreSQL** — trạng thái database.
- **Migration** — Alembic revision đang applied.
- **AI provider** — trạng thái provider AI optional.

`Chưa cấu hình` ở AI provider không có nghĩa core application bị lỗi.

### Trạng thái triển khai

Dashboard hiển thị các foundation đã có như:

- Authentication + refresh rotation + logout.
- Audit + correlation ID + structured logging.
- Idempotency + transaction boundary + PostgreSQL row lock.
- Migration + backup/restore + clean Compose smoke test.

Badge `PARTIAL / BLOCKED` phản ánh rằng foundation kỹ thuật đã có nhưng nghiệp vụ kho chưa đủ nguồn phê duyệt để triển khai chính xác.

## 5. Các menu CHƯA MỞ

Hiện sidebar có các mục:

- Nhóm hàng & ĐVT.
- Hàng hóa.
- Nhà cung cấp.
- Nhập kho.
- Xuất kho.
- Tồn kho.
- Báo cáo.
- AI hỗ trợ.

Các mục này cố ý ở trạng thái **CHƯA MỞ**. Đây không phải lỗi frontend.

Lý do: trước khi mở module cần Data Dictionary, Use Case/Business Rule và Permission Matrix `ROLE × FR × ACTION × API` được phê duyệt. UI không tự suy diễn quyền hoặc schema nghiệp vụ.

## 6. Đăng xuất

Tại cuối sidebar, bấm **Đăng xuất**.

Frontend gọi:

```text
POST /api/v1/auth/logout
```

Sau đó:

- refresh token phía backend được revoke nếu đang active;
- token trong `sessionStorage` bị xóa;
- user state bị xóa;
- trình duyệt quay lại `/login`.

## 7. Kiểm tra nhanh khi demo

Một demo foundation hiện tại có thể thực hiện theo thứ tự:

1. Chạy `docker compose up -d --build`.
2. Mở `/login`.
3. Lần lượt đăng nhập bằng `admin`, `keeper`, `accountant`.
4. Với mỗi tài khoản, xác nhận `/dashboard` hiển thị đúng username và role từ backend.
5. Xác nhận Core/PostgreSQL đều `ok`.
6. Xem migration revision và trạng thái AI provider.
7. Đăng xuất.
8. Xác nhận quay lại trang login.

Việc ba role đăng nhập được không đồng nghĩa các quyền nghiệp vụ đã VERIFIED.

## 8. Khi gặp lỗi

Kiểm tra container:

```bash
docker compose ps
```

Xem log:

```bash
docker compose logs backend
```

hoặc:

```bash
docker compose logs frontend
```

Nếu UI hiển thị `Mã hỗ trợ`, dùng correlation ID đó để đối chiếu structured application log.

## 9. Giới hạn hiện tại

User Guide này không tuyên bố các chức năng master data, nhập/xuất/tồn, báo cáo hoặc AI nghiệp vụ đã hoạt động. Chúng vẫn bị chặn cho tới khi nguồn nghiệp vụ được phê duyệt đủ để triển khai mà không suy diễn requirement.
