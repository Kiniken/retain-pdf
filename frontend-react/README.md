# RetainPDF React Frontend

This app is the React migration workspace for RetainPDF. The current phase focuses on component boundaries, the library home experience, and a thin backend API adapter.

## Commands

```bash
source ~/.nvm/nvm.sh
nvm use 22
npm run dev
npm run build
```

The development server is fixed to port `40002`.

## Directory Rules

- Use lowercase kebab-case for folders and files: `book-card`, `library-top-bar.tsx`.
- Use PascalCase for exported React components: `BookCard`, `LibraryTopBar`.
- Keep feature code under `src/features/<feature>`.
- Keep shared primitives under `src/components/ui`.
- Keep shared utilities under `src/lib`.
- Do not create more than two component directory levels unless a feature is being split into a larger domain.

## Import Rules

- Page and cross-feature code should import from public feature exits:
  - `@/features/library`
  - `@/features/status`
  - `@/components/ui`
- Component-family internals may use local relative imports.
- Do not import from another feature's internal `components/*` files.
- Add an `index.ts` when a folder is intended to be imported by outside code.
- Avoid exporting private helper components from feature exits.

## Component Family Rules

- Single-file components can live directly under `components`.
- When a component grows past three files, move it into a folder such as `components/book-card`.
- Each component family folder should include:
  - `index.ts`
  - one public composition component
  - private presentation pieces
  - `README.md` when the boundary is not obvious

## Data And Copy Rules

- Components render props and emit callbacks only.
- Product copy and static UI lists live in feature config files.
- Mock data lives in `mock-data.ts`.
- Derived data lives in selectors.
- Backend API responses should be converted through adapters before reaching components.
- Page state and user actions live in feature `model` hooks, then route containers wire them into components.
