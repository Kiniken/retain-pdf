import test, { before } from "node:test";
import assert from "node:assert/strict";

let downloadActions;

before(async () => {
  global.window = global.window || {
    __FRONT_RUNTIME_CONFIG__: {},
    location: { href: "http://localhost/" },
  };
  downloadActions = await import("../src/js/features/artifact-downloads/download-actions.js");
});

test("protected artifact selector is built from centralized action ids", () => {
  const { DOWNLOAD_ACTION_IDS, PROTECTED_ARTIFACT_SELECTOR } = downloadActions;
  for (const id of Object.values(DOWNLOAD_ACTION_IDS)) {
    assert.equal(PROTECTED_ARTIFACT_SELECTOR.includes(`#${id}`), true, id);
  }
});

test("status card download action ids come from the shared status card contract", async () => {
  const { DOWNLOAD_ACTION_IDS } = downloadActions;
  const { STATUS_CARD_IDS } = await import("../src/js/components/status/job-status-card-dom-contract.js");

  assert.equal(DOWNLOAD_ACTION_IDS.STATUS_MARKDOWN_BUNDLE, STATUS_CARD_IDS.markdownBundleButton);
  assert.equal(DOWNLOAD_ACTION_IDS.SOURCE_PDF, STATUS_CARD_IDS.sourcePdfButton);
  assert.equal(DOWNLOAD_ACTION_IDS.PDF, STATUS_CARD_IDS.pdfButton);
  assert.equal(DOWNLOAD_ACTION_IDS.BUNDLE, STATUS_CARD_IDS.legacyBundleButton);
  assert.equal(DOWNLOAD_ACTION_IDS.MARKDOWN_JSON, STATUS_CARD_IDS.legacyMarkdownJsonButton);
  assert.equal(DOWNLOAD_ACTION_IDS.MARKDOWN_RAW, STATUS_CARD_IDS.legacyMarkdownRawButton);
});

test("download action target names markdown bundle by job id", () => {
  const {
    downloadActionForLink,
    DOWNLOAD_ACTION_IDS,
    resolveDownloadActionTarget,
  } = downloadActions;
  const action = downloadActionForLink({ id: DOWNLOAD_ACTION_IDS.STATUS_MARKDOWN_BUNDLE });
  const target = resolveDownloadActionTarget({
    action,
    state: {},
    jobId: "job-1",
  });

  assert.equal(target.fallbackName, "job-1-markdown.zip");
  assert.equal(target.preferredName, "job-1-markdown.zip");
  assert.equal(target.preferSuggestedName, false);
});

test("download action target prefers injected artifact names for translated and source PDFs", () => {
  const {
    downloadActionForLink,
    DOWNLOAD_ACTION_IDS,
    resolveDownloadActionTarget,
  } = downloadActions;
  const state = {
    currentJobManifest: {
      items: [
        {
          artifact_key: "source_pdf",
          file_name: "book.pdf",
          ready: true,
        },
      ],
    },
  };

  const translated = resolveDownloadActionTarget({
    action: downloadActionForLink({ id: DOWNLOAD_ACTION_IDS.PDF }),
    state,
    jobId: "job-1",
    nameResolver: {
      resolveSourcePdfName: (_nextState, fallbackName) => fallbackName,
      resolveTranslatedPdfName: () => "zh_book.pdf",
    },
  });
  const source = resolveDownloadActionTarget({
    action: downloadActionForLink({ id: DOWNLOAD_ACTION_IDS.SOURCE_PDF }),
    state,
    jobId: "job-1",
    nameResolver: {
      resolveSourcePdfName: () => "book.pdf",
      resolveTranslatedPdfName: (_nextState, fallbackName) => fallbackName,
    },
  });

  assert.equal(translated.fallbackName, "job-1.pdf");
  assert.equal(translated.preferredName, "zh_book.pdf");
  assert.equal(translated.preferSuggestedName, true);
  assert.equal(source.fallbackName, "job-1-source.pdf");
  assert.equal(source.preferredName, "book.pdf");
  assert.equal(source.preferSuggestedName, true);
});

test("artifact download view port owns protected link binding and disabled checks", async () => {
  const { createArtifactDownloadViewPort } = await import("../src/js/features/artifact-downloads/download-view-port.js");
  const calls = [];
  const port = createArtifactDownloadViewPort({
    bindProtectedLinks: (handler) => calls.push(["bind", typeof handler]),
    isLinkDisabled: (link) => link.disabled === true,
    setLinkBusy: (link, busy, text) => calls.push(["busy", link.id, busy, text]),
  });

  port.bindProtectedLinks(() => {});
  port.setLinkBusy({ id: "download-pdf-btn" }, true, "下载中...");

  assert.equal(port.isLinkDisabled({ disabled: true }), true);
  assert.equal(port.isLinkDisabled({ disabled: false }), false);
  assert.deepEqual(calls, [
    ["bind", "function"],
    ["busy", "download-pdf-btn", true, "下载中..."],
  ]);
});

test("artifact downloads controller routes view operations through view port", async () => {
  const { mountArtifactDownloadsFeature } = await import("../src/js/features/artifact-downloads/controller.js");
  const calls = [];
  let handler = null;
  const feature = mountArtifactDownloadsFeature({
    state: {},
    fetchProtected: async () => {
      throw new Error("fetch should not run for disabled links");
    },
    setText: (...args) => calls.push(["setText", ...args]),
    viewPort: {
      bindProtectedLinks: (nextHandler) => {
        calls.push(["bind", typeof nextHandler]);
        handler = nextHandler;
      },
      isLinkDisabled: (link) => {
        calls.push(["disabled", link.id]);
        return true;
      },
      setLinkBusy: (...args) => calls.push(["busy", ...args]),
    },
  });
  const event = {
    currentTarget: null,
    preventDefault: () => calls.push(["preventDefault"]),
  };
  const link = {
    id: "download-pdf-btn",
    dataset: { url: "/protected.pdf" },
  };

  feature.bindEvents();
  await handler(event, link);

  assert.deepEqual(calls, [
    ["bind", "function"],
    ["disabled", "download-pdf-btn"],
    ["preventDefault"],
  ]);
});
