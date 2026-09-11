# User Guide — Pharmacy AI hiện tại

Hướng dẫn này khớp với baseline nhà thuốc dùng ba vai trò **Quản lý, Dược sĩ, Khách hàng**. Các chức năng chưa được phê duyệt hoặc chưa triển khai sẽ không được mô tả như đã hoạt động.

## 1. Khởi động local

Yêu cầu: Docker Desktop/Docker Engine đang chạy.

```bash
docker compose up -d --build
```

Kiểm tra:

```bash
docker compose ps
curl http://localhost:8000/health
```

Frontend:

```text
http://localhost:5173
```

Swagger:

```text
http://localhost:8000/docs
```

## 2. Đăng nhập — UC001

Mở:

```text
http://localhost:5173/login
```

Development defaults:

```text
Quản lý
username: manager
password: Manager123!ChangeMe

Dược sĩ
username: pharmacist
password: Pharmacist123!ChangeMe

Khách hàng
username: customer
password: Customer123!ChangeMe
```

Đây là credential development-only. Có thể override bằng:

```text
SEED_MANAGER_USERNAME / SEED_MANAGER_PASSWORD
SEED_PHARMACIST_USERNAME / SEED_PHARMACIST_PASSWORD
SEED_CUSTOMER_USERNAME / SEED_CUSTOMER_PASSWORD
```

Đăng nhập thành công chuyển tới `/dashboard`.

## 3. Vai trò hiện tại

Backend sử dụng:

```text
MANAGER
PHARMACIST
CUSTOMER
```

Frontend hiển thị tương ứng:

- Quản lý;
- Dược sĩ;
- Khách hàng.

Khách hàng **không tự động kế thừa quyền cũ của Thu ngân**. Việc đăng nhập được chỉ chứng minh UC001 hoạt động; các quyền nghiệp vụ phải được backend kiểm tra theo contract đã phê duyệt.

## 4. Phiên đăng nhập

Frontend dùng `sessionStorage` cho phiên trình duyệt hiện tại và có cơ chế:

- gọi `/api/v1/auth/me` để khôi phục user;
- refresh access token bằng refresh token;
- rotation refresh token;
- logout revoke refresh token;
- xóa local session nếu refresh thất bại.

## 5. Dashboard

Dashboard hiển thị:

- username;
- role;
- user ID;
- Core application;
- PostgreSQL;
- Alembic migration;
- trạng thái AI provider.

Migration mới nhất của baseline role hiện tại là:

```text
0005_customer_role
```

## 6. UC002 — Quản lý danh mục thuốc

UC002 hiện chỉ mở cho **Quản lý (`MANAGER`)**.

Từ dashboard, Quản lý chọn:

```text
UC002 · Danh mục thuốc
```

Trang `/catalog` cho phép:

- thêm/sửa/xóa nhóm thuốc;
- thêm/sửa/xóa đơn vị tính;
- thêm/sửa/xóa thuốc;
- tìm thuốc theo mã hoặc tên;
- lọc theo nhóm/đơn vị tính ở API hiện tại.

Thuốc tối thiểu có:

- mã thuốc;
- tên thuốc;
- nhóm thuốc;
- đơn vị tính.

Rule hiện đã enforce:

- mã thuốc không được trùng;
- group/unit phải tồn tại;
- group/unit đang được thuốc sử dụng không thể xóa;
- Dược sĩ và Khách hàng truy cập UC002 API sẽ bị từ chối `403`.

## 7. Các UC chưa coi là hoàn tất

Các module sau vẫn ở trạng thái chưa triển khai đầy đủ hoặc còn decision gate:

- UC003 — Quản lý lô nhập;
- UC004 — Bán thuốc và lập hóa đơn;
- UC005 — Nhà cung cấp;
- UC006 — Tồn kho;
- UC007 — Tra cứu thuốc;
- UC008 — Cảnh báo hết hạn;
- UC009 — Thống kê/báo cáo;
- UC010–UC013 — AI.

Đặc biệt chưa tự quyết:

- ai được thực hiện UC004;
- FEFO/FIFO/chọn tay khi bán theo lô;
- số ngày cảnh báo sắp hết hạn;
- quyền nghiệp vụ của Khách hàng ngoài UC001.

## 8. Đăng xuất

Bấm **Đăng xuất** ở sidebar. Frontend gọi:

```text
POST /api/v1/auth/logout
```

Sau đó refresh token được revoke nếu đang active, local session bị xóa và trình duyệt quay về `/login`.

## 9. Demo nhanh

1. Chạy `docker compose up -d --build`.
2. Mở `/login`.
3. Đăng nhập lần lượt `manager`, `pharmacist`, `customer`.
4. Xác nhận dashboard hiển thị đúng vai trò.
5. Với `manager`, mở `/catalog` và kiểm thử UC002.
6. Với `pharmacist` hoặc `customer`, xác nhận UC002 không được mở.
7. Kiểm tra `/health` trả core/database `ok` và migration `0005_customer_role`.
8. Đăng xuất.

## 10. Khi gặp lỗi

```bash
docker compose ps
docker compose logs backend
docker compose logs frontend
```

Nếu UI hiển thị `Mã hỗ trợ`, dùng correlation ID đó để đối chiếu structured log.
