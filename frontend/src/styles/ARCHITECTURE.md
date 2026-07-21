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

Everything else is **page-owned**.

## Current debt (known coupling)

1. ~~**`components.utilities.css` is oversized**~~ — P2: home-only utilities → `pages/home/components.utilities.css`; shared keeps button-link / secondary / disabled / mono / label.
2. **Reader shared files still contain small legacy leftovers** inside `layout.css` / `chrome.css`
   (三栏 resizer、bottom HUD、download menu) — safe to keep; not worth splitting further yet.
3. **Dead artifacts** (no entry imports them; safe to delete when convenient):
   - `reader.css` (`reader-dialog { display:block }`)
   - `reader-page.css` — empty stub (path compat only)

## Rules

- Entry A must not `@import` domain CSS that belongs to page B.
- New styles go next to the page domain (`pages/home|detail|reader` or existing reader/*), never into a “global dump”.
- Prefer page prefix: `library-*`, `bd-*`, `detail-*`, `reader-*`.
- After CSS or JS build changes, run `npm run build:css` (JS build must not wipe `dist/css/`).

## P0 done

- Home entry no longer imports `reader.css` or iframe host CSS.
- Home `@source` no longer scans all of `src/js/**` (excludes pure reader paths).

## P1 done

- Home-only CSS moved → `src/styles/pages/home/*`; `entries/home.css` imports updated.

## P3 done (reader default slim)

- Default `entries/reader.css` only ships react-pdf path: utilities + layout + chrome + content.
- Legacy drawers/selection/AI/markdown/annotations moved to `entries/reader-legacy.css`.
- `?engine=legacy` injects `dist/css/reader-legacy.css` from `pages/reader/entry.tsx`.
- `reader.css` (`reader-dialog`) removed from the default entry (dead).

## P4 done

- Deleted home iframe leftovers: `core/reader-dialog-host.css`, `ReaderLoadingOverlay`, postMessage/progress hooks, `reader-dialog-store`.

## P2 done

- Split `components.utilities.css` → shared (home+detail) vs `pages/home/components.utilities.css` (home-only).
- No material detail-only utilities found; detail keeps shared only.

## Next

1. Optionally peel legacy-only rules out of `layout.css` / `chrome.css`.
2. Delete dead `reader.css` / `reader-page.css` stubs when tests no longer list them.
3. Optionally prune dead `@utility` in `pages/home/components.utilities.css` (status-orbit / md-math / etc.).
