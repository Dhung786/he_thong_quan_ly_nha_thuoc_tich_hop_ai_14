# PostgreSQL Backup & Restore

## Scope

This document covers the Docker Compose PostgreSQL service used by this repository.
The scripts intentionally read `POSTGRES_USER` and `POSTGRES_DB` from the running
`postgres` container and do not embed credentials in source control.

## Prerequisites

- Docker Engine / Docker Desktop with `docker compose` available.
- The repository root is the current working directory.
- The `postgres` Compose service is running and healthy.

Start PostgreSQL if needed:

```bash
docker compose up -d --wait postgres
```

## Create a backup

Default timestamped output:

```bash
python scripts/backup_db.py
```

Explicit output path:

```bash
python scripts/backup_db.py --output backups/pre_demo.dump
```

The backup uses PostgreSQL custom format (`pg_dump --format=custom`) and excludes
ownership/privilege metadata to make restores less environment-specific.

Backup files under `backups/` are local artifacts and must not be committed.
Store production/shared backups only in an approved protected location with the
appropriate access controls and retention policy.

## Restore a backup

Restoring can replace current database objects. Stop application writes first:

```bash
docker compose stop frontend backend
```

Run restore with the required acknowledgement flag:

```bash
python scripts/restore_db.py backups/pre_demo.dump --confirm-restore
```

The restore uses `pg_restore --clean --if-exists --exit-on-error` so failures stop
immediately instead of silently continuing with a partial restore.

Restart the application:

```bash
docker compose start backend frontend
```

## Post-restore verification

Check application/database health:

```bash
curl http://localhost:8000/health
```

Check the Alembic revision stored in the restored database:

```bash
docker compose exec -T postgres sh -c \
  'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT version_num FROM alembic_version;"'
```

Then run the application smoke tests appropriate to the restored environment.
Do not run destructive demo/seed operations against production/shared data unless
that environment explicitly permits them.

## Failure handling

- A failed backup removes the incomplete output file.
- An empty dump is rejected.
- Restore refuses to run unless `--confirm-restore` is supplied.
- A missing/empty dump is rejected before invoking PostgreSQL tools.
- `pg_restore --exit-on-error` stops on the first restore error.

## CI evidence

The CI `backup-restore` job creates a disposable PostgreSQL Compose database,
creates a probe table/value, backs it up, deletes it, restores the dump, and
verifies the value is present again. This is technical infrastructure evidence;
it does not replace environment-specific disaster-recovery drills.
