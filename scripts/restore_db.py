from __future__ import annotations

import argparse
from pathlib import Path
import subprocess
import sys


CONFIRM_FLAG = "--confirm-restore"


def restore_database(dump_path: Path) -> None:
    if not dump_path.is_file():
        raise RuntimeError(f"Backup file not found: {dump_path}")
    if dump_path.stat().st_size == 0:
        raise RuntimeError("Backup file is empty")

    command = [
        "docker",
        "compose",
        "exec",
        "-T",
        "postgres",
        "sh",
        "-c",
        'exec pg_restore --clean --if-exists --exit-on-error '
        '--no-owner --no-privileges --username="$POSTGRES_USER" '
        '--dbname="$POSTGRES_DB"',
    ]

    with dump_path.open("rb") as input_file:
        completed = subprocess.run(
            command,
            stdin=input_file,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
        )

    if completed.returncode != 0:
        message = completed.stderr.decode("utf-8", errors="replace").strip()
        raise RuntimeError(f"Database restore failed: {message}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Restore a PostgreSQL custom-format backup through Docker Compose."
    )
    parser.add_argument("dump", type=Path, help="Path to a .dump backup file")
    parser.add_argument(
        CONFIRM_FLAG,
        action="store_true",
        help="Required acknowledgement that restore may replace current database objects",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if not args.confirm_restore:
        print(
            f"Restore refused. Re-run with {CONFIRM_FLAG} after stopping application writes.",
            file=sys.stderr,
        )
        return 2

    try:
        restore_database(args.dump)
    except (OSError, RuntimeError) as exc:
        print(str(exc), file=sys.stderr)
        return 1

    print(f"Restore completed from: {args.dump}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
