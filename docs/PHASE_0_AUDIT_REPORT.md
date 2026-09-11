# PHASE 0 AUDIT REPORT

## Status

**PARTIAL / BLOCKED (business-detail dependent items only)**

The technical foundation is now implemented through migration `0003_idempotency_infrastructure`, with authentication, generic backend RBAC enforcement, audit/correlation IDs, idempotency infrastructure, row-lock helpers, backup/restore tooling, Docker Compose and CI evidence. Business modules remain gated where Phase 1 actor/permission/data details are missing.

## Sources actually available

1. MASTER PROMPT V2.0 supplied by the user.
2. Current GitHub repository and its verified technical foundation.

## Missing source-of-truth documents

- `Phase1_QuanLyKho_AI_HoanThien.docx`.
- SRS / Requirement Specification for the warehouse baseline.
- Use Case specification for the warehouse baseline.
- ERD / Data Dictionary beyond what is explicitly reproduced in Master Prompt V2.0.
- Business Rules / State Machine beyond what is explicitly reproduced in Master Prompt V2.0.
- Test Specification defining exact TC-01 → TC-24 inputs and expected outputs.
- Stitch UI files.

These missing sources block any decision where guessing could change business behavior, actor permission, field semantics, quantity type, or test expectation.

## Requirement inventory

| FR | Scope from Master Prompt | Audit status |
|---|---|---|
| FR-01 | Login and authorization | IMPLEMENTED / VERIFIED technical authentication; business permission matrix remains STOP-02 |
| FR-02 | Item/group/UOM/minimum stock | PARTIAL — scope known; exact data dictionary and actor/action permission missing |
| FR-03 | Supplier management | PARTIAL — scope known; exact data dictionary and actor/action permission missing |
| FR-04 | Receipt and stock update | PARTIAL — transaction/state rules available; exact fields and permission missing |
| FR-05 | Issue and stock validation | PARTIAL — transaction/lock rules available; exact fields and permission missing |
| FR-06 | History and stock card | PARTIAL — behavior known; exact API/UI permission contract missing |
| FR-07 | Low-stock alert | PARTIAL — threshold behavior known; actor/action permission missing |
| FR-08 | N-X-T report + Excel/PDF | PARTIAL — behavior known; permission/price visibility detail missing |
| FR-09 | AI monthly report | PARTIAL — architecture/validation rules known; actor permission missing |
| FR-10 | Reorder explanation | BLOCKED on business ambiguity including “Số ngày có dữ liệu” and actor permission |
| FR-11 | Anomaly explanation | PARTIAL — baseline thresholds known; actor permission missing |

## Permission matrix

Roles are confirmed: `ADMIN`, `WAREHOUSE_KEEPER`, `ACCOUNTANT`.

A concrete matrix is maintained in `docs/PERMISSION_MATRIX.md`. Business cells are intentionally `PENDING`, not guessed. Detailed `ROLE × FR × ACTION × API` permissions are **BLOCKED (STOP-02)** because Master Prompt explicitly forbids inferring missing business permissions.

The generic backend guard is implemented and tested separately from business permission decisions:

- unauthenticated access → `401`;
- authenticated but disallowed role → `403`;
- unknown/empty role-guard configuration is rejected;
- access tokens are rejected if the account is inactive;
- access tokens are rejected if the role stored in PostgreSQL no longer matches the JWT role claim.

## Repository inventory

Current technical foundation includes:

- React/TypeScript/Vite frontend shell;
- FastAPI backend;
- PostgreSQL;
- Alembic migrations `0001` → `0003`;
- roles/users/refresh-token/audit technical persistence;
- JWT access token + rotating opaque refresh token;
- generic backend role guard;
- correlation IDs and structured error handling;
- transaction/locking and idempotency infrastructure;
- Docker Compose;
- backup/restore scripts;
- automated backend/frontend tests and GitHub Actions CI;
- README, API, user and technical documentation.

No FR-02 → FR-11 business endpoint is treated as approved merely because infrastructure exists.

## Out-of-scope gate

The implementation must not add multi-warehouse, branch, customer, sales/order/payment/debt/shipping, lot/batch/serial/expiry, standalone stocktake, financial accounting, or AI mutation of official stock/documents unless explicitly approved later.

## Technical Implementation Decisions

### TID-001 — Repository structure

**Decision:** use `frontend/`, `backend/`, `docs/`, root Compose/CI files.

**Reason:** matches the target architecture without adding business behavior.

### TID-002 — Async PostgreSQL access

**Decision:** SQLAlchemy 2 async engine with `asyncpg`.

**Reason:** technical choice only; preserves PostgreSQL as source of truth and supports transaction/row-lock work later.

### TID-003 — Foundation migrations

**Decision:** technical-only foundation migrations are separated from future business schema migrations.

**Reason:** validates Alembic-from-empty-DB and security/infrastructure behavior without inventing warehouse domain columns before Data Dictionary audit.

### TID-004 — Correlation IDs

**Decision:** middleware accepts a valid incoming `X-Correlation-ID` or generates UUID4 and echoes it in the response.

**Reason:** supports observability and safe error tracing.

### TID-005 — RBAC contract gate

**Decision:** generic backend role enforcement may be implemented/tested now, but FR/action/API mappings remain data/documentation until an approved Phase 1 source supplies them.

**Reason:** security infrastructure is a technical decision; business authorization is not.

## Proposed sequence

1. Maintain verified Phase 2 technical foundation and RBAC regression coverage.
2. Obtain/audit Phase 1 baseline + warehouse SRS + UC + Data Dictionary + TC-01..TC-24.
3. Finalize `docs/PERMISSION_MATRIX.md` with approved actor/action/API mappings.
4. Finalize domain schema without guessing quantity or financial semantics.
5. Implement FR-02/FR-03 master data, then FR-04/FR-05 stock transactions.
6. Require concurrency/idempotency evidence before reporting/AI phases.
7. Implement FR-06 → FR-08 reporting, then FR-09 → FR-11 AI, then final hardening/delivery.
