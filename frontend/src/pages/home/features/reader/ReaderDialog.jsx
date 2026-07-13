// ReaderDialog iframe 宿主(dialogs 蓝图 §4)——对照
// components/dialogs/reader-dialog-template.js 逐 id/class 镜像。
//
// 原生 <dialog> 语义(蓝图 §0.2):常驻挂载,effect 依 dialogStore 的 open
// 状态驱动 showModal()/close(),自带 backdrop-close onClick,不依赖旧
// app-shell/view.js:bindDialogBackdropClose(CredentialsDialog.jsx/
// StatusDetailDialog.jsx 先例)。
//
// iframe 是跨文档导航副作用,src 切换必须走 ref 命令式 setAttribute/
// removeAttribute(蓝图 §4 铁律,照搬旧 setReaderDialogFrameSource 的分支
// 逻辑),不走 JSX 声明式 src 属性。
//
// postMessage 契约逐字节核对 Phase2b 发送端(src/js/reader/
// progress-presenter.js:29-34):type "retainpdf-reader-progress"，字段
// { type, stage, percent, text }；来源校验 isTrustedWindowMessage 不改
// (见 useReaderPostMessage.js)。
//
// 下载按钮死代码运行时复核结论:旧宿主模板(reader-dialog-template.js)
// 当前分支已经不渲染 source/merged/translated 三个下载按钮（下载入口
// 移进了 reader.html 本体的 ReaderDownloadMenu.jsx），controller.js 的
// handleSourceDownload/handleTranslatedDownload/handleMergedDownload/
// syncToolbarActions 四个函数在宿主侧已是死代码，本组件不移植；已用
// mock 场景跑 fresh Playwright 复核（home-react-dev.html?mock=succeeded），
// 确认对话框头部只有关闭按钮，无下载入口。

import { useCallback, useEffect, useRef, useState } from "react";
import { useHomeServices } from "../../home-services-context.js";
import { useDialogState } from "../../state/use-dialog-state.js";
import { useAppEvent } from "../../../../shared/react/use-app-event.js";
import { APP_EVENTS } from "../../../../js/contracts/app-contract.js";
import {
  READER_DIALOG_COPY,
  READER_DIALOG_IDS,
  READER_FRAME_PLACEHOLDER,
} from "../../../../js/features/reader-dialog/contract.js";
import {
  buildReaderPageUrl,
  buildReaderRouteUrl,
  requestedReaderJobIdFromLocation,
} from "../../../../js/features/reader-dialog/routing.js";
import { ReaderLoadingOverlay } from "./ReaderLoadingOverlay.jsx";
import { useReaderDialogProgress } from "./useReaderDialogProgress.js";
import { useReaderPostMessage } from "./useReaderPostMessage.js";

const OPEN_PROGRESS_SEED = 8;
const FRAME_LOAD_FALLBACK_MS = 1200;

// 镜像旧 components/dialogs/reader-dialog-rendering.js#setReaderDialogFrameSource。
function setFrameSource(frameEl, url = "about:blank") {
  if (!frameEl) {
    return;
  }
  const normalizedUrl = `${url || ""}`.trim();
  if (!normalizedUrl || normalizedUrl === "about:blank") {
    frameEl.removeAttribute("src");
    frameEl.setAttribute("srcdoc", READER_FRAME_PLACEHOLDER);
    return;
  }
  frameEl.removeAttribute("srcdoc");
  frameEl.src = normalizedUrl;
}

function syncReaderRoute(jobId = "") {
  window.history.replaceState(window.history.state, "", buildReaderRouteUrl(jobId));
}

function anchorFromEventDetail(detail = {}) {
  // 注意:Number(null) === 0——pageIdx 显式传 null(无锚点场景,recent-jobs
  // 卡片/URL 深链都是这样传的)时不能直接 Number() 转,否则会把"没有页码"
  // 误判成"第 0 页"，多余地在 URL 里带上 page_idx=0。
  const rawPageIdx = detail.pageIdx;
  const pageIdx = rawPageIdx === null || rawPageIdx === undefined ? NaN : Number(rawPageIdx);
  const blockId = `${detail.blockId || ""}`.trim();
  if (!Number.isFinite(pageIdx) && !blockId) {
    return null;
  }
  return {
    pageIdx: Number.isFinite(pageIdx) ? pageIdx : null,
    blockId,
  };
}

