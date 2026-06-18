import { dialogComponent } from "../features/status-detail/view.js";

export function createStatusDetailComponentPort({
  resolveComponent = dialogComponent,
} = {}) {
  const component = () => resolveComponent?.() || null;
  return Object.freeze({
    renderItemDetail: (payload) => component()?.renderTranslationItemDetail?.(payload),
    renderItems: (payload) => component()?.renderTranslationItems?.(payload),
    renderReplay: (payload) => component()?.renderTranslationReplay?.(payload),
    renderSnapshot: (snapshot) => component()?.renderSnapshot?.(snapshot),
    renderSummary: (payload) => component()?.renderTranslationSummary?.(payload),
  });
}

export const defaultStatusDetailComponentPort = createStatusDetailComponentPort();
