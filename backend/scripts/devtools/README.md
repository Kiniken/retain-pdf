# Devtools

`devtools/` holds local diagnostics, migration helpers, probes, and other scripts that are useful while developing RetainPDF but are not part of the production pipeline.

## Code size

Run the repository code counter from the project root:

```bash
python backend/scripts/devtools/count_code.py
```

Useful options:

- `--json` prints the same totals as JSON.
- `--all` relaxes the default source and directory filters while still skipping `.git`, binary files, and files larger than 2 MiB.

The default scan skips obvious dependencies, caches, build outputs, temporary data, and job data such as `node_modules/`, `target/`, `dist/`, `build/`, `__pycache__/`, `.venv/`, `data/jobs/`, and `tmp/`.
