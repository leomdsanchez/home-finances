#!/usr/bin/env python3
"""
Apply Supabase SQL migrations to the cloud Postgres database without the Supabase CLI.

This is a pragmatic fallback for dev environments where `supabase`/`psql` isn't available.

Requirements:
- python3
- psycopg2 (often available as psycopg2-binary)

Env sources (in order):
- OS env
- .env file (simple KEY=VALUE)

Supported vars:
- SUPABASE_URL or VITE_SUPABASE_URL
- SUPABASE_DB_PASSWORD or VITE_SUPABASE_DB_PASSWORD

Optional overrides:
- SUPABASE_DB_HOST (defaults to db.<project-ref>.supabase.co)
- SUPABASE_DB_PORT (defaults to 5432)
- SUPABASE_DB_NAME (defaults to postgres)
- SUPABASE_DB_USER (defaults to postgres)
"""

from __future__ import annotations

import os
import re
import sys
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple


def _load_dotenv(path: Path) -> Dict[str, str]:
    if not path.exists():
        return {}
    out: Dict[str, str] = {}
    for raw in path.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        out[k.strip()] = v.strip()
    return out


def _get_var(env: Dict[str, str], *names: str) -> Optional[str]:
    for name in names:
        v = os.environ.get(name) or env.get(name)
        if v:
            return v
    return None


def _infer_ref_from_url(url: str) -> str:
    # Expected: https://<ref>.supabase.co
    host = re.sub(r"^https?://", "", url).split("/", 1)[0]
    return host.split(".", 1)[0]


def _list_migration_files(migrations_dir: Path) -> List[Path]:
    files = []
    for p in migrations_dir.glob("*.sql"):
        if re.match(r"^\d{14}_.+\.sql$", p.name):
            files.append(p)
    return sorted(files, key=lambda p: p.name)


def _parse_version_and_name(path: Path) -> Tuple[str, str]:
    m = re.match(r"^(\d{14})_(.+)\.sql$", path.name)
    if not m:
        raise ValueError(f"Not a migration filename: {path.name}")
    version = m.group(1)
    name = m.group(2)
    return version, name


def _connect(*, host: str, port: int, dbname: str, user: str, password: str):
    import psycopg2  # type: ignore

    return psycopg2.connect(
        host=host,
        port=port,
        dbname=dbname,
        user=user,
        password=password,
        sslmode="require",
        connect_timeout=10,
    )


def _fetch_applied_versions(conn) -> set:
    with conn.cursor() as cur:
        cur.execute("select version from supabase_migrations.schema_migrations")
        return {row[0] for row in cur.fetchall()}


def _apply_one(conn, path: Path, *, record: bool = True) -> None:
    sql = path.read_text()
    version, name = _parse_version_and_name(path)
    with conn:
        with conn.cursor() as cur:
            cur.execute(sql)
            if record:
                cur.execute(
                    """
                    insert into supabase_migrations.schema_migrations (version, name, statements)
                    values (%s, %s, null)
                    on conflict (version) do nothing
                    """,
                    (version, name),
                )


def main(argv: List[str]) -> int:
    repo_root = Path(__file__).resolve().parents[1]
    dotenv = _load_dotenv(repo_root / ".env")

    url = _get_var(dotenv, "SUPABASE_URL", "VITE_SUPABASE_URL")
    password = _get_var(dotenv, "SUPABASE_DB_PASSWORD", "VITE_SUPABASE_DB_PASSWORD")
    if not url or not password:
        print(
            "Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_DB_PASSWORD/VITE_SUPABASE_DB_PASSWORD",
            file=sys.stderr,
        )
        return 2

    ref = _infer_ref_from_url(url)
    host = _get_var(dotenv, "SUPABASE_DB_HOST") or f"db.{ref}.supabase.co"
    port = int(_get_var(dotenv, "SUPABASE_DB_PORT") or "5432")
    dbname = _get_var(dotenv, "SUPABASE_DB_NAME") or "postgres"
    user = _get_var(dotenv, "SUPABASE_DB_USER") or "postgres"

    target: Optional[Path] = None
    if len(argv) > 1:
        target = (repo_root / argv[1]).resolve()
        if not target.exists():
            print(f"File not found: {argv[1]}", file=sys.stderr)
            return 2

    migrations_dir = repo_root / "supabase" / "migrations"
    files = [target] if target else _list_migration_files(migrations_dir)

    conn = _connect(host=host, port=port, dbname=dbname, user=user, password=password)
    try:
        applied = _fetch_applied_versions(conn)
        pending: List[Path] = []
        for p in files:
            version, _ = _parse_version_and_name(p)
            if version in applied:
                continue
            pending.append(p)

        if not pending:
            print("No pending migrations.")
            return 0

        for p in pending:
            version, _ = _parse_version_and_name(p)
            print(f"Applying {version} ({p.name}) ...")
            _apply_one(conn, p, record=True)
        print(f"Applied {len(pending)} migration(s).")
        return 0
    finally:
        conn.close()


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
