# Technical Architecture — Current Implemented System

> Tài liệu này mô tả kiến trúc **đang tồn tại trong source code hiện tại**. Nó không định nghĩa thêm Business Rule, Data Dictionary hoặc Permission Matrix.

## 1. Runtime topology

Docker Compose hiện dựng ba service chính:

```text
Browser
  |
  v
Frontend (React/Vite :5173)
  |
  | HTTP JSON
  v
Backend (FastAPI :8000)
  |
  | SQLAlchemy async / asyncpg
  v
PostgreSQL 17 (:5432)
```

Backend startup trong Compose chạy theo thứ tự:

```text
alembic upgrade head
  -> python -m app.seed
  -> uvicorn app.main:app
```

Mục đích là không serve application trước khi migration/seed foundation hoàn tất.

## 2. Frontend architecture

Thư mục chính:

```text
frontend/src/
  App.tsx
  main.tsx
  auth/
    AuthProvider.tsx
    RequireAuth.tsx
    auth-context.ts
    session-timing.ts
  lib/
    api.ts
  pages/
    LoginPage.tsx
    DashboardPage.tsx
```

### Routing

`App.tsx` hiện có:

```text
/login      public
/dashboard  protected by RequireAuth
```

Root và route chưa biết redirect về dashboard; `RequireAuth` quyết định chuyển user chưa xác thực về login.

### Authentication state

`AuthProvider` chịu trách nhiệm:

- login qua backend;
- gọi `/api/v1/auth/me` để xác nhận session;
- lưu access/refresh token trong `sessionStorage`;
- không dùng `localStorage` cho token;
- bootstrap session khi reload/tab còn sống;
- refresh access token khi cần;
- lên lịch refresh sớm trước expiry;
- dùng một refresh promise đang chạy để tránh rotation đồng thời trong cùng provider instance;
- revoke refresh token khi logout;
- xóa local session nếu refresh không thành công.

`session-timing.ts` tách math về expiry/refresh delay thành hàm thuần để có thể unit test bằng Vitest.

### API client

`frontend/src/lib/api.ts` là adapter HTTP hiện tại cho:

- login;
- refresh;
- logout;
- current user;
- health.

`ApiError` chỉ giữ metadata an toàn cần cho UX/support:

- HTTP status;
- public error code;
- public message;
- correlation ID.

### Frontend business boundary

Frontend hiện **không xử lý tồn kho** và chưa có business CRUD. Sidebar chỉ hiển thị placeholder `CHƯA MỞ` cho các module chưa đủ source requirement.

## 3. Backend architecture

Các lớp hiện tại tuân theo hướng:

```text
FastAPI route/controller
  -> service
  -> repository
  -> SQLAlchemy AsyncSession
  -> PostgreSQL
```

Business rule không được đặt vào repository; controller không trực tiếp cập nhật tồn kho.

### `app/api`

Hiện có authentication routes và dependencies:

- `auth.py` — login, refresh, logout, me;
- `deps.py` — current-user dependency và generic role guard.

### `app/services`

Service layer hiện chứa authentication và technical primitives như audit/idempotency. Service là nơi orchestration/transaction business command sẽ được nối khi domain schema được phê duyệt.

### `app/repositories`

Repository layer chịu trách nhiệm persistence/query. Các query cần lock dùng SQLAlchemy/PostgreSQL `FOR UPDATE`; repository không tự quyết Business Rule.

### `app/models`

Domain hiện mới có technical/foundation models như:

- roles/users;
- refresh tokens;
- audit logs;
- idempotency records;
- system metadata foundation.

Schema nghiệp vụ kho chưa được tạo khi Data Dictionary chính thức chưa khả dụng.

## 4. Authentication flow

### Login

```text
POST /api/v1/auth/login
  -> lookup user + role
  -> verify password hash
  -> create JWT access token
  -> generate opaque refresh token
  -> persist only refresh-token hash
  -> audit login success
  -> commit
  -> return token pair
```

### Refresh

```text
POST /api/v1/auth/refresh
  -> SHA-256 raw refresh token
  -> SELECT token ... FOR UPDATE
  -> reject missing/revoked/expired token
  -> verify user still active
  -> revoke old token
  -> create replacement refresh record
  -> audit rotation
  -> commit
  -> return new token pair
```

Locking refresh-token row prevents two rotations from safely treating the same token as independently valid.

### Current user

```text
Authorization: Bearer <JWT>
  -> decode JWT
  -> read user + role from PostgreSQL
  -> require active user
  -> require role claim still matches DB role
```

### Logout

Logout locks the refresh-token record, revokes it when active, writes audit event, then commits.

## 5. Authorization foundation

Exactly three role names are defined:

```text
ADMIN
WAREHOUSE_KEEPER
ACCOUNTANT
```

Backend has generic `require_roles(...)` / `enforce_roles(...)` primitives.

The system intentionally does **not** map business actions to these roles yet. That mapping requires the approved `ROLE × FR × ACTION × API` Permission Matrix.

## 6. Error boundary

Global FastAPI handlers normalize public errors.

