# API Documentation — Current Implemented Surface

> Tài liệu này mô tả **chỉ API đang tồn tại trong source code hiện tại**. API nghiệp vụ kho chưa được mô tả/giả định khi Data Dictionary và Permission Matrix chưa được phê duyệt.

## Base URL

Local Docker Compose:

```text
http://localhost:8000
```

API nghiệp vụ/authentication dùng prefix:

```text
/api/v1
```

FastAPI interactive documentation khi backend đang chạy:

```text
http://localhost:8000/docs
```

## Correlation ID

Mỗi HTTP response đi qua application middleware có header:

```text
X-Correlation-ID: <uuid>
```

Client có thể gửi `X-Correlation-ID` dạng UUID hợp lệ. Nếu thiếu hoặc không hợp lệ, server tạo UUID mới.

User-facing error quan trọng trả `correlation_id` để hỗ trợ tra log mà không lộ exception nội bộ.

## Error envelope

Các lỗi chuẩn hiện dùng dạng:

```json
{
  "error": "unauthorized",
  "message": "Invalid or expired authentication",
  "correlation_id": "11111111-1111-4111-8111-111111111111"
}
```

Semantics hiện có:

| HTTP | `error` | Ý nghĩa |
|---|---|---|
| 401 | `unauthorized` | Chưa xác thực / token không hợp lệ hoặc hết hạn |
| 403 | `forbidden` | Đã xác thực nhưng không đủ quyền |
| 404 | `not_found` | Resource/route không tồn tại |
| 409 | mã conflict cụ thể | Business/state/concurrency conflict |
| 422 | `validation_error` | Request validation fail |
| 500 | `internal_error` | Unexpected internal error |

401 giữ header:

```text
WWW-Authenticate: Bearer
```

### 422 validation

422 không echo giá trị input bị từ chối. Response chỉ công khai vị trí field và loại validation:

```json
{
  "error": "validation_error",
  "message": "Request validation failed",
  "correlation_id": "11111111-1111-4111-8111-111111111111",
  "details": [
    {
      "location": ["body", "password"],
      "type": "string_too_long"
    }
  ]
}
```

## System endpoints

### `GET /api/v1/status`

Authentication: không yêu cầu.

Response `200`:

```json
{
  "service": "backend",
  "status": "ok"
}
```

### `GET /health`

Authentication: không yêu cầu.

Response `200` khi core/database/migration sẵn sàng, ví dụ:

```json
{
  "core": "ok",
  "database": "ok",
  "migration": "0003_idempotency_infrastructure",
  "ai": "not_configured"
}
```

Có thể trả `503` khi database hoặc migration visibility không sẵn sàng. AI là optional provider; `not_configured` không làm core warehouse system unhealthy.

## Authentication endpoints

### `POST /api/v1/auth/login`

Authentication: không yêu cầu.

Request:

```json
{
  "username": "admin",
  "password": "<password>"
}
```

Validation hiện tại:

- `username`: 1–100 ký tự.
- `password`: 1–256 ký tự.

Response `200`:

```json
{
  "access_token": "<jwt>",
  "refresh_token": "<opaque-token>",
  "token_type": "bearer",
  "expires_in": 1800
}
```

Possible statuses:

- `200` — đăng nhập thành công.
- `401` — credentials không hợp lệ hoặc user inactive.
- `422` — request validation fail.

Security notes:

- Password được verify bằng password hash an toàn; plaintext password không lưu DB.
- Raw refresh token không lưu DB; persistence dùng token hash.
- Login success được audit với correlation ID.

### `POST /api/v1/auth/refresh`

Authentication: refresh token trong request body.

Request:

```json
{
  "refresh_token": "<opaque-token>"
}
```

Response `200`: token pair mới có cùng schema với login.

Behavior:

- Refresh token hợp lệ được rotate.
- Token cũ bị revoke sau rotation.
- Replay token cũ bị từ chối.

Possible statuses:

- `200` — rotation thành công.
- `401` — refresh token invalid/revoked/expired hoặc user không còn active.
- `422` — request validation fail.

### `POST /api/v1/auth/logout`

Request:

```json
{
  "refresh_token": "<opaque-token>"
}
```

Response:

```text
204 No Content
```

Logout revoke refresh token nếu token đang active. Gọi logout với token không tồn tại/đã revoke không làm thay đổi stock hay nghiệp vụ khác.

### `GET /api/v1/auth/me`

Authentication:

```text
Authorization: Bearer <access-token>
```

Response `200`:

```json
{
  "id": 1,
  "username": "admin",
  "role": "ADMIN",
  "is_active": true
}
```

Possible statuses:

- `200` — access token hợp lệ và user active.
- `401` — thiếu/invalid/expired JWT, user inactive, hoặc role claim không còn khớp DB.

## Roles currently defined

Hệ thống chỉ định nghĩa ba role:

```text
ADMIN
WAREHOUSE_KEEPER
ACCOUNTANT
```

Generic backend role guard đã tồn tại, nhưng **business action permission mapping chưa được gán** vì cần Permission Matrix `ROLE × FR × ACTION × API` được phê duyệt.

## API chưa được triển khai

Chưa công bố business endpoint cho:

- Nhóm hàng / ĐVT.
- Hàng hóa.
- Nhà cung cấp.
- Phiếu nhập / tồn đầu kỳ.
- Phiếu xuất.
- Tồn kho / thẻ kho.
- Cảnh báo.
- Báo cáo / Excel / PDF.
- AI nghiệp vụ.

Các endpoint này chỉ được bổ sung sau khi schema, Business Rule và permission tương ứng có nguồn phê duyệt.
