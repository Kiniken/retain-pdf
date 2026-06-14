"""Run RetainPDF Python tests through the package-oriented test entrypoint."""

from __future__ import annotations

import sys
from pathlib import Path

import pytest


REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_TEST_ROOT = REPO_ROOT / "backend" / "scripts" / "devtools" / "tests"
PYTEST_INI = Path(__file__).resolve().parent / "pytest.ini"


def main() -> int:
    args = sys.argv[1:]
    if not any(not arg.startswith("-") for arg in args):
        args.append(str(DEFAULT_TEST_ROOT))
    return pytest.main(["-c", str(PYTEST_INI), *args])


if __name__ == "__main__":
    raise SystemExit(main())
