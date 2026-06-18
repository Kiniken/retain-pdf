import {
  renderTranslationEmpty as renderTranslationEmptyView,
  renderTranslationItemDetail as renderTranslationItemDetailView,
  renderTranslationItems as renderTranslationItemsView,
  renderTranslationReplay as renderTranslationReplayView,
  renderTranslationSummary as renderTranslationSummaryView,
} from "./translation-presenter.js";

export function renderTranslationEmpty(message, options = {}) {
  renderTranslationEmptyView(message, options);
}

export function renderTranslationSummary(translationState, options = {}) {
  renderTranslationSummaryView(translationState, options);
}

export function renderTranslationItems(
  translationState,
  { loading = false, emptyText = "没有匹配的翻译 item", viewPort } = {},
) {
  renderTranslationItemsView(translationState, { loading, emptyText, viewPort });
}

export function renderTranslationItemDetail(
  translationState,
  { loading = false, emptyText = "请选择左侧 item", viewPort } = {},
) {
  renderTranslationItemDetailView(translationState, { loading, emptyText, viewPort });
}

export function renderTranslationReplay(translationState, options = {}) {
  renderTranslationReplayView(translationState, options);
}
