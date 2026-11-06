#!/usr/bin/env python3
"""CI guard: every table created in db/migrations/ must enable row-level security.

Static check over the migration SQL (no database connection needed):
for each `CREATE TABLE [IF NOT EXISTS] <table>` across all migration files,
require a matching `ALTER TABLE <table> ENABLE ROW LEVEL SECURITY`.

Exit 0 when every table is covered; exit 1 listing the offenders.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

MIGRATIONS_DIR = Path(__file__).resolve().parents[1] / "migrations"

CREATE_RE = re.compile(
    r"create\s+table\s+(?:if\s+not\s+exists\s+)?(?P<name>[\w\".]+)",
    re.IGNORECASE,
)
RLS_RE = re.compile(
    r"alter\s+table\s+(?:only\s+)?(?P<name>[\w\".]+)\s+enable\s+row\s+level\s+security",
    re.IGNORECASE,
)


def normalize(name: str) -> str:
    name = name.replace('"', "").lower()
    return name.removeprefix("public.")


def main() -> int:
    sql_files = sorted(MIGRATIONS_DIR.glob("*.sql"))
    if not sql_files:
        print(f"check_rls: no migration files found in {MIGRATIONS_DIR}", file=sys.stderr)
        return 1

    created: set[str] = set()
    rls_enabled: set[str] = set()
    for path in sql_files:
        sql = path.read_text(encoding="utf-8")
        created.update(normalize(m.group("name")) for m in CREATE_RE.finditer(sql))
        rls_enabled.update(normalize(m.group("name")) for m in RLS_RE.finditer(sql))

    missing = sorted(created - rls_enabled)
    if missing:
        print("check_rls: tables WITHOUT row-level security:", file=sys.stderr)
        for table in missing:
            print(f"  - {table}", file=sys.stderr)
        return 1

    print(f"check_rls: OK — {len(created)} tables, all with RLS enabled.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