export function ReaderDialog() {
  const services = useHomeServices();
  const { dialogStore } = services.reader;
  const dialogState = useDialogState(dialogStore);
  const open = Boolean(dialogState.open);
  const payload = dialogState.payload || {};

  const dialogRef = useRef(null);
  const frameRef = useRef(null);
  const textRef = useRef(null);
  const percentRef = useRef(null);
  const barRef = useRef(null);
  const hasOpenedRef = useRef(false);

  const [loadingVisible, setLoadingVisible] = useState(false);
  const { setProgress, resetProgress } = useReaderDialogProgress({ barRef, percentRef });

  const setLoadingText = useCallback((text) => {
    if (textRef.current) {
      textRef.current.textContent = `${text ?? READER_DIALOG_COPY.preparing}`;
    }
  }, []);

  // 打开触发①②:recent-jobs 卡片 + ResultActions「对照阅读」+
  // library-search 岛都 dispatch openReaderRequested(蓝图 §4 施工范围第 6
  // 条),本 effect 是唯一消费点。③URL 深链启动(?view=reader&job_id=)不走
  // 这个事件——见下方一次性挂载 effect 的注释。
  useAppEvent(APP_EVENTS.openReaderRequested, (event) => {
    const detail = event?.detail || {};
    const jobId = `${detail.jobId || ""}`.trim();
    if (!jobId) {
      return;
    }
    const anchor = anchorFromEventDetail(detail);
    const url = buildReaderPageUrl(jobId, anchor);
    if (!url) {
      return;
    }
    dialogStore.open({ jobId, url, anchor });
  });

  // (a) 一次性挂载 effect(不参与 open/close 状态机、不碰路由/history 之外的
  //     部分):iframe 初始 srcdoc 占位、loading 文案/进度条初值,外加 URL
  //     深链启动检查(蓝图 §4 施工范围第 6 条 ③)。
  //
  //     深链没有走 openReaderRequested 事件转发,是组件自己在这里直接读
  //     requestedReaderJobIdFromLocation() 并 open()——曾经改成
  //     composition.js#initialize() 里 setTimeout(0) 派发事件的写法,
  //     实测(jsdom 回归)会与本组件挂载后才注册的 useAppEvent 监听器竞速:
  //     initialize() 在 root.render() 之前调用,若两边都退化成
  //     setTimeout(0) 调度,派发可能先于监听器就绪,深链启动整个打不开
  //     对话框。组件自己在挂载 effect 里读 URL,不依赖任何跨模块时序假设。
  useEffect(() => {
    setFrameSource(frameRef.current, "about:blank");
    setLoadingText(READER_DIALOG_COPY.preparing);
    resetProgress();
    const startupJobId = requestedReaderJobIdFromLocation();
    if (startupJobId) {
      const url = buildReaderPageUrl(startupJobId, null);
      if (url) {
        dialogStore.open({ jobId: startupJobId, url, anchor: null });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 原生 <dialog> showModal()/close() 语义。
  useEffect(() => {
    const dialogEl = dialogRef.current;
    if (!dialogEl) {
      return;
    }
    if (open && !dialogEl.open) {
      if (typeof dialogEl.showModal === "function") {
        dialogEl.showModal();
      } else {
        dialogEl.setAttribute("open", "");
      }
    } else if (!open && dialogEl.open) {
      if (typeof dialogEl.close === "function") {
        dialogEl.close();
      } else {
        dialogEl.removeAttribute("open");
      }
    }
  }, [open]);

  // (b) 打开/切换目标:同一次挂载期间可能反复调用 dialogStore.open()
  //     (例如已开着阅读器时又点了另一本书的「对照阅读」),payload 引用
  //     每次 open() 都会刷新,即便 open 本身已经是 true 也要重新求值
  //     iframe src/进度/路由(逐字节镜像旧 controller.js#open())。
  useEffect(() => {
    if (!open) {
      return;
    }
    hasOpenedRef.current = true;
    syncReaderRoute(payload.jobId || "");
    setLoadingVisible(true);
    resetProgress();
    setProgress(OPEN_PROGRESS_SEED);
    setLoadingText(READER_DIALOG_COPY.preparing);
    setFrameSource(frameRef.current, payload.url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, payload]);

  // (c) 关闭转场:只在「确实打开过」之后才清路由/复位 loading——常驻挂载
  //     的首次渲染 open 本就是 false,不应该在 mount 瞬间抢跑
  //     syncReaderRoute("") 把 URL 深链(?view=reader&job_id=)清掉,
  //     在上面 (a) 的深链检查真正跑到 dialogStore.open() 之前就把它冲掉。
  useEffect(() => {
    if (open || !hasOpenedRef.current) {
      return;
    }
    setLoadingVisible(false);
    resetProgress();
    setLoadingText(READER_DIALOG_COPY.preparing);
    syncReaderRoute("");
    setFrameSource(frameRef.current, "about:blank");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useReaderPostMessage({
    frameRef,
    onProgress: (percent, text) => {
      setLoadingVisible(true);
      setProgress(percent);
      setLoadingText(text);
    },
    onReadyHide: () => setLoadingVisible(false),
  });

  // iframe onLoad 兜底(旧 controller.js#bindEvents 的 onFrameLoad):postMessage
  // 迟迟不到时,frame 真实加载完成 1200ms 后仍隐藏 loading,避免卡死遮罩。
  const handleFrameLoad = useCallback(() => {
    window.setTimeout(() => {
      const frame = frameRef.current;
      const loaded = Boolean(frame?.src && frame.src !== "about:blank");
      if (loaded) {
        setLoadingVisible(false);
      }
    }, FRAME_LOAD_FALLBACK_MS);
  }, []);

  function handleBackdropClick(event) {
    if (event.target === dialogRef.current) {
      dialogStore.close();
    }
  }

  function handleNativeClose() {
    dialogStore.close();
  }

  return (
    <dialog
      id={READER_DIALOG_IDS.dialog}
      className="desktop-dialog reader-dialog"
      ref={dialogRef}
      onClick={handleBackdropClick}
      onClose={handleNativeClose}
    >
      <div className="reader-dialog-shell">
        <div className="reader-dialog-head">
          {/* 下载入口在阅读器本体的动作组里(reader.html),宿主只保留关闭。 */}
          <button
            id={READER_DIALOG_IDS.closeButton}
            type="button"
            className="dialog-close-btn"
            aria-label="关闭"
            onClick={() => dialogStore.close()}
          >
            ×
          </button>
        </div>
        <ReaderLoadingOverlay
          visible={loadingVisible}
          textRef={textRef}
          percentRef={percentRef}
          barRef={barRef}
        />
        <iframe
          id={READER_DIALOG_IDS.frame}
          ref={frameRef}
          className="reader-dialog-frame"
          title="对照阅读"
          onLoad={handleFrameLoad}
        />
      </div>
    </dialog>
  );
}
