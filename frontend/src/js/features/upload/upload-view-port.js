import {
  clearPageRangeInputs as defaultClearPageRangeInputs,
  closePageRangeDialog as defaultClosePageRangeDialog,
  markUploadReady as defaultMarkUploadReady,
  openPageRangeDialogView as defaultOpenPageRangeDialogView,
  readPageRangeInputs as defaultReadPageRangeInputs,
  selectedUploadFile as defaultSelectedUploadFile,
  setFileLabel as defaultSetFileLabel,
  setInlinePageRangeVisible as defaultSetInlinePageRangeVisible,
  showUploadStatus as defaultShowUploadStatus,
  writePageRangeInputs as defaultWritePageRangeInputs,
} from "./view.js";

export function createUploadViewPort({
  clearPageRanges = defaultClearPageRangeInputs,
  closePageRangeDialog = defaultClosePageRangeDialog,
  markUploadReady = defaultMarkUploadReady,
  openPageRangeDialog = defaultOpenPageRangeDialogView,
  readPageRanges = defaultReadPageRangeInputs,
  selectedFile = defaultSelectedUploadFile,
  setFileLabel = defaultSetFileLabel,
  setInlinePageRangeVisible = defaultSetInlinePageRangeVisible,
  showUploadStatus = defaultShowUploadStatus,
  writePageRanges = defaultWritePageRangeInputs,
} = {}) {
  return {
    clearPageRanges,
    closePageRangeDialog,
    markUploadReady,
    openPageRangeDialog,
    readPageRanges,
    selectedFile,
    setFileLabel,
    setInlinePageRangeVisible,
    showUploadStatus,
    writePageRanges,
  };
}
