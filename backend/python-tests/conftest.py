"""Pytest bootstrap for package-oriented RetainPDF Python tests."""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
SCRIPTS_ROOT = REPO_ROOT / "backend" / "scripts"


def _ensure_package_imports_available() -> None:
    """Prefer installed packages, but keep source checkout fallback for now."""

    if importlib.util.find_spec("services") is not None:
        return
    sys.path.insert(0, str(SCRIPTS_ROOT))


_ensure_package_imports_available()
