// upload 域视图 store + React viewPort。
//
// 旧世界 features/upload/upload-view-port.js + tile-view.js 直接写 DOM;
// React 世界里 mountUploadFeature(纯逻辑控制器,原样复用)拿到的是本文件
// 生成的 viewPort:所有"写视图"落到 store,由 HeroUpload.jsx 订阅渲染;
// "读视图"(selectedFile/readPageRanges)从 domRefs / store 取。
// 各方法语义逐条镜像 tile-view.js / view.js / ui/job-actions-view.js。
//
// 注意:File 对象不进 store(store 会 structuredClone 深拷贝),
// 文件本体始终从 domRefs.fileInput(React ref 回填)读取。

import { createStore } from "../../../../js/app-framework/store.js";
import { DEFAULT_FILE_LABEL } from "../../../../js/config/upload-constants.js";

// 初始值镜像 partials/main-content.html 的静态骨架(水合前状态)
export function createUploadViewStore() {
  return createStore({
    name: "homeUploadView",
    initialState: {
      tileLocked: false,
      tileEnabled: true,
      ready: false,
      uploading: false,
      label: "添加 PDF",
      labelTitle: "",
      labelVisible: true,
      help: "上传后会先完成文件校验，再进入任务处理。",
      helpVisible: true,
      status: "尚未选择文件",
      statusVisible: false,
      progressVisible: false,
      progressPercent: 0,
      progressText: "上传中",
      actionSlotVisible: false,
      inlinePageRangeVisible: false,
      pageRangeStart: "",
      pageRangeEnd: "",
      pageRangeMax: 0,
      pageRangeDialogOpen: false,
      credentialGateVisible: false,
    },
    actions: {
      patch(currentState, payload = {}) {
        return { ...currentState, ...payload };
      },
    },
  });
}

export function createUploadViewFeature({ store = createUploadViewStore() } = {}) {
  // React ref 回填点:HeroUpload.jsx 挂载 #file 后写入
  const domRefs = { fileInput: null };

  const patch = (payload) => store.actions.patch(payload);

  // ---- tile-view.js 镜像(workflow viewPort 经 uploadTilePort 也走这组) ----

  function setUploadTileLocked({ locked = false, enabled = !locked } = {}) {
    patch({ tileLocked: Boolean(locked), tileEnabled: Boolean(enabled) });
  }

  function setUploadTileText({
    label = "",
    labelTitle = "",
    help = "",
    status = "",
    statusVisible = null,
    labelVisible = true,
    helpVisible = true,
  } = {}) {
    const next = { labelVisible: Boolean(labelVisible), helpVisible: Boolean(helpVisible) };
    if (label) {
      next.label = label;
      next.labelTitle = labelTitle;
    }
    if (help) {
      next.help = help;
    }
    if (status) {
      next.status = status;
    }
    next.statusVisible = Boolean(statusVisible ?? Boolean(status));
    patch(next);
  }

  function setUploadTileReady(ready) {
    patch({ ready: Boolean(ready), uploading: false });
  }

  function setUploadActionSlotVisible(visible) {
    patch({ actionSlotVisible: Boolean(visible) });
  }

  // ---- ui/job-actions-view.js 镜像(上传进度/复位链) ----

  function setUploadProgress(loaded, total) {
    const hasNumbers = Number.isFinite(loaded) && Number.isFinite(total) && total > 0;
    const percent = hasNumbers
      ? Math.max(0, Math.min(100, (loaded / total) * 100))
      : 18;
    patch({
      progressVisible: true,
      uploading: true,
      ready: false,
      actionSlotVisible: false,
      progressPercent: percent,
      progressText: hasNumbers ? `上传中 ${percent.toFixed(0)}%` : "上传中",
    });
  }

  function resetUploadProgress() {
    patch({
      progressVisible: false,
      uploading: false,
      progressPercent: 0,
      progressText: "上传中",
    });
  }

  function clearFileInputValue() {
    if (domRefs.fileInput) {
      domRefs.fileInput.value = "";
    }
  }

  // 视图侧复位(resetUploadedFileView 口径);上传状态归零由 composition 补上
  function resetUploadedFileView() {
    clearFileInputValue();
    patch({
      progressVisible: false,
      uploading: false,
      ready: false,
      progressPercent: 0,
      progressText: "上传中",
      actionSlotVisible: false,
      status: "未上传文件",
      statusVisible: false,
      label: DEFAULT_FILE_LABEL,
      labelTitle: "",
      labelVisible: true,
    });
  }

  // ---- features/upload/view.js 镜像(mountUploadFeature 的 viewPort 契约) ----

  const viewPort = {
    clearPageRanges: () => patch({ pageRangeStart: "", pageRangeEnd: "" }),
    closePageRangeDialog: () => patch({ pageRangeDialogOpen: false }),
    markUploadReady: (ready) => setUploadTileReady(ready),
    openPageRangeDialog: ({ maxPage = 0 } = {}) => patch({
      pageRangeDialogOpen: true,
      pageRangeMax: Number(maxPage) > 0 ? Math.floor(Number(maxPage)) : 0,
    }),
    readPageRanges: () => {
      const snapshot = store.getSnapshot();
      return { start: snapshot.pageRangeStart || "", end: snapshot.pageRangeEnd || "" };
    },
    selectedFile: () => domRefs.fileInput?.files?.[0] || null,
    setFileLabel: (file, defaultFileLabel) => setUploadTileText({
      label: file ? file.name : defaultFileLabel,
      labelTitle: file ? file.name : "",
    }),
    setInlinePageRangeVisible: (visible) => patch({ inlinePageRangeVisible: Boolean(visible) }),
    showUploadStatus: (message) => setUploadTileText({ status: message, statusVisible: true }),
    writePageRanges: ({ start = "", end = "" } = {}) => patch({
      pageRangeStart: `${start}`,
      pageRangeEnd: `${end}`,
    }),
  };

  const uploadTilePort = {
    setUploadActionSlotVisible,
    setUploadTileLocked,
    setUploadTileText,
  };

  return {
    clearFileInputValue,
    domRefs,
    patch,
    resetUploadProgress,
    resetUploadedFileView,
    setUploadProgress,
    store,
    uploadTilePort,
    viewPort,
  };
}
