# Hệ thống quản lý nhà thuốc có tích hợp AI — Nhóm 14

Repository này triển khai theo **Đặc tả yêu cầu ứng dụng V1.0 — Hệ thống quản lý nhà thuốc có tích hợp AI, Nhóm 14**. Baseline kho cũ đã được thay thế trên branch `phase-pharmacy-srs-baseline`.

## Trạng thái hiện tại

`IMPLEMENTED / NOT YET VERIFIED` cho baseline mới cho tới khi GitHub Actions của branch/PR này chạy xanh.

Đã triển khai:

- UC001 — Đăng nhập và phân quyền.
- Ba vai trò nghiệp vụ: Quản lý (`MANAGER`), Dược sĩ (`PHARMACIST`), Thu ngân (`CASHIER`).
- JWT access token, refresh rotation, logout, audit và correlation ID từ foundation kỹ thuật trước đó.
- UC002 — Quản lý danh mục thuốc dành cho Quản lý:
  - thêm/sửa/xóa/tra cứu thuốc;
  - quản lý nhóm thuốc;
  - quản lý đơn vị tính;
  - mã thuốc không được trùng;
  - nhóm thuốc/đơn vị tính đang được thuốc sử dụng không thể xóa.
- PostgreSQL + Alembic migration `0004_pharmacy_srs_baseline`.
- React UI `/catalog` kết nối backend thật.

Chưa triển khai: UC003–UC013. Không tự thêm trường nghiệp vụ mà SRS chưa định nghĩa cụ thể.

## Quy ước role kỹ thuật

| SRS | Mã kỹ thuật |
| --- | --- |
| Quản lý | `MANAGER` |
| Dược sĩ | `PHARMACIST` |
| Thu ngân | `CASHIER` |

## Tài khoản demo local

Docker Compose mặc định tạo:

```text
Quản lý
username: manager
password: Manager123!ChangeMe

Dược sĩ
username: pharmacist
password: Pharmacist123!ChangeMe

Thu ngân
username: cashier
password: Cashier123!ChangeMe
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

Các endpoint UC002 yêu cầu role `MANAGER` theo đặc tả UC002.

## Điểm chưa rõ trong chính SRS

SRS có một số mapping tác nhân chưa thống nhất, ví dụ phần mô tả Thu ngân nói thực hiện bán thuốc/lập hóa đơn nhưng bảng mapping Use Case không gán UC004 cho Thu ngân; UC005 cũng có khác biệt giữa bảng mapping và phần đặc tả chi tiết. Những điểm này được giữ ở trạng thái chưa quyết định, không tự suy diễn quyền cho các Use Case liên quan.

## Kiểm thử / CI

CI kiểm tra backend lint/typecheck/migration/seed/pytest, frontend lint/typecheck/test/build, backup/restore và clean Docker Compose smoke test. Compose smoke test của baseline mới còn kiểm tra đăng nhập Quản lý và tạo dữ liệu UC002 thật.
