# Library Components

## Goal

`features/library` owns the React library home experience. It now has a thin backend adapter for the library API, while UI components still receive normalized `LibraryBook` data through props.

## Boundaries

- `components/*` only renders props and emits callbacks.
- `components/library-route` composes the page, dialogs, and page model.
- `model/*` owns page state, effects, and user actions.
- `api/*` owns backend requests and response adapters.
- `library-config.ts` owns static configuration and product copy.
- `library-selectors.ts` owns derived data such as counts, filtering, sorting, and navigation item construction.
- `mock-data.ts` owns development fallback data only.
- `types.ts` is the shared type source for components and data helpers.

## Component Responsibilities

- `LibraryTopBar`: top logo, search field, and settings entry.
- `LibraryRoute`: route-level container that wires model state into page/dialog components.
- `LibraryDevPreview`: development-only component preview area using mock data.
- `LibraryHomePage`: page-level library shell for the top bar, filter bar, and book grid.
- `LibraryEmptyState`: empty collection placeholder.
- `LibraryHeader`: fuller title toolbar, currently not used by the minimal home layout.
- `LibrarySidebar`: calibre-web style navigation, rendering only provided nav items.
- `LibraryFilterBar`: sort/view controls, rendering only provided options.
- `book-grid/*`: component family for the book collection layout; it does not filter, search, or sort.
- `BookGrid`: public grid component.
- `book-card/*`: component family for individual book cards. Import from `components/book-card`, not its internal files.
- `BookCard`: thin composition layer for one book card.
- `BookCardShell`: clickable card frame and selected state.
- `BookCardMeta`: title, authors, and status slot layout.
- `BookStatusBadge`: status icon and label presentation.
- `book-detail-dialog/*`: component family for the book detail modal.
- `BookDetailDialog`: public detail modal containing status, reader, and download actions.
- `BookCover`: book cover visual.
- `ActivityPanel`: reserved for a future activity feed.

## Rules

- Do not put navigation lists, filter lists, product copy, counts, or mock data inside components.
- Do not let components request APIs or read global state.
- Do not spread backend fields into presentation components; convert backend data to `LibraryBook` through `api/library-api-adapter.ts`.

## Future Integration

- Split `useLibraryController` further if downloads, deletion, upload, and live progress become independent workflows.
- Derive navigation items such as categories, authors, and tags from real data through selectors.
- Keep search and sorting state in the page/model layer and pass results through props.
