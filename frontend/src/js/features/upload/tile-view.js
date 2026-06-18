import { $ } from "../../dom/query.js";

export function uploadTileElements() {
  const fileInput = $("file");
  return {
    fileInput,
    tile: fileInput?.closest(".upload-tile") || null,
    glyph: $("upload-glyph"),
    label: $("file-label"),
    help: $("upload-help"),
    meta: document.querySelector(".upload-meta"),
    status: $("upload-status"),
    progressPanel: $("upload-progress-panel"),
    actionSlot: $("upload-action-slot"),
    progressFill: $("upload-fill"),
    progressText: $("upload-progress-text"),
  };
}

export function setUploadTileLocked({ locked = false, enabled = !locked } = {}) {
  const { fileInput, tile, glyph, meta } = uploadTileElements();
  if (fileInput) {
    fileInput.disabled = !enabled;
  }
  tile?.classList.toggle("is-locked", Boolean(locked));
  glyph?.classList.toggle("hidden", !enabled);
  meta?.classList.toggle("hidden", !enabled);
}

export function setUploadTileText({
  label = "",
  labelTitle = "",
  help = "",
  status = "",
  statusVisible = null,
  labelVisible = true,
  helpVisible = true,
} = {}) {
  const elements = uploadTileElements();
  if (elements.label && label) {
    elements.label.textContent = label;
    elements.label.title = labelTitle;
  }
  elements.label?.classList.toggle("hidden", !labelVisible);
  if (elements.help && help) {
    elements.help.textContent = help;
  }
  elements.help?.classList.toggle("hidden", !helpVisible);
  if (elements.status) {
    if (status) {
      elements.status.textContent = status;
    }
    const visible = statusVisible ?? Boolean(status);
    elements.status.classList.toggle("hidden", !visible);
  }
}

export function setUploadTileReady(ready) {
  const { tile } = uploadTileElements();
  tile?.classList.toggle("is-ready", !!ready);
  tile?.classList.remove("is-uploading");
}

export function setUploadActionSlotVisible(visible) {
  uploadTileElements().actionSlot?.classList.toggle("hidden", !visible);
}

export function setUploadProgressVisible(visible) {
  uploadTileElements().progressPanel?.classList.toggle("hidden", !visible);
}

export function setUploadTileUploading({ uploading = false } = {}) {
  const { tile } = uploadTileElements();
  tile?.classList.toggle("is-uploading", Boolean(uploading));
  if (uploading) {
    tile?.classList.remove("is-ready");
    setUploadProgressVisible(true);
    setUploadActionSlotVisible(false);
  }
}

export function setUploadProgressFill({ percent = 0, text = "" } = {}) {
  const { progressFill, progressText } = uploadTileElements();
  if (progressFill) {
    progressFill.style.width = `${Math.max(0, Math.min(100, Number(percent) || 0))}%`;
  }
  if (progressText && text) {
    progressText.textContent = text;
  }
}

export function resetUploadTileView({ defaultFileLabel = "" } = {}) {
  const { fileInput, tile, status } = uploadTileElements();
  if (fileInput) {
    fileInput.value = "";
  }
  setUploadProgressVisible(false);
  setUploadTileReady(false);
  setUploadProgressFill({ percent: 0, text: "上传中" });
  setUploadActionSlotVisible(false);
  tile?.classList.remove("is-uploading");
  if (status) {
    status.textContent = "未上传文件";
    status.classList.add("hidden");
  }
  setUploadTileText({
    label: defaultFileLabel,
    labelTitle: "",
    statusVisible: false,
  });
}
