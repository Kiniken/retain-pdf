# Status Components

## Goal

`features/status` owns the task status card. It is reused by the library detail modal, task pages, and future API-backed status views.

## Boundaries

- `StatusCard` only orchestrates the card layout and selected stage state.
- `components/*` are independent presentation components.
- `status-config.ts` owns static stage/substage configuration and product copy.
- `status-progress.ts` owns progress calculation.
- `types.ts` defines the stable frontend `StatusSnapshot`.

## Component Responsibilities

- `StatusCardHeader`: cancel, elapsed time, and home actions.
- `StatusStageFlow`: OCR, translate, render, and done stage navigation.
- `StatusAnimationPanel`: stage animation area and error summary.
- `StatusSubstageFlow`: translate substage display.
- `StatusProgressBlock`: progress bar and progress text.
- `StatusResultActions`: reader and download actions after completion.
- `StatusCardFooter`: detail entry.

## Rules

- Do not put backend API field names or legacy frontend DOM ids inside status components.
- Do not put mock state inside presentation components.
- Do not parse OCR/translation/render contracts in components; adapters should convert data to `StatusSnapshot`.

## Future Integration

- Convert legacy frontend snapshots or backend events to `StatusSnapshot` through adapters.
- Lottie/real animations can be wired into `StatusAnimationPanel`, but asset paths should come from config or props.
