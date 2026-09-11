# Technical Implementation Decisions

## TID-001 — Authentication persistence foundation

**Status:** VERIFIED by GitHub Actions CI run #12.

Master Prompt V2.0 requires authentication, backend RBAC, safe password hashing, migration/seed, and exactly three roles: `ADMIN`, `WAREHOUSE_KEEPER`, `ACCOUNTANT`. It also permits technical tables for audit and refresh/session security.

The implementation therefore adds the following technical foundation without defining any business permission matrix:

- `roles` with only the three approved role names;
- `users` with minimal authentication fields required to support FR-01;
- `refresh_tokens`, storing only SHA-256 token hashes rather than raw refresh tokens;
- `audit_logs` for security-relevant authentication events;
- opaque refresh-token rotation with row locking and revocation;
- JWT access tokens containing subject and current role only;
- optional seed admin configured only through environment variables;
- generic backend role guard returning `403` for an authenticated user whose role is not allowed.

Raw passwords, JWTs and refresh tokens are not persisted in these tables or audit details.

CI run #12 verified:

- Ruff;
- mypy;
- Alembic upgrade from an empty PostgreSQL database through revisions `0001` and `0002`;
- seed execution;
- authentication integration tests, including login, current user, refresh rotation, refresh replay rejection, logout and revoked-token rejection;
- `401` for unauthenticated access;
- generic RBAC `403` enforcement;
- frontend lint, typecheck, tests and build.

## TID-002 — RBAC business permissions remain blocked

The generic backend enforcement mechanism is implemented and verified, but the code does **not** assign FR/action/API permissions to the three roles. Master Prompt V2.0 requires a `ROLE × FR × ACTION × API` Permission Matrix and explicitly forbids inferring missing business permissions.

A search of the currently available conversation and Library sources did not locate the named Phase 1 baseline/Permission Matrix. Business authorization mappings therefore remain **BLOCKED / STOP-02** until that evidence is supplied.
