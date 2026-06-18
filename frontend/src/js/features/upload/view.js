import { $ } from "../../dom/query.js";
import {
  setUploadTileReady,
  setUploadTileText,
} from "./tile-view.js";
import { APP_DIALOG_IDS } from "../../contracts/app-contract.js";

export function readPageRangeInputs() {
  return {
    start: $("page-range-start")?.value || "",
    end: $("page-range-end")?.value || "",
  };
}

export function setInlinePageRangeVisible(visible) {
  $("inline-page-range")?.classList.toggle("hidden", !visible);
}

export function openPageRangeDialogView({ applied = "", maxPage = 0 } = {}) {
  const limitText = $("page-range-limit-text");
  const titleEl = $("page-range-title");
  if (maxPage > 0) {
    if (limitText) {
      limitText.textContent = "选择本次翻译使用的术语表。页码范围可直接在上传区域填写。";
    }
    if (titleEl) {
      titleEl.textContent = "专业翻译";
    }
  } else {
    if (limitText) {
      limitText.textContent = "选择本次翻译使用的术语表。页码范围可直接在上传区域填写。";
    }
    if (titleEl) {
      titleEl.textContent = "专业翻译";
    }
  }
  if (maxPage > 0) {
    $("page-range-start")?.setAttribute("max", String(maxPage));
    $("page-range-end")?.setAttribute("max", String(maxPage));
  }
  $(APP_DIALOG_IDS.professionalTranslation)?.showModal();
}

export function writePageRangeInputs({ start = "", end = "" } = {}) {
  if ($("page-range-start")) {
    $("page-range-start").value = start;
  }
  if ($("page-range-end")) {
    $("page-range-end").value = end;
  }
}

export function closePageRangeDialog() {
  $(APP_DIALOG_IDS.professionalTranslation)?.close();
}

export function clearPageRangeInputs() {
  writePageRangeInputs({ start: "", end: "" });
}

export function selectedUploadFile() {
  return $("file")?.files?.[0] || null;
}

export function setFileLabel(file, defaultFileLabel) {
  setUploadTileText({
    label: file ? file.name : defaultFileLabel,
    labelTitle: file ? file.name : "",
  });
}

export function showUploadStatus(message) {
  setUploadTileText({
    status: message,
    statusVisible: true,
  });
}

export function markUploadReady(ready) {
  setUploadTileReady(ready);
}
