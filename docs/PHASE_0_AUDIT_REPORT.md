# PHASE 0 AUDIT REPORT

## Status

**PARTIAL / BLOCKED (business-detail dependent items only)**

## Sources actually available

1. MASTER PROMPT V2.0 supplied by the user.
2. Newly created GitHub repository.

The repository initially contained only `README.md`; therefore no existing application implementation could be trusted or reused.

## Missing source-of-truth documents

- `Phase1_QuanLyKho_AI_HoanThien.docx`.
- SRS / Requirement Specification.
- Use Case specification.
- ERD / Data Dictionary.
- Business Rules / State Machine beyond what is explicitly reproduced in Master Prompt V2.0.
- Test Specification defining exact TC-01 → TC-24 inputs and expected outputs.
- Stitch UI files.

These missing sources block any decision where guessing could change business behavior, permission, field semantics, quantity type, or test expectation.

## Requirement inventory

| FR | Scope from Master Prompt | Audit status |
|---|---|---|
| FR-01 | Login and authorization | PARTIAL — roles known; detailed permission matrix missing |
| FR-02 | Item/group/UOM/minimum stock | PARTIAL — scope known; exact data dictionary missing |
| FR-03 | Supplier management | PARTIAL — scope known; exact data dictionary missing |
| FR-04 | Receipt and stock update | PARTIAL — transaction/state rules available; exact fields missing |
| FR-05 | Issue and stock validation | PARTIAL — transaction/lock rules available; exact fields missing |
| FR-06 | History and stock card | PARTIAL — report behavior known; exact API/UI contract missing |
| FR-07 | Low-stock alert | PARTIAL — threshold behavior known |
| FR-08 | N-X-T report + Excel/PDF | PARTIAL — formula known; permission/price visibility detail missing |
| FR-09 | AI monthly report | PARTIAL — architecture/validation rules known |
| FR-10 | Reorder explanation | BLOCKED on ambiguity of “Số ngày có dữ liệu” |
| FR-11 | Anomaly explanation | PARTIAL — baseline thresholds known |

## Permission matrix

Roles are confirmed: `ADMIN`, `WAREHOUSE_KEEPER`, `ACCOUNTANT`.

Detailed `ROLE × FR × ACTION × API` permissions are **BLOCKED (STOP-02)** because Master Prompt explicitly forbids guessing permissions not fixed by Phase 1.

## Repository inventory

Initial state:

- README only.
- No frontend.
- No backend.
- No migration.
- No database configuration.
- No tests.
- No CI.

Result: safe to build a new technical foundation; no legacy application code is being rewritten.

## Out-of-scope gate

The implementation must not add multi-warehouse, branch, customer, sales/order/payment/debt/shipping, lot/batch/serial/expiry, standalone stocktake, financial accounting, or AI mutation of official stock/documents unless explicitly approved later.

## Technical Implementation Decisions

### TID-001 — Repository structure

**Decision:** use `frontend/`, `backend/`, `docs/`, root Compose/CI files.

**Reason:** matches the target architecture without adding business behavior.

### TID-002 — Async PostgreSQL access

**Decision:** SQLAlchemy 2 async engine with `asyncpg`.

**Reason:** technical choice only; preserves PostgreSQL as source of truth and supports transaction/row-lock work later.

### TID-003 — Foundation migration

**Decision:** first migration creates only `system_metadata`, a technical extension.

**Reason:** validates Alembic-from-empty-DB flow without inventing domain columns before Data Dictionary audit.

### TID-004 — Correlation IDs

**Decision:** middleware accepts a valid incoming `X-Correlation-ID` or generates UUID4 and echoes it in the response.

**Reason:** supports observability and safe error tracing.

## Proposed sequence

1. Complete Phase 2A technical foundation and CI.
2. Obtain/audit Phase 1 baseline + SRS + UC + Data Dictionary + TC-01..TC-24.
3. Finalize permission matrix and domain schema.
4. Implement Phase 2B transaction modules.
5. Require concurrency evidence before Phase 2C.
6. Implement reporting, then AI, then hardening/delivery.
