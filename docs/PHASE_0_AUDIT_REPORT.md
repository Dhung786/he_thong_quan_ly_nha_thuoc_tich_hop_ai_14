# PHASE 0 AUDIT REPORT — Pharmacy AI V3 baseline

## Status

**AUDIT COMPLETE / BUSINESS DECISIONS PARTIALLY PENDING**

Phase 0 has been rerun against the pharmacy SRS baseline and the current repository. The old warehouse baseline is no longer the business source of truth.

## Source-of-truth order

1. Latest explicit user-approved decisions.
2. SRS V1.0 — Hệ thống quản lý nhà thuốc có tích hợp AI, Nhóm 14.
3. Confirmed supplementary requirements/business rules.
4. Technical design.
5. Current source code.

## Level 0 actor decision

The user explicitly replaced **Thu ngân** with **Khách hàng**.

Current roles:

```text
MANAGER
PHARMACIST
CUSTOMER
```

`CUSTOMER` does not inherit former cashier permissions by assumption. Only permissions explicitly supported by approved decisions are enabled.

## Requirement inventory

| UC | Scope | Current status |
|---|---|---|
| UC001 | Đăng nhập và phân quyền | IMPLEMENTED; role migration to CUSTOMER added |
| UC002 | Quản lý danh mục thuốc | IMPLEMENTED for MANAGER |
| UC003 | Quản lý lô nhập | NOT STARTED |
| UC004 | Bán thuốc và lập hóa đơn | BLOCKED on actor + batch allocation rule |
| UC005 | Quản lý nhà cung cấp | NOT STARTED; actor mapping requires confirmation |
| UC006 | Quản lý và kiểm tra tồn kho | NOT STARTED |
| UC007 | Tra cứu thuốc | NOT STARTED |
| UC008 | Cảnh báo thuốc sắp hết hạn | BLOCKED on expiry warning threshold |
| UC009 | Thống kê và báo cáo | NOT STARTED |
| UC010 | AI tóm tắt thông tin thuốc | NOT STARTED |
| UC011 | AI báo cáo thuốc sắp hết hạn | NOT STARTED |
| UC012 | Chatbot hỏi đáp quy trình nội bộ | NOT STARTED |
| UC013 | Kiểm soát phạm vi phản hồi AI | NOT STARTED |

## Repository inventory

Reusable technical foundation:

- React + TypeScript + Vite frontend;
- FastAPI backend;
- PostgreSQL + SQLAlchemy 2 async;
- Alembic migrations;
- JWT access token + rotating opaque refresh token;
- backend RBAC guard;
- audit log + correlation ID;
- error envelopes;
- transaction/idempotency/locking helpers;
- Docker Compose;
- backup/restore scripts;
- GitHub Actions CI.

Pharmacy-specific implementation already present:

- migration `0004_pharmacy_srs_baseline`;
- UC001 pharmacy roles foundation;
- UC002 medicine groups, units and medicines;
- `/catalog` frontend connected to real backend.

Current role-change branch adds migration `0005_customer_role` without editing applied migration history.

## Database gap

Current domain tables cover only medicine catalog plus technical/auth tables.

Still required for later UC implementation, subject to detailed rule confirmation:

- suppliers;
- medicine batches/lots;
- invoice / invoice items;
- inventory projection or equivalent source-of-truth model;
- expiry alert support;
- AI logs / validated AI outputs;
- internal process knowledge source for chatbot.

Money fields must use Decimal/NUMERIC rather than float.

## Backend gap

UC003–UC013 are not complete. Catalog code is functional but can later be refactored toward API → Application Service → Repository → PostgreSQL without changing behavior.

## Frontend gap

Currently available:

```text
/login
/dashboard
/catalog
```

Future screens depend on approved contracts for UC003–UC013.

## AI gap

AI provider is optional/not configured in the current verified foundation. Before UC010–UC013 can be reported complete, implementation still needs:

- AI adapter;
- scope guard;
- validated structured outputs;
- fallback behavior;
- bounded retries;
- prompt-injection defense;
- AI audit/logging;
- internal-process retrieval for chatbot.

AI must never directly mutate official stock, invoices, users or business records.

## Requirement conflicts / decision gates

The following are intentionally not inferred:

1. UC004 actor under the new role model.
2. Batch allocation when selling: FEFO, FIFO or manual selection.
3. Expiry-warning lead time.
4. UC005 permissions under `MANAGER / PHARMACIST / CUSTOMER`.
5. Any CUSTOMER permission beyond UC001 unless explicitly approved.

Only the affected module is blocked by each ambiguity.

## Out-of-scope / superseded material

The old warehouse business baseline (`ADMIN / WAREHOUSE_KEEPER / ACCOUNTANT`, generic item receipt/issue warehouse flows) is superseded as a business source. Technical infrastructure may be reused where it does not change pharmacy requirements.

## Implementation sequence

1. Finalize customer-role migration and regression tests.
2. Keep UC001 + UC002 verified.
3. Implement UC005 or other independent clear module after permission confirmation.
4. Implement UC003 batches with transaction/inventory integrity.
5. Implement UC006/UC007.
6. Implement UC008 after expiry threshold is approved.
7. Implement UC009.
8. Implement UC004 only after actor + batch allocation rules are approved.
9. Implement UC013 AI scope guard, then UC010–UC012.
10. Run security, concurrency, clean-compose and end-to-end evidence gates.

## Current verification rule

No change is called VERIFIED merely because code exists. Verification requires actual CI/runtime evidence on the relevant commit.
