#!/usr/bin/env python3
"""
check_write_registry.py — CI gate for the harvester write-contract registry.
=============================================================================
The QA write-contract gate (qa/egx_audit.py) can only validate writes that are
REGISTERED in scripts/tv_egx_harvester.py::ALL_WRITE_SQL. The 2026-06-07
incident class ("column does not exist", dead-lettered 289x, zero alerts) is
prevented by that gate — but only for registered statements. This script makes
the registry impossible to forget (audit M9, 2026-06-11):

  RULE 1: every module-level SQL_* constant whose text starts a write
          (INSERT/UPDATE/DELETE) must appear as a value in ALL_WRITE_SQL.
  RULE 2: no execute()/executemany() call in the harvester may pass an inline
          write-SQL string literal — writes must go through an SQL_* constant
          (that's what makes RULE 1 sufficient).

Pure stdlib (ast). Exit 0 = registry complete; exit 1 = violation (CI fails).
"""
import ast
import sys
from pathlib import Path

HARVESTER = Path(__file__).resolve().parent / "tv_egx_harvester.py"
WRITE_PREFIXES = ("INSERT", "UPDATE", "DELETE")


def is_write_sql(text: str) -> bool:
    return text.lstrip().upper().startswith(WRITE_PREFIXES)


def main() -> int:
    tree = ast.parse(HARVESTER.read_text(), filename=str(HARVESTER))

    sql_write_constants: dict[str, int] = {}
    registered_names: set[str] = set()
    violations: list[str] = []

    for node in tree.body:
        # Module-level `SQL_FOO = "INSERT ..."` (plain or parenthesized/implicit-concat)
        if isinstance(node, ast.Assign) and len(node.targets) == 1 \
                and isinstance(node.targets[0], ast.Name) \
                and node.targets[0].id.startswith("SQL_"):
            try:
                value = ast.literal_eval(node.value)
            except (ValueError, SyntaxError):
                continue
            if isinstance(value, str) and is_write_sql(value):
                sql_write_constants[node.targets[0].id] = node.lineno
        # ALL_WRITE_SQL = { "...": SQL_FOO, ... }
        if isinstance(node, ast.Assign) and len(node.targets) == 1 \
                and isinstance(node.targets[0], ast.Name) \
                and node.targets[0].id == "ALL_WRITE_SQL" \
                and isinstance(node.value, ast.Dict):
            for v in node.value.values:
                if isinstance(v, ast.Name):
                    registered_names.add(v.id)

    # RULE 1 — every write constant is registered.
    for name, lineno in sorted(sql_write_constants.items()):
        if name not in registered_names:
            violations.append(
                f"{HARVESTER.name}:{lineno}: write constant {name} is NOT in "
                f"ALL_WRITE_SQL — the QA write-contract gate will never validate it."
            )

    # RULE 2 — no inline write-SQL literals passed straight to execute/executemany.
    for node in ast.walk(tree):
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute) \
                and node.func.attr in ("execute", "executemany") and node.args:
            first = node.args[0]
            if isinstance(first, ast.Constant) and isinstance(first.value, str) \
                    and is_write_sql(first.value):
                violations.append(
                    f"{HARVESTER.name}:{node.lineno}: inline write SQL passed to "
                    f".{node.func.attr}() — define an SQL_* constant and register "
                    f"it in ALL_WRITE_SQL instead."
                )

    if violations:
        print("WRITE-REGISTRY GATE: FAIL")
        for v in violations:
            print(f"  {v}")
        return 1

    print(f"WRITE-REGISTRY GATE: OK — {len(sql_write_constants)} write constants, "
          f"all registered; no inline write SQL.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
