# Phase 2B — Core Inventory Readiness

## Status

`PARTIAL / BLOCKED`

Technical-only readiness work may continue. Business implementation remains blocked where the approved Phase 1 baseline, data dictionary, use-case traceability or permission matrix is required.

## Source-derived Phase 2B scope

The current Master Prompt establishes Phase 2B as:

- master data;
- phiếu nhập;
- tồn đầu kỳ;
- phiếu xuất;
- transaction boundaries;
- row locking;
- idempotency;
- cancellation;
- audit.

High-level business scope maps this work to FR-02 through FR-05.

## Rules already established

The current source establishes these rules without requiring inference:

- exactly one warehouse;
- master data includes user, nhóm hàng, ĐVT, hàng hóa and nhà cung cấp;
- unique codes are required for hàng hóa, nhóm hàng, ĐVT, nhà cung cấp and documents;
- referenced master data must not be hard-deleted; inactive/active state is required where appropriate;
- phiếu nhập baseline state starts at `DRAFT → CONFIRMED`;
- phiếu nhập must have at least one line, positive quantity, no duplicate product in one document, active product and active supplier, with the documented `TON_DAU_KY` supplier exception;
- `TON_DAU_KY` is a phiếu nhập type rather than a separate subsystem;
- phiếu xuất confirmation must lock product rows using `SELECT ... FOR UPDATE`, with product IDs locked in ascending order;
- stock must never become negative;
- stock-changing commands require transaction/state guards and idempotent behavior;
- confirming the same document twice must not change stock twice;
- cancellation is auditable and transaction-safe;
- audit must capture entity/document, entity ID, previous/new state, actor, timestamp, reason, stock delta when applicable, and correlation/request ID.

## Missing approved evidence

The repository and currently accessible Library do not contain the named Level-1 baseline:

`Phase1_QuanLyKho_AI_HoanThien.docx`

The following must therefore not be guessed:

- exact master-data columns and lengths;
- exact document/detail columns;
- inventory quantity type/precision;
- monetary precision/scale;
- complete UC and Business Rule traceability;
- `ROLE × FR × ACTION × API` Permission Matrix;
- role-specific price visibility.

See GitHub issue #2 for the active unblock request.

## Technical work completed on this branch

- introduced a domain-neutral `AuditEvent` helper;
- standardized required audit detail keys for security and future inventory events;
- kept `stock_delta` as text in the technical audit payload so this branch does not choose integer vs decimal quantity semantics;
- refactored authentication audit events through the shared helper;
- extended integration tests to verify audit correlation and confirm secrets/tokens are not stored in audit details;
- added the `idempotency_records` technical table in Alembic revision `0003_idempotency_infrastructure`;
- enforced uniqueness for `scope + idempotency_key`;
- added request payload hashing so the same key cannot silently represent different input;
- added claim/replay/completion service behavior without exposing a business endpoint;
- added tests for completed replay detection, conflicting input rejection and scope isolation;
- CI run #20 verified Ruff, mypy, migration from an empty PostgreSQL database, seed, pytest and the frontend quality gates.

## Next business implementation after unblock

Once the approved Phase 1 baseline is available:

1. Build the authoritative Data Dictionary and Permission Matrix.
2. Create the Phase 2B migration for approved master-data and transaction tables.
3. Implement repositories and services with backend authorization.
4. Implement master-data APIs/UI.
5. Implement phiếu nhập and `TON_DAU_KY` transaction flow.
6. Implement phiếu xuất with deterministic ascending row locks.
7. Bind the verified idempotency infrastructure to stock-changing commands and implement cancellation.
8. Run required concurrency test before advancing to Phase 2C.

No business endpoint should be exposed before its permission and data contract are traceable to the approved baseline.
