# Frontend CSS architecture

## Goal

Three independent page bundles — no cross-page domain leakage.

| HTML | Entry | Output |
|------|--------|--------|
| `index.html` | `entries/home.css` | `dist/css/home.css` |
| `detail.html` | `entries/detail.css` | `dist/css/detail.css` |
| `reader.html` | `entries/reader.css` | `dist/css/reader.css` |
| (legacy engine) | `entries/reader-legacy.css` | `dist/css/reader-legacy.css` |

## Allowed shared layer

Only these may appear in more than one entry:

- `tokens.css` / `shadcn-theme.css` / `base.css` / `core/tailwind-theme.css`
- `components.css` + `components.utilities.css` (generic UI)
- `dialog-shell.css`
- `core/download-toast.css`
- `reader/markdown.css` (default float + legacy drawer both use content classes)

Everything else is **page-owned**.

## Rules

- Entry A must not `@import` domain CSS that belongs to page B.
- New styles go next to the page domain (`pages/home|detail|reader` or existing reader/*), never into a “global dump”.
- Prefer page prefix: `library-*`, `bd-*`, `detail-*`, `reader-*`.
- After CSS or JS build changes, run `npm run build:css` (JS build must not wipe `dist/css/`).

## Reader packages

**Default (`entries/reader.css`)** — react-pdf only:

- `layout.css` / `chrome.css` / `content.css` (shared shell, no three-column)
- `react-pdf.css` / `hud.css`
- `fab*.css` / `selection-pop.css` / `notes-float.css` / `float-markdown.css`
- `float-ai*.css` (assistant-ui; no legacy chat skin)
- `markdown.css`

**Legacy (`entries/reader-legacy.css`)** — `?engine=legacy` only:

- `layout-legacy.css` / `chrome-legacy.css`
- `side-drawer` / `favorites` / `selection` / `ai` / `annotations` / `region-popover`
- re-imports `markdown.css`

## Done (selected)

- P0–P4: home/detail/reader split; iframe host removed; components.utilities peeled.
- P3/P5: reader default slim; content/AI/FAB modularized.
- **P6 residual purge**: removed dead `reader.css` / `reader-page.css` stubs; dropped
  `float-ai-legacy-chat.css` and default-entry `ai.css`; peeled three-column / download
  menu / chrome-muted into `layout-legacy.css` + `chrome-legacy.css`.

## Next

1. Optionally prune dead `@utility` in `pages/home/components.utilities.css`.
2. When `?engine=legacy` is retired, delete `entries/reader-legacy.css` and `reader/*-legacy.css` / drawer modules.
