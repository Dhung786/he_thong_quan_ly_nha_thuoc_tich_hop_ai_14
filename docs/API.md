# API Documentation — Pharmacy AI current surface

Tài liệu này mô tả **chỉ API đang tồn tại trong source code hiện tại** của Hệ thống quản lý nhà thuốc có tích hợp AI — Nhóm 14.

## Base URL

Local Docker Compose:

```text
http://localhost:8000
```

API dùng prefix:

```text
/api/v1
```

Swagger:

```text
http://localhost:8000/docs
```

## Correlation ID

Mỗi HTTP response qua middleware có header:

```text
X-Correlation-ID: <uuid>
```

Client có thể gửi `X-Correlation-ID` UUID hợp lệ. Nếu thiếu hoặc không hợp lệ, server tạo UUID mới.

## Error envelope

Ví dụ:

```json
{
  "error": "unauthorized",
  "message": "Invalid or expired authentication",
  "correlation_id": "11111111-1111-4111-8111-111111111111"
}
```

| HTTP | Ý nghĩa |
|---|---|
| 401 | Chưa xác thực / token không hợp lệ hoặc hết hạn |
| 403 | Đã xác thực nhưng không đủ quyền |
| 404 | Resource không tồn tại |
| 409 | Conflict nghiệp vụ/dữ liệu |
| 422 | Request validation fail |
| 500 | Unexpected internal error |

401 giữ header `WWW-Authenticate: Bearer`.

## System endpoints

### `GET /api/v1/status`

Không yêu cầu authentication.

Response `200`:

```json
{
  "service": "backend",
  "status": "ok"
}
```

### `GET /health`

Không yêu cầu authentication.

Khi stack hiện tại sẵn sàng:

```json
{
  "core": "ok",
  "database": "ok",
  "migration": "0005_customer_role",
  "ai": "not_configured"
}
```

`ai=not_configured` không làm core application unhealthy.

## Roles hiện tại

Theo quyết định người dùng mới nhất, hệ thống có đúng ba role:

```text
MANAGER
PHARMACIST
CUSTOMER
```

Tên hiển thị:

- `MANAGER` → Quản lý
- `PHARMACIST` → Dược sĩ
- `CUSTOMER` → Khách hàng

`CUSTOMER` không tự động kế thừa quyền cũ của Thu ngân. Quyền nghiệp vụ chỉ được mở khi có quyết định được phê duyệt và phải enforce ở backend.

## Authentication endpoints — UC001

### `POST /api/v1/auth/login`

Request:

```json
{
  "username": "manager",
  "password": "<password>"
}
```

Response `200`:

```json
{
  "access_token": "<jwt>",
  "refresh_token": "<opaque-token>",
  "token_type": "bearer",
  "expires_in": 1800
}
```

### `POST /api/v1/auth/refresh`

Request:

```json
{
  "refresh_token": "<opaque-token>"
}
```

Refresh token hợp lệ được rotate và token cũ bị revoke.

### `POST /api/v1/auth/logout`

Request:

```json
{
  "refresh_token": "<opaque-token>"
}
```

Response `204 No Content`.

### `GET /api/v1/auth/me`

Header:

```text
Authorization: Bearer <access-token>
```

Ví dụ response:

```json
{
  "id": 1,
  "username": "customer",
  "role": "CUSTOMER",
  "is_active": true
}
```

Access token bị từ chối nếu user inactive hoặc role claim không còn khớp PostgreSQL.

## UC002 — Quản lý danh mục thuốc

Các endpoint UC002 hiện yêu cầu role `MANAGER`.

### Nhóm thuốc

```text
GET    /api/v1/catalog/groups
POST   /api/v1/catalog/groups
PUT    /api/v1/catalog/groups/{group_id}
DELETE /api/v1/catalog/groups/{group_id}
```

### Đơn vị tính

```text
GET    /api/v1/catalog/units
POST   /api/v1/catalog/units
PUT    /api/v1/catalog/units/{unit_id}
DELETE /api/v1/catalog/units/{unit_id}
```

### Thuốc

```text
GET    /api/v1/catalog/medicines
GET    /api/v1/catalog/medicines/{medicine_id}
POST   /api/v1/catalog/medicines
PUT    /api/v1/catalog/medicines/{medicine_id}
DELETE /api/v1/catalog/medicines/{medicine_id}
```

`GET /medicines` hỗ trợ các filter hiện có:

```text
q
 group_id
 unit_id
```

Các rule đã implement:

- mã thuốc không được trùng;
- group/unit phải tồn tại;
- group/unit đang được thuốc sử dụng không thể xóa;
- `PHARMACIST` và `CUSTOMER` không có quyền UC002 ở baseline hiện tại.

## Chưa công bố API nghiệp vụ

Chưa coi là hoàn tất đối với:

- UC003 — Quản lý lô nhập;
- UC004 — Bán thuốc và lập hóa đơn;
- UC005 — Quản lý nhà cung cấp;
- UC006 — Quản lý và kiểm tra tồn kho;
- UC007 — Tra cứu thuốc;
- UC008 — Cảnh báo thuốc sắp hết hạn;
- UC009 — Thống kê và báo cáo;
- UC010–UC013 — AI.

Các endpoint tiếp theo chỉ được thêm khi rule/actor/permission liên quan đủ rõ theo decision gate.
