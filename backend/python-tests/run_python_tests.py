"""Run RetainPDF Python tests through the package-oriented test entrypoint."""

from __future__ import annotations

import sys
from pathlib import Path

import pytest


REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_TEST_ROOTS = (
    REPO_ROOT / "backend" / "python-tests",
    REPO_ROOT / "backend" / "scripts" / "devtools" / "tests",
)
PYTEST_INI = Path(__file__).resolve().parent / "pytest.ini"


_PYTEST_OPTIONS_WITH_VALUE = {
    "-k",
    "-m",
    "-c",
    "--confcutdir",
    "--cov",
    "--cov-report",
    "--deselect",
    "--ignore",
    "--ignore-glob",
    "--junitxml",
    "--log-cli-level",
    "--log-file",
    "--log-level",
    "--maxfail",
    "--rootdir",
    "--tb",
}


def _has_explicit_test_path(args: list[str]) -> bool:
    skip_next = False
    for arg in args:
        if skip_next:
            skip_next = False
            continue
        if arg in _PYTEST_OPTIONS_WITH_VALUE:
            skip_next = True
            continue
        if arg.startswith("-"):
            continue
        path_part = arg.split("::", 1)[0]
        if "::" in arg or "/" in path_part or "\\" in path_part or path_part.endswith(".py"):
            return True
        if (REPO_ROOT / path_part).exists() or Path(path_part).exists():
            return True
    return False


def main() -> int:
    args = sys.argv[1:]
    if not _has_explicit_test_path(args):
        args.extend(str(root) for root in DEFAULT_TEST_ROOTS)
    return pytest.main(["-c", str(PYTEST_INI), *args])


if __name__ == "__main__":
    raise SystemExit(main())