Current public semantics:

```text
401 unauthorized
403 forbidden
404 not_found
409 business/state/concurrency conflict
422 validation_error
500 internal_error
```

Important behavior:

- user-facing errors carry correlation ID;
- 401 preserves `WWW-Authenticate: Bearer`;
- validation 422 publishes location/type but not rejected input;
- unexpected error response does not expose stack trace/SQL/internal exception detail.

## 7. Correlation and structured logging

`CorrelationIdMiddleware`:

- accepts incoming valid UUID correlation ID;
- creates UUID4 when missing/invalid;
- stores ID in request state;
- binds it to logging context;
- returns `X-Correlation-ID` response header;
- writes request completion/failure metadata.

Structured logging uses a whitelist approach. Request body, Authorization header, password, JWT and refresh token are not automatically serialized into log output.

## 8. Database and migrations

Current Alembic chain:

```text
0001_foundation_metadata
  -> 0002_auth_foundation
  -> 0003_idempotency_infrastructure
```

PostgreSQL is the runtime source of truth. Application startup does not use `create_all()` as a replacement for migrations.

`/health` checks:

- database reachability;
- current `alembic_version` visibility;
- optional AI configuration state.

## 9. Transaction primitive

`transaction_boundary()` provides an explicit all-or-nothing boundary for future commands.

Tests cover:

- commit on success;
- rollback on exception;
- protection against unintended nested use.

This primitive is not itself a stock Business Rule. Future nhập/xuất commands must bind their authoritative state transition and stock mutation inside the same transaction.

## 10. Idempotency primitive

Technical table `idempotency_records` provides a unique identity based on:

```text
scope + idempotency_key
```

Current behavior includes:

- request payload hashing;
- first-request claim;
- replay recognition;
- reject same key with different input;
- completion state;
- transaction rollback removes an unfinished claim when the command fails;
- two-session concurrency test.

`idempotent_command()` packages claim + command + completion into the same transaction pattern.

It is not yet bound to a stock-changing endpoint because those endpoints are blocked by missing domain contract.

## 11. Row-lock primitive

A generic PostgreSQL helper performs:

```text
SELECT ... FOR UPDATE
```

with IDs:

- deduplicated;
- sorted ascending before locking.

Integration tests include real two-session lock contention: a competing transaction cannot acquire the same row lock while the first transaction holds it, then succeeds after release.

The required stock scenario `initial 100, concurrent 80 + 80` is **not** claimed because inventory quantity/schema semantics remain blocked.

## 12. Audit foundation

`AuditEvent` standardizes technical fields for current and future events, including:

- event/entity type;
- entity ID;
- actor user ID;
- correlation ID;
- previous/new state when applicable;
- reason when applicable;
- stock delta placeholder when applicable.

`stock_delta` is intentionally not forced into an inventory numeric type before the approved quantity semantics exist.

## 13. Backup and restore

Cross-platform Python scripts call PostgreSQL tools through Docker Compose:

```text
scripts/backup_db.py
scripts/restore_db.py
```

Restore requires an explicit confirmation flag.

CI executes a real recovery drill:

```text
create probe value 42
  -> backup
  -> delete probe
  -> restore
  -> verify value 42
```

## 14. CI quality gate

GitHub Actions currently has four independent jobs:

### Backend

- install dependencies;
- Ruff;
- mypy;
- Alembic upgrade from empty PostgreSQL;
- seed;
- pytest.

### Frontend

- npm install;
- ESLint;
- TypeScript typecheck;
- Vitest;
- Vite production build.

### Backup/restore

Runs the recovery drill against disposable PostgreSQL.

### Compose smoke

From a clean environment:

- build/start PostgreSQL + backend + frontend;
- wait for health;
- verify migration revision;
- verify seeded login → me → logout;
- verify frontend HTTP 200;
- verify DB migration table;
- tear down including volumes.

## 15. OpenAPI

FastAPI `/docs` and `/openapi.json` publish the implemented contract.

Current OpenAPI tests verify:

- password request field is `writeOnly`;
- refresh-token request field is `writeOnly`;
- login includes documented 401/422 responses;
- `/me` documents 401;
- `/health` documents 503.

Markdown API reference is in `docs/API.md`.

## 16. Security configuration boundary

Development may use an explicit insecure JWT placeholder to keep local onboarding deterministic.

When `APP_ENV=production`, configuration rejects the known development JWT placeholder values already present in repository templates/defaults. Real secrets are not committed to source control.

## 17. Intentionally unimplemented domain layer

The following remain unavailable until approved domain evidence exists:

- Nhóm hàng / ĐVT CRUD;
- Hàng hóa CRUD and exact quantity/price fields;
- Nhà cung cấp CRUD;
- Phiếu nhập and `TON_DAU_KY`;
- Phiếu xuất;
- stock balance/card/history;
- cancellation rules tied to documents;
- alerts and reconciliation;
- reports / Excel / PDF;
- business AI adapter/logging contract;
- business permission mapping per role.

This boundary is intentional: technical architecture must support the future implementation without converting assumptions into official requirements.
