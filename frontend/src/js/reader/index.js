import {
  bindResizeRefresh,
} from "./pdf-controller.js";
import {
  setReaderBootLoading,
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
import {
  resolveReaderJobId,
  resolveReaderSourcePdf,
  resolveReaderTranslatedPdfUrl,
} from "./resource-resolver.js";
import { createReaderInitializer } from "./startup.js";
import { mountReaderPdfPair } from "./viewer-mount-flow.js";

const pageState = createReaderPageState();

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

    bindReaderInteractions({
      apiPrefix: defaultReaderDataPort.apiPrefix,
      fetchTranslationItem: defaultReaderDataPort.fetchRegionTranslationItem,
      jobId,
      pageState,
      readerMetadata,
      regionsPayload,
      sourceReady,
      translatedReady,
    });
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
