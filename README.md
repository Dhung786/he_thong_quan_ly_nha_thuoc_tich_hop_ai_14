# Hệ thống Quản lý Kho tích hợp AI — Đề tài 14

Repository triển khai theo **MASTER PROMPT V2.0**.

## Trạng thái

- Phase 0 audit: **PARTIAL** — repository mới đã audit, nhưng Phase 1 baseline/SRS/Use Case/Test Specification chưa có trong repo.
- Phase 2A technical foundation: phần hạ tầng cơ bản đã có CI evidence; authentication persistence đang được bổ sung và phải qua CI trước khi gọi là VERIFIED.
- Permission Matrix nghiệp vụ vẫn **BLOCKED**; không tự suy diễn quyền theo role.

## Stack

- Frontend: React + TypeScript + Vite + React Router + TanStack Query + React Hook Form + Zod + Tailwind CSS.
- Backend: Python 3.12 + FastAPI + Pydantic + SQLAlchemy 2 + Alembic.
- Database: PostgreSQL.
- CI: GitHub Actions.

## Chạy local bằng Docker

1. Sao chép file môi trường:

   ```bash
   cp .env.example .env
   ```

2. Thay `JWT_SECRET` bằng chuỗi ngẫu nhiên dài, không commit `.env`.

3. Nếu muốn seed tài khoản admin demo, đặt cả hai biến trong `.env` và dùng mật khẩu chỉ dành cho local/demo:

   ```text
   SEED_ADMIN_USERNAME=admin
   SEED_ADMIN_PASSWORD=<your-local-demo-password>
   ```

4. Khởi động:

   ```bash
   docker compose up --build
   ```

5. Backend health: `http://localhost:8000/health`

6. Frontend: `http://localhost:5173`

## Authentication API foundation

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`

Access token dùng JWT. Refresh token là opaque token, chỉ hash SHA-256 được lưu trong PostgreSQL. Refresh token cũ bị revoke khi rotation thành công.

## Migration / seed

Trong backend container:

```bash
alembic upgrade head
python -m app.seed
```

Migration `0002_auth_foundation` là **Technical Implementation Extension** cho authentication/audit/session security. Domain schema chính thức khác vẫn chỉ được bổ sung khi đủ baseline để tránh tự bịa business rule hoặc kiểu dữ liệu.

## Kiểm thử

Backend:

```bash
cd backend
pip install -e ".[dev]"
ruff check app tests
mypy app
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

> Không được coi dự án là VERIFIED/PASS/DONE nếu chưa có execution evidence thực tế.
