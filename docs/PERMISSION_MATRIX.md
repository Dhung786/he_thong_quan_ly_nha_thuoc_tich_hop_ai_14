# Permission Matrix — Warehouse AI

## Status

**STOP-02 / BLOCKED — actor-permission ambiguity for business actions**

This matrix is intentionally conservative. Master Prompt V2.0 confirms the three roles and FR-01 → FR-11, but the Phase 1 source that assigns business actions to roles is not available in the audited sources. No `ALLOW`/`DENY` decision below is inferred.

## Confirmed roles

- `ADMIN`
- `WAREHOUSE_KEEPER`
- `ACCOUNTANT`

## Matrix gate

| FR | Requirement | ADMIN | WAREHOUSE_KEEPER | ACCOUNTANT | Action/API contract | Status |
|---|---|---|---|---|---|---|
| FR-01 | Đăng nhập và phân quyền | Authentication confirmed | Authentication confirmed | Authentication confirmed | `/api/v1/auth/*`; business-role assignment still requires source evidence | PARTIAL / VERIFIED technical auth |
| FR-02 | Quản lý hàng hóa, nhóm hàng, ĐVT, tồn tối thiểu | PENDING | PENDING | PENDING | PENDING | BLOCKED / STOP-02 |
| FR-03 | Quản lý nhà cung cấp | PENDING | PENDING | PENDING | PENDING | BLOCKED / STOP-02 |
| FR-04 | Lập phiếu nhập và cập nhật tồn | PENDING | PENDING | PENDING | PENDING | BLOCKED / STOP-02 |
| FR-05 | Lập phiếu xuất và kiểm tra tồn | PENDING | PENDING | PENDING | PENDING | BLOCKED / STOP-02 |
| FR-06 | Tra cứu lịch sử và thẻ kho | PENDING | PENDING | PENDING | PENDING | BLOCKED / STOP-02 |
| FR-07 | Cảnh báo tồn dưới mức tối thiểu | PENDING | PENDING | PENDING | PENDING | BLOCKED / STOP-02 |
| FR-08 | Báo cáo nhập-xuất-tồn và xuất Excel/PDF | PENDING | PENDING | PENDING | PENDING | BLOCKED / STOP-02 |
| FR-09 | AI sinh báo cáo tháng | PENDING | PENDING | PENDING | PENDING | BLOCKED / STOP-02 |
| FR-10 | AI giải thích gợi ý nhập hàng | PENDING | PENDING | PENDING | PENDING | BLOCKED / STOP-02 |
| FR-11 | AI tóm tắt biến động bất thường | PENDING | PENDING | PENDING | PENDING | BLOCKED / STOP-02 |

`PENDING` means **no permission decision has been made**. It does not mean deny and it does not mean allow.

## Required evidence to unblock one business action

Each row/action must be backed by an approved source and record all of the following before code exposes the endpoint:

1. FR identifier.
2. Use Case / actor source.
3. Action (`READ`, `CREATE`, `UPDATE`, `CONFIRM`, `CANCEL`, `EXPORT`, or another explicitly approved action).
4. Allowed role(s).
5. HTTP method and `/api/v1/...` path.
6. Business/state preconditions.
7. Expected `401`, `403`, `404`, `409`, `422` behavior where applicable.
8. Automated positive and negative authorization tests.

## Implemented technical enforcement

The backend already provides a generic `require_roles(...)` / `enforce_roles(...)` guard that:

- requires authentication first;
- validates guard role names against the exact three supported roles;
- returns `403` when an authenticated user's role is not allowed;
- rejects an access token when the user's current database role no longer matches the JWT role claim;
- rejects inactive users.

This mechanism is technical infrastructure only. It is not a business Permission Matrix.

## Rule for future implementation

Business endpoints for FR-02 → FR-11 must not be enabled merely because a frontend menu exists or because a role name appears intuitive. The approved actor/action mapping must be added to this matrix and covered by backend tests first.
