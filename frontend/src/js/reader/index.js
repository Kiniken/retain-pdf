import {
  bindResizeRefresh,
  scheduleScaleRefresh,
} from "./pdf-controller.js";
import "../components/feedback/download-toast.js";
import {
  setReaderBootLoading,
  setReaderModeHud,
  showBothReaderEmpty,
  showReaderPaneEmpty,
} from "./view.js";
import {
  defaultReaderPageConfigPort,
} from "./config-port.js";
import { defaultReaderDataPort } from "./data-port.js";
import {
  READER_PROGRESS_COPY,
  createReaderPageState,
  resetReaderProgressState,
} from "./page-state.js";
import {
  defaultReaderProgressPresenter,
} from "./progress-presenter.js";
import { bindReaderInteractions } from "./interaction-flow.js";
import { createReaderChromeController } from "./chrome-controller.js";
import { createReaderModeController } from "./mode-controller.js";
import { createReaderSelectionFavorites } from "./selection-favorites.js";
import { createReaderSideDrawers } from "./side-drawers.js";
import {
  resolveReaderJobId,
  resolveReaderSourcePdf,
  resolveReaderTranslatedPdfUrl,
} from "./resource-resolver.js";
import { createReaderInitializer } from "./startup.js";
import { mountReaderPdfPair } from "./viewer-mount-flow.js";

const pageState = createReaderPageState();
let readerInteractionController = null;
const readerChromeController = createReaderChromeController();
const readerModeController = createReaderModeController({
  onModeChanged: () => {
    readerInteractionController?.syncIndicatorForMode?.();
    readerChromeController.wake();
    scheduleScaleRefresh();
  },
  onModeHudChanged: setReaderModeHud,
});
const readerSideDrawers = createReaderSideDrawers({
  onActiveChanged: () => scheduleScaleRefresh(),
});

function applyReaderBootProgress(percent, text, stage = "progress") {
  defaultReaderProgressPresenter.apply({
    bootProgressBarState: pageState.bootProgressBar,
    percent,
    stage,
    text,
  });
}

function syncReaderBootProgress() {
  defaultReaderProgressPresenter.sync(pageState);
}

export async function initializeReader() {
  bindResizeRefresh();
  readerChromeController.bindEvents();
  readerModeController.bindEvents();
  readerSideDrawers.bindEvents();
  setReaderBootLoading(true);
  resetReaderProgressState(pageState);
  syncReaderBootProgress();

  const jobId = resolveReaderJobId(defaultReaderPageConfigPort);
  if (!jobId) {
    showBothReaderEmpty();
    applyReaderBootProgress(100, READER_PROGRESS_COPY.failed, "failed");
    setReaderBootLoading(false);
    return;
  }
  try {
    applyReaderBootProgress(14, READER_PROGRESS_COPY.metadata, "metadata");
    const {
      jobPayload,
      manifestPayload,
      readerMetadata,
      regionsPayload,
    } = await defaultReaderDataPort.loadReaderPayload(jobId);
    pageState.progress.metadataReady = true;
    syncReaderBootProgress();

    const sourcePdf = resolveReaderSourcePdf(manifestPayload);
    const translatedPdfUrl = resolveReaderTranslatedPdfUrl(jobPayload, manifestPayload);

    const { sourceReady, translatedReady } = await mountReaderPdfPair({
      fetchProtected: defaultReaderDataPort.fetchProtected,
      sourcePdf,
      translatedPdfUrl,
      onSourceSettled: () => {
        pageState.progress.sourceDone = true;
        syncReaderBootProgress();
      },
      onTranslatedSettled: () => {
        pageState.progress.translatedDone = true;
        syncReaderBootProgress();
      },
    });

    if (!sourceReady) {
      showReaderPaneEmpty("reader-pdf", "reader-pdf-empty");
    }
    if (!translatedReady) {
      showReaderPaneEmpty("reader-translated-pdf", "reader-translation-empty");
    }
    if (!sourceReady && !translatedReady) {
      return;
    }

    readerInteractionController = bindReaderInteractions({
      apiPrefix: defaultReaderDataPort.apiPrefix,
      fetchTranslationItem: defaultReaderDataPort.fetchRegionTranslationItem,
      jobId,
      pageState,
      readerMetadata,
      regionsPayload,
      sourceReady,
      translatedReady,
    });
    createReaderSelectionFavorites({
      drawerController: readerSideDrawers,
      jobId,
      setReaderMode: readerModeController.setMode,
    }).bindEvents();
    applyReaderBootProgress(100, READER_PROGRESS_COPY.ready, "ready");
    setReaderBootLoading(false);
  } catch (_err) {
    showBothReaderEmpty();
    applyReaderBootProgress(100, READER_PROGRESS_COPY.failed, "failed");
    setReaderBootLoading(false);
  }
}

export const startReader = createReaderInitializer({
  initializeReader,
});

startReader();
