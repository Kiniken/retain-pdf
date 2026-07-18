import { APP_DIALOG_IDS } from "../../contracts/app-contract.js";

export const TRANSLATION_WORKFLOW_MODES = Object.freeze({
  UPLOAD: "upload",
  STATUS: "status",
});

export const TRANSLATION_WORKFLOW_DIALOG = {
  ids: {
    dialog: APP_DIALOG_IDS.translationWorkflow,
    title: "translation-workflow-title",
    closeButton: "translation-workflow-close-btn",
  },
  datasets: {
    open: "open",
  },
  datasetValues: {
    open: "1",
    closed: "0",
  },
  classes: {
    hidden: "hidden",
    rootOpen: "translation-workflow-open",
    statusMode: "is-status-mode",
    uploadMode: "is-upload-mode",
  },
  copy: {
    statusTitle: "任务进度",
    // 图书馆优先(参考 PDF_MD_lib 的 UploadModal):添加 = 入库,不是翻译。
    uploadTitle: "添加 PDF 到图书馆",
  },
};
