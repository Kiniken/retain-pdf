// 翻译工作流对话框 runtime(React 世界版控制器)。
//
// 复用纯逻辑:state.js 的 dialogStatePort(store 驱动开合/模式,并同步 home
// viewMode)、contract.js 的模式常量、status-area-port 契约。旧 controller.js
// 的 DOM 绑定(dialogElement/closeButton addEventListener)由 React 组件的
// onClick 取代,这里只保留 document 级事件桥。
//
// 事件契约(蓝图风险 5,不可破坏):
// - 用户侧开合入口(添加按钮 / 关闭按钮 / 背板 / Escape)一律先 dispatch
//   APP_EVENTS.openTranslationWorkflow / closeTranslationWorkflow,再由本
//   runtime 的 document 监听统一落状态——3b recent-jobs 的库刷新挂起/恢复
//   (bindings.js)与 app-actions 提交流程都依赖这两个事件在 document 上可见。
// - translationWorkflowSync / statusAreaVisibilityChanged → 同步模式。

import { APP_EVENTS } from "../../../../js/contracts/app-contract.js";
import {
  TRANSLATION_WORKFLOW_DIALOG,
  TRANSLATION_WORKFLOW_MODES,
} from "../../../../js/features/translation-workflow-dialog/contract.js";

export function createTranslationWorkflowDialogRuntime({
  dialogStatePort,
  statusAreaPort,
  uploadSessionPort = null,
  documentRef = globalThis.document,
} = {}) {
  // 3b 修复(实测发现,非预先设计):recent-jobs 的 refresh-environment.js
  // 默认 isWorkflowOpen 读的是 #translation-workflow-dialog 的 data-open
  // 属性(DOM),不是任何 store——而 React 的 DOM 提交相对 store 写入是异步的。
  // close() 触发的"store 写入 → bindings.js 的 closeTranslationWorkflow 监听器
  // 读 DOM 判断 isSuspended()"全部发生在同一个同步事件派发调用栈内,此时 React
  // 还没来得及重渲提交新的 data-open,DOM 读到的仍是打开前的旧值——实测复现为
  // "关闭工作流对话框后库刷新永久卡死"(蓝图风险 5 的具体翻车形态)。
  // mountRecentJobsFeature 未开放 environment 注入口(见 composition.js 里的
  // 说明),没法从上游注入读 store 的 isWorkflowOpen,只能反过来:在 store 写入
  // 的同一拍,把这个属性也同步写一份到 DOM,消除给 DOM 读方的竞态窗口。
  // React 之后仍会按自己的节奏把同一个值再渲一遍(幂等,无副作用)。
  function syncOpenAttributeToDom(open) {
    const dialogEl = documentRef?.getElementById?.(TRANSLATION_WORKFLOW_DIALOG.ids.dialog);
    if (dialogEl?.dataset) {
      dialogEl.dataset.open = open
        ? TRANSLATION_WORKFLOW_DIALOG.datasetValues.open
        : TRANSLATION_WORKFLOW_DIALOG.datasetValues.closed;
    }
  }
  function resolveMode(mode) {
    if (mode === TRANSLATION_WORKFLOW_MODES.STATUS || mode === TRANSLATION_WORKFLOW_MODES.UPLOAD) {
      return mode;
    }
    return statusAreaPort?.isVisible?.()
      ? TRANSLATION_WORKFLOW_MODES.STATUS
      : TRANSLATION_WORKFLOW_MODES.UPLOAD;
  }

  function isOpen() {
    return Boolean(dialogStatePort.getSnapshot().open);
  }

  // ---- 状态落地(document 监听调用;镜像旧 controller 的 openUpload/openFromEvent/close/sync) ----

  function openUpload() {
    statusAreaPort?.hide?.();
    uploadSessionPort?.resetUploadSession?.();
    dialogStatePort.open(TRANSLATION_WORKFLOW_MODES.UPLOAD);
    syncOpenAttributeToDom(true);
  }

  function openFromEvent(event = {}) {
    const mode = event?.detail?.mode;
    if (!mode || mode === TRANSLATION_WORKFLOW_MODES.UPLOAD) {
      openUpload();
      return;
    }
    dialogStatePort.open(resolveMode(mode));
    syncOpenAttributeToDom(true);
  }

  function close() {
    dialogStatePort.close();
    syncOpenAttributeToDom(false);
  }

  function sync() {
    dialogStatePort.setMode(resolveMode());
  }

  // ---- 用户侧入口(React 组件调用;只发事件,不直接改状态) ----

  function dispatch(eventName, detail) {
    if (documentRef?.dispatchEvent && typeof globalThis.CustomEvent === "function") {
      documentRef.dispatchEvent(new globalThis.CustomEvent(eventName, { detail }));
    }
  }

  function requestOpenUpload() {
    dispatch(APP_EVENTS.openTranslationWorkflow, { mode: TRANSLATION_WORKFLOW_MODES.UPLOAD });
  }

  // 状态模式下关闭 = 返回主页(镜像旧 requestClose 语义)
  function requestClose() {
    if (statusAreaPort?.isVisible?.()) {
      statusAreaPort.returnHome();
      return;
    }
    dispatch(APP_EVENTS.closeTranslationWorkflow);
  }

  function bindEvents() {
    if (!documentRef?.addEventListener) {
      return () => {};
    }
    const bindings = [
      [APP_EVENTS.openTranslationWorkflow, openFromEvent],
      [APP_EVENTS.closeTranslationWorkflow, close],
      [APP_EVENTS.translationWorkflowSync, sync],
      [APP_EVENTS.statusAreaVisibilityChanged, sync],
    ];
    const onKeydown = (event) => {
      if (event.key === "Escape" && isOpen()) {
        requestClose();
      }
    };
    bindings.forEach(([name, handler]) => documentRef.addEventListener(name, handler));
    documentRef.addEventListener("keydown", onKeydown);
    return () => {
      bindings.forEach(([name, handler]) => documentRef.removeEventListener(name, handler));
      documentRef.removeEventListener("keydown", onKeydown);
    };
  }

  return {
    bindEvents,
    close,
    isOpen,
    openFromEvent,
    openUpload,
    requestClose,
    requestOpenUpload,
    statePort: dialogStatePort,
    sync,
  };
}
