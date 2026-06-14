# retainpdf-devtools

`retainpdf-devtools` packages RetainPDF local diagnostics, migration helpers,
benchmarks, and repository maintenance commands separately from the production
Python worker runtime.

Install from the repository root after installing or making `retainpdf-core`
available:

```bash
python -m pip install -e backend/packages/retainpdf-core
python -m pip install -e backend/packages/retainpdf-devtools --no-build-isolation
```

Common commands:

```bash
retainpdf-count-code
retainpdf-check-pipeline-architecture
retainpdf-check-stage-specs
retainpdf-run-golden-flow
retainpdf-replay-translation-item
retainpdf-translation-repair
retainpdf-export-layout-docx
```

`devtools.tests`, `devtools.experiments`, and one-off examples under
`devtools.tools` are intentionally excluded from the wheel. They remain
repository-only development assets.
