import {
  READER_DIALOG_BUTTON_IDS,
  READER_DIALOG_COPY,
  READER_DIALOG_IDS,
  READER_FRAME_PLACEHOLDER,
} from "./reader-dialog-contract.js";

function downloadIconMarkup(extra = "") {
  return `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 6.25v7.7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M9.35 11.8 12 14.45l2.65-2.65" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M7.25 17.35h9.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      ${extra}
    </svg>
  `;
}

function splitPdfIconMarkup() {
  return `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4.75" y="6.25" width="5.75" height="11.5" rx="1.6" stroke="currentColor" stroke-width="1.45"/>
      <rect x="13.5" y="6.25" width="5.75" height="11.5" rx="1.6" stroke="currentColor" stroke-width="1.45"/>
      <path d="M12 5.3v13.4" stroke="currentColor" stroke-width="1.45" stroke-linecap="round"/>
    </svg>
  `;
}

export function readerDialogTemplate() {
  const translatedIconExtra = `
    <path d="M7.4 8.1h2.3" stroke="currentColor" stroke-width="1.45" stroke-linecap="round"/>
    <path d="M14.3 8.1h2.3" stroke="currentColor" stroke-width="1.45" stroke-linecap="round"/>
  `;
  return `
    <dialog id="${READER_DIALOG_IDS.dialog}" class="desktop-dialog reader-dialog">
      <div class="reader-dialog-shell">
        <div class="reader-dialog-head">
          <div class="reader-dialog-toolbar">
            <button id="${READER_DIALOG_BUTTON_IDS.source}" type="button" class="reader-dialog-toolbar-btn secondary" disabled>
              ${downloadIconMarkup()}
              <span>原始 PDF</span>
            </button>
            <button id="${READER_DIALOG_BUTTON_IDS.merged}" type="button" class="reader-dialog-toolbar-btn secondary" disabled>
              ${splitPdfIconMarkup()}
              <span>对照 PDF</span>
            </button>
            <button id="${READER_DIALOG_BUTTON_IDS.translated}" type="button" class="reader-dialog-toolbar-btn secondary" disabled>
              ${downloadIconMarkup(translatedIconExtra)}
              <span>译文 PDF</span>
            </button>
          </div>
          <button id="${READER_DIALOG_IDS.closeButton}" type="button" class="dialog-close-btn" aria-label="关闭">×</button>
        </div>
        <div id="${READER_DIALOG_IDS.loading}" class="reader-dialog-loading hidden" aria-live="polite">
          <div class="reader-dialog-loading-card">
            <div class="reader-dialog-loading-head">
              <div id="${READER_DIALOG_IDS.loadingText}" class="reader-dialog-loading-text">${READER_DIALOG_COPY.preparing}</div>
              <div id="${READER_DIALOG_IDS.loadingPercent}" class="reader-dialog-loading-percent">0%</div>
            </div>
            <div class="reader-dialog-loading-track">
              <span id="${READER_DIALOG_IDS.loadingBar}" class="reader-dialog-loading-bar"></span>
            </div>
          </div>
        </div>
        <iframe
          id="${READER_DIALOG_IDS.frame}"
          class="reader-dialog-frame"
          title="对照阅读"
          srcdoc="${READER_FRAME_PLACEHOLDER}"
        ></iframe>
      </div>
    </dialog>
  `;
}
