import {
  idSelector,
  STATUS_DETAIL_DIALOG,
} from "./status-detail-dialog-dom-contract.js";

export function translationSummaryElements(host) {
  const { translation } = STATUS_DETAIL_DIALOG.ids;
  return {
    content: host.querySelector(idSelector(translation.debugContent)),
    empty: host.querySelector(idSelector(translation.debugEmpty)),
    status: host.querySelector(idSelector(translation.debugStatus)),
    filter: host.querySelector(idSelector(translation.listFilter)),
    counts: {
      translated: host.querySelector(idSelector(translation.countTranslated)),
      partiallyTranslated: host.querySelector(idSelector(translation.countPartiallyTranslated)),
      keptOrigin: host.querySelector(idSelector(translation.countKeptOrigin)),
      failed: host.querySelector(idSelector(translation.countFailed)),
      providerFamily: host.querySelector(idSelector(translation.providerFamily)),
    },
  };
}

export function translationItemsElements(host) {
  const { translation } = STATUS_DETAIL_DIALOG.ids;
  return {
    list: host.querySelector(idSelector(translation.itemsList)),
    empty: host.querySelector(idSelector(translation.itemsEmpty)),
    loading: host.querySelector(idSelector(translation.itemsLoading)),
    meta: host.querySelector(idSelector(translation.itemsMeta)),
    page: host.querySelector(idSelector(translation.itemsPage)),
    prevButton: host.querySelector(idSelector(translation.itemsPrev)),
    nextButton: host.querySelector(idSelector(translation.itemsNext)),
  };
}

export function translationItemDetailElements(host) {
  const { translation } = STATUS_DETAIL_DIALOG.ids;
  return {
    detail: host.querySelector(idSelector(translation.itemDetail)),
    empty: host.querySelector(idSelector(translation.itemEmpty)),
    loading: host.querySelector(idSelector(translation.itemLoading)),
    meta: host.querySelector(idSelector(translation.itemMeta)),
    replayButton: host.querySelector(idSelector(translation.itemReplay)),
  };
}

export function translationReplayElements(host) {
  const { translation } = STATUS_DETAIL_DIALOG.ids;
  return {
    result: host.querySelector(idSelector(translation.replayResult)),
    status: host.querySelector(idSelector(translation.replayStatus)),
  };
}
