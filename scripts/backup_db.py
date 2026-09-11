from __future__ import annotations

import argparse
from datetime import UTC, datetime
from pathlib import Path
import subprocess
import sys


def default_output_path() -> Path:
    stamp = datetime.now(UTC).strftime("%Y%m%d_%H%M%S")
    return Path("backups") / f"warehouse_ai_{stamp}.dump"


def backup_database(output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    command = [
        "docker",
        "compose",
        "exec",
        "-T",
        "postgres",
        "sh",
        "-c",
        'exec pg_dump --format=custom --no-owner --no-privileges '
        '--username="$POSTGRES_USER" --dbname="$POSTGRES_DB"',
    ]

    with output_path.open("wb") as output_file:
        completed = subprocess.run(
            command,
            stdout=output_file,
            stderr=subprocess.PIPE,
            check=False,
        )

    if completed.returncode != 0:
        output_path.unlink(missing_ok=True)
        message = completed.stderr.decode("utf-8", errors="replace").strip()
        raise RuntimeError(f"Database backup failed: {message}")

    if output_path.stat().st_size == 0:
        output_path.unlink(missing_ok=True)
        raise RuntimeError("Database backup produced an empty dump")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Create a PostgreSQL custom-format backup through Docker Compose."
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=default_output_path(),
        help="Output dump path (default: backups/warehouse_ai_<UTC timestamp>.dump)",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        backup_database(args.output)
    except (OSError, RuntimeError) as exc:
        print(str(exc), file=sys.stderr)
        return 1

    print(f"Backup created: {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
