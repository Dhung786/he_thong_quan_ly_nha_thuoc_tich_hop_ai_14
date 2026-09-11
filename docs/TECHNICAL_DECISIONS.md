# Technical Implementation Decisions

## TID-001 — Authentication persistence foundation

**Status:** Implemented pending CI verification.

Master Prompt V2.0 requires authentication, backend RBAC, safe password hashing, migration/seed, and exactly three roles: `ADMIN`, `WAREHOUSE_KEEPER`, `ACCOUNTANT`. It also permits technical tables for audit and refresh/session security.

The implementation therefore adds the following technical foundation without defining any business permission matrix:

- `roles` with only the three approved role names;
- `users` with minimal authentication fields required to support FR-01;
- `refresh_tokens`, storing only SHA-256 token hashes rather than raw refresh tokens;
- `audit_logs` for security-relevant authentication events;
- opaque refresh-token rotation with row locking and revocation;
- JWT access tokens containing subject and current role only;
- optional seed admin configured only through environment variables.

Raw passwords, JWTs and refresh tokens are not persisted in these tables or audit details.

## TID-002 — RBAC business permissions remain blocked

The code does **not** assign FR/action/API permissions to the three roles. Master Prompt V2.0 requires a `ROLE × FR × ACTION × API` Permission Matrix and explicitly forbids inferring missing business permissions. Business authorization dependencies will be added only after the Phase 1 permission evidence is available.
