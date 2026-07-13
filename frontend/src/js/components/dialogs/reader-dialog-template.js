import {
  READER_DIALOG_COPY,
  READER_DIALOG_IDS,
  READER_FRAME_PLACEHOLDER,
} from "./reader-dialog-contract.js";

export function readerDialogTemplate() {
  return `
    <dialog id="${READER_DIALOG_IDS.dialog}" class="desktop-dialog reader-dialog">
      <div class="reader-dialog-shell">
        <div class="reader-dialog-head">
          <!-- 下载入口在阅读器本体的动作组里(reader.html),宿主只保留关闭 -->
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
