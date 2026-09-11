# Hệ thống quản lý nhà thuốc có tích hợp AI — Nhóm 14

Repository triển khai **Hệ thống quản lý nhà thuốc có tích hợp AI** theo SRS V1.0 của Nhóm 14 và các quyết định người dùng phê duyệt sau SRS.

## Baseline hiện tại

Quyết định mới nhất của người dùng thay actor `Thu ngân` bằng `Khách hàng`. Ba role kỹ thuật chính thức hiện tại là:

| Vai trò | Mã kỹ thuật |
| --- | --- |
| Quản lý | `MANAGER` |
| Dược sĩ | `PHARMACIST` |
| Khách hàng | `CUSTOMER` |

`CUSTOMER` **không tự động kế thừa quyền nghiệp vụ cũ của Thu ngân**. Ngoài UC001 đăng nhập/phân quyền, quyền của Khách hàng chỉ được mở khi có quyết định nghiệp vụ rõ ràng.

## Trạng thái triển khai

Đã có:

- UC001 — đăng nhập, JWT access token, refresh rotation, logout, `/me`, audit và correlation ID.
- UC002 — Quản lý danh mục thuốc cho `MANAGER`:
  - thêm/sửa/xóa/tra cứu thuốc;
  - quản lý nhóm thuốc;
  - quản lý đơn vị tính;
  - mã thuốc không được trùng;
  - nhóm thuốc/đơn vị tính đang được thuốc sử dụng không thể xóa.
- PostgreSQL + Alembic.
- React UI `/catalog` kết nối backend thật.
- Docker Compose + GitHub Actions CI.

Chưa triển khai đầy đủ: UC003–UC013. Các điểm nghiệp vụ còn mâu thuẫn hoặc chưa có quyết định không được tự suy diễn.

## Migration

Migration hiện tại:

```text
0001_foundation_metadata
0002_auth_foundation
0003_idempotency_infrastructure
0004_pharmacy_srs_baseline
0005_customer_role
```

`0005_customer_role` đổi role `CASHIER` thành `CUSTOMER` mà không sửa migration lịch sử đã áp dụng.

## Tài khoản demo local

Docker Compose mặc định tạo:

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

Các giá trị trên chỉ dành cho development và có thể override bằng biến môi trường.

## Chạy local

```bash
docker compose up -d --build
```

Sau khi stack healthy:

- Frontend: `http://localhost:5173`
- Swagger: `http://localhost:8000/docs`
- Health: `http://localhost:8000/health`

## UC002 API

```text
GET/POST       /api/v1/catalog/groups
PUT/DELETE     /api/v1/catalog/groups/{id}
GET/POST       /api/v1/catalog/units
PUT/DELETE     /api/v1/catalog/units/{id}
GET/POST       /api/v1/catalog/medicines
GET/PUT/DELETE /api/v1/catalog/medicines/{id}
```

Các endpoint UC002 yêu cầu role `MANAGER`.

## Quy tắc không tự suy diễn

Các quyết định vẫn phải được chốt riêng trước khi code module tương ứng, ví dụ:

- actor thực hiện UC004 bán thuốc và lập hóa đơn;
- quy tắc chọn lô khi bán (FEFO/FIFO/chọn tay);
- số ngày cảnh báo thuốc sắp hết hạn;
- quyền nghiệp vụ cụ thể của `CUSTOMER`.

CI chỉ được coi là VERIFIED khi workflow thực tế chạy xanh trên commit tương ứng.
