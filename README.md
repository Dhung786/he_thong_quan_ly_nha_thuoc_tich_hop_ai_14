# Hệ thống Quản lý Kho tích hợp AI — Đề tài 14

Repository triển khai theo **MASTER PROMPT V2.0**.

## Trạng thái

- Phase 0 audit: **PARTIAL** — repository mới đã audit, nhưng Phase 1 baseline/SRS/Use Case/Test Specification chưa có trong repo.
- Phase 2A foundation: **IMPLEMENTED / NOT VERIFIED** cho đến khi CI hoặc môi trường chạy thực tế cung cấp execution evidence.
- Không tự suy diễn permission matrix hoặc business rule chưa được tài liệu nguồn xác nhận.

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

3. Khởi động:

   ```bash
   docker compose up --build
   ```

4. Backend health:

   ```text
   http://localhost:8000/health
   ```

5. Frontend:

   ```text
   http://localhost:5173
   ```

## Migration / seed

Trong backend container:

```bash
alembic upgrade head
python -m app.seed
```

Migration hiện tại chỉ thiết lập **technical foundation** (`system_metadata`). Domain schema chính thức sẽ chỉ được bổ sung sau khi Phase 1 baseline/SRS/Data Dictionary được audit để tránh tự bịa kiểu dữ liệu hoặc business rule.

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
