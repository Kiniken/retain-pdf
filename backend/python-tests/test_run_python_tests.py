"""Tests for the Python test runner argument handling."""

from __future__ import annotations

import sys

import run_python_tests


def test_default_run_collects_new_and_legacy_tests(monkeypatch) -> None:
    captured_args: list[str] = []

    def fake_pytest_main(args: list[str]) -> int:
        captured_args.extend(args)
        return 0

    monkeypatch.setattr(sys, "argv", ["run_python_tests.py", "-q"])
    monkeypatch.setattr(run_python_tests.pytest, "main", fake_pytest_main)

    assert run_python_tests.main() == 0

    assert captured_args == [
        "-c",
        str(run_python_tests.PYTEST_INI),
        "-q",
        str(run_python_tests.REPO_ROOT / "backend" / "python-tests"),
        str(run_python_tests.REPO_ROOT / "backend" / "scripts" / "devtools" / "tests"),
    ]


def test_explicit_test_path_is_respected(monkeypatch) -> None:
    captured_args: list[str] = []
    explicit_path = "backend/python-tests/rendering/test_render_source_paths.py"

    def fake_pytest_main(args: list[str]) -> int:
        captured_args.extend(args)
        return 0

    monkeypatch.setattr(sys, "argv", ["run_python_tests.py", explicit_path, "-q"])
    monkeypatch.setattr(run_python_tests.pytest, "main", fake_pytest_main)

    assert run_python_tests.main() == 0

    assert captured_args == [
        "-c",
        str(run_python_tests.PYTEST_INI),
        explicit_path,
        "-q",
    ]


def test_pytest_option_values_do_not_suppress_default_roots(monkeypatch) -> None:
    captured_args: list[str] = []

    def fake_pytest_main(args: list[str]) -> int:
        captured_args.extend(args)
        return 0

    monkeypatch.setattr(sys, "argv", ["run_python_tests.py", "-k", "render_source", "-q"])
    monkeypatch.setattr(run_python_tests.pytest, "main", fake_pytest_main)

    assert run_python_tests.main() == 0

    assert captured_args == [
        "-c",
        str(run_python_tests.PYTEST_INI),
        "-k",
        "render_source",
        "-q",
        str(run_python_tests.REPO_ROOT / "backend" / "python-tests"),
        str(run_python_tests.REPO_ROOT / "backend" / "scripts" / "devtools" / "tests"),
    ]
