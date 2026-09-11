# Hệ thống Quản lý Kho tích hợp AI — Đề tài 14

Repository triển khai theo **MASTER PROMPT V2.0** với PostgreSQL là source of truth và nguyên tắc không tự suy diễn business rule/permission còn thiếu.

## Trạng thái hiện tại

- Phase 0 audit: **PARTIAL** — Master Prompt và repository đã audit; baseline Phase 1 chính thức vẫn chưa truy xuất được.
- Phase 2A foundation: authentication, refresh rotation/revocation, generic RBAC guard, migration, seed, common error handling, structured logging/correlation ID đã có execution evidence.
- Phase 2B technical readiness: transaction boundary, idempotency, PostgreSQL row locking, audit helper, backup/restore, health/migration visibility đã có execution evidence.
- Frontend: login thật, protected route, dashboard thật, `/me`, `/health`, logout và session refresh foundation.
- Business modules: **BLOCKED** khi còn thiếu approved Data Dictionary/Use Case/Permission Matrix. Không tự suy diễn quyền theo role hoặc kiểu dữ liệu tồn kho.

Trạng thái tổng thể vẫn là **PARTIAL / NOT COMPLETE**.

## Stack

- Frontend: React + TypeScript + Vite + React Router + TanStack Query + React Hook Form + Zod + Tailwind CSS.
- Backend: Python 3.12 + FastAPI + Pydantic + SQLAlchemy 2 + Alembic.
- Database: PostgreSQL 17.
- DevOps: Docker Compose + GitHub Actions.

## Chạy nhanh bằng Docker Compose

Yêu cầu: Docker Desktop/Docker Engine đang chạy.

Tại thư mục repository:

```bash
docker compose up -d --build
```

Kiểm tra service:

```bash
docker compose ps
```

Các địa chỉ local:

- Frontend: `http://localhost:5173`
- Login: `http://localhost:5173/login`
- Backend health: `http://localhost:8000/health`
- FastAPI docs: `http://localhost:8000/docs`

### Tài khoản development local

Docker Compose development mặc định seed ba tài khoản demo, tương ứng đúng ba role được Master Prompt quy định:

```text
ADMIN
username: admin
password: Admin123!ChangeMe

WAREHOUSE_KEEPER
username: keeper
password: Keeper123!ChangeMe

ACCOUNTANT
username: accountant
password: Accountant123!ChangeMe
```

Đây là **development-only defaults**, không phải production credentials. Có thể override bằng environment variables:

```text
SEED_ADMIN_USERNAME / SEED_ADMIN_PASSWORD
SEED_WAREHOUSE_KEEPER_USERNAME / SEED_WAREHOUSE_KEEPER_PASSWORD
SEED_ACCOUNTANT_USERNAME / SEED_ACCOUNTANT_PASSWORD
```

Production/shared environment phải dùng secret riêng và không commit `.env`.

Ba role có thể đăng nhập và backend trả đúng role qua `/api/v1/auth/me`. Mapping quyền nghiệp vụ `ROLE × FR × ACTION × API` vẫn **chưa được tự suy diễn** khi Permission Matrix chính thức còn thiếu.

## Cấu hình môi trường

`.env.example` mô tả các biến hỗ trợ. Nếu muốn override Compose defaults:

```bash
cp .env.example .env
```

Sau đó thay ít nhất `JWT_SECRET` và các credential local theo môi trường của bạn. `.env` đã được ignore và không được commit.

## Authentication API

Các endpoint hiện đang triển khai:

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `GET /api/v1/status`
- `GET /health`

Access token dùng JWT. Refresh token là opaque token; database chỉ lưu token hash. Refresh token cũ bị revoke khi rotation thành công. Logout revoke refresh token được gửi lên; access token đã phát hành vẫn hết hạn theo TTL của JWT.

Chi tiết contract và error model: [`docs/API.md`](docs/API.md).

## Frontend hiện tại

UI đã có:

- `/login` — form login nối backend thật.
- `/dashboard` — protected route.
- user/role lấy từ `/api/v1/auth/me`.
- health cards lấy từ `/health`.
- logout revoke refresh token và xóa local session.
- session dùng `sessionStorage`, không lưu token vĩnh viễn trong `localStorage`.
- business modules hiển thị `CHƯA MỞ` cho tới khi schema/permission được phê duyệt.

Hướng dẫn sử dụng: [`docs/USER_GUIDE.md`](docs/USER_GUIDE.md).

## Roles

Chỉ có ba role được định nghĩa:

```text
ADMIN
WAREHOUSE_KEEPER
ACCOUNTANT
```

Generic backend RBAC guard đã tồn tại. Mapping quyền nghiệp vụ `ROLE × FR × ACTION × API` chưa được tự tạo khi Permission Matrix chính thức còn thiếu.

## Migration / seed

Compose backend tự chạy trước khi serve:

```bash
alembic upgrade head
python -m app.seed
```

Migration hiện tại:

- `0001_foundation_metadata`
- `0002_auth_foundation`
- `0003_idempotency_infrastructure`

Seed hiện tạo ba role bắt buộc và, khi các cặp biến môi trường tương ứng được cấu hình, tạo demo user idempotent cho từng role. Nếu username đã tồn tại nhưng thuộc role khác, seed fail thay vì âm thầm đổi quyền.

Các bảng kỹ thuật phục vụ authentication/audit/idempotency là **Technical Implementation Extension**; domain schema nghiệp vụ chính thức chỉ được bổ sung khi có nguồn đủ mạnh.

## Kiểm thử

Backend:

```bash
cd backend
pip install -e ".[dev]"
ruff check app tests
mypy app
alembic upgrade head
python -m app.seed
pytest -q
```

Frontend:

```bash
cd frontend
npm install
npm run lint
npm run typecheck
npm run test
npm run build
```

CI hiện còn kiểm tra:

- clean Docker Compose startup;
- backend health + migration revision;
- authentication/refresh/logout foundation;
- ba role được seed và authenticate đúng role trong backend tests;
- PostgreSQL backup → delete probe → restore → verify;
- frontend serving và standalone Nginx SPA routes.

> `IMPLEMENTED`, `VERIFIED` và `DONE` là ba trạng thái khác nhau. Không gọi toàn hệ thống DONE khi business modules/traceability bắt buộc còn thiếu.

## Backup / restore

Backup:

```bash
python scripts/backup_db.py --output backups/warehouse_ai.dump
```

Restore yêu cầu xác nhận rõ:

```bash
python scripts/restore_db.py backups/warehouse_ai.dump --confirm-restore
```

Xem runbook chi tiết trong thư mục `docs/`.

## Phạm vi chưa triển khai

Chưa mở API/UI nghiệp vụ cho:

- Nhóm hàng / ĐVT.
- Hàng hóa.
- Nhà cung cấp.
- Nhập kho / tồn đầu kỳ.
- Xuất kho.
- Tồn kho / thẻ kho.
- Cảnh báo.
- Báo cáo / Excel / PDF.
- AI nghiệp vụ.

Blocker được theo dõi trong GitHub issue #2: cần baseline Phase 1/Data Dictionary/Use Case/Permission Matrix để triển khai đúng thay vì đoán requirement.
