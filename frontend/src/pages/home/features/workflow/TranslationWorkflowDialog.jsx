// 翻译工作流对话框(对照 partials/main-content.html 的
// #translation-workflow-dialog 区块 + features/translation-workflow-dialog/view.js
// 的 applyTranslationWorkflowDialogSnapshot 渲染语义)。
//
// 开合走 React state(dialogStatePort.store 快照);根元素类
// translation-workflow-open 落在 <html> 上,超出 React 根,由 effect 同步。
// 关闭入口(X / 背板)调 runtime.requestClose —— 内部 dispatch
// APP_EVENTS.closeTranslationWorkflow(3b 库刷新恢复依赖,蓝图风险 5)。
// #status-section 为 3b StatusCard 的占位容器(可见性已接 statusArea store)。

import { useEffect } from "react";
import {
  TRANSLATION_WORKFLOW_DIALOG,
  TRANSLATION_WORKFLOW_MODES,
} from "../../../../js/features/translation-workflow-dialog/contract.js";
import { useStoreSnapshot } from "../../../../shared/react/use-store.js";
import { useHomeServices } from "../../home-services-context.js";
import { WorkflowPanel } from "./WorkflowPanel.jsx";
import { StatusCard } from "../status/StatusCard.jsx";

export function TranslationWorkflowDialog() {
  const services = useHomeServices();
  const dialog = useStoreSnapshot(services.stores.dialog);
  const statusArea = useStoreSnapshot(services.stores.statusArea);

  const open = Boolean(dialog.open);
  const statusMode = dialog.mode === TRANSLATION_WORKFLOW_MODES.STATUS;

  // <html> 级样式钩子在 React 根之外,用 effect 同步(卸载时清理)
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle(TRANSLATION_WORKFLOW_DIALOG.classes.rootOpen, open);
    return () => root.classList.remove(TRANSLATION_WORKFLOW_DIALOG.classes.rootOpen);
  }, [open]);

  const classes = [
    "translation-workflow-dialog",
    open ? "" : TRANSLATION_WORKFLOW_DIALOG.classes.hidden,
    statusMode
      ? TRANSLATION_WORKFLOW_DIALOG.classes.statusMode
      : TRANSLATION_WORKFLOW_DIALOG.classes.uploadMode,
  ].filter(Boolean).join(" ");

  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
      services.workflowDialog.requestClose();
    }
  }

  return (
    <div
      id={TRANSLATION_WORKFLOW_DIALOG.ids.dialog}
      className={classes}
      role="dialog"
      aria-modal="true"
      aria-labelledby={TRANSLATION_WORKFLOW_DIALOG.ids.title}
      data-open={open
        ? TRANSLATION_WORKFLOW_DIALOG.datasetValues.open
        : TRANSLATION_WORKFLOW_DIALOG.datasetValues.closed}
      onClick={handleBackdropClick}
    >
      <div className="desktop-shell translation-workflow-shell">
        <div className="translation-workflow-head">
          <h2 id={TRANSLATION_WORKFLOW_DIALOG.ids.title}>
            {statusMode
              ? TRANSLATION_WORKFLOW_DIALOG.copy.statusTitle
              : TRANSLATION_WORKFLOW_DIALOG.copy.uploadTitle}
          </h2>
          <button
            id={TRANSLATION_WORKFLOW_DIALOG.ids.closeButton}
            type="button"
            className="dialog-close-btn"
            aria-label="关闭"
            onClick={() => services.workflowDialog.requestClose()}
          >
            ×
          </button>
        </div>
        <WorkflowPanel />
        <section
          id="status-section"
          className={`translation-status-panel${statusArea.visible ? "" : " hidden"}`}
          aria-label="任务进度"
        >
          <StatusCard visible={statusArea.visible} />
        </section>
      </div>
    </div>
  );
}
