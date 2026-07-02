# Python Tests

`backend/python-tests` is the package-oriented test entrypoint for the
RetainPDF Python backend.

During the packaging transition, tests live in both `backend/python-tests` and
`backend/scripts/devtools/tests`. This directory provides the stable command
surface for running them after installing `retainpdf-core` and
`retainpdf-devtools`.

Install editable packages:

```bash
python -m pip install -e backend/packages/retainpdf-core
python -m pip install -e backend/packages/retainpdf-devtools --no-build-isolation
```

Run tests through this entrypoint:

```bash
python backend/python-tests/run_python_tests.py
python backend/python-tests/run_python_tests.py backend/scripts/devtools/tests/rendering/test_render_mode.py
```

By default, the runner collects both `backend/python-tests` and
`backend/scripts/devtools/tests`. If you pass an explicit test path, the runner
passes your selection through to pytest without adding the default roots.

Migration rule:

- New Python backend tests should be added under `backend/python-tests/<area>/`.
- Existing tests under `backend/scripts/devtools/tests` should move here by
  area once their imports no longer need local `sys.path` shims.
- Product tests should import installed packages (`foundation`, `runtime`,
  `services`) instead of editing `sys.path` in each test file.
- Devtools tests should import `devtools.*`; `devtools` remains outside the
  production `retainpdf-core` wheel.
