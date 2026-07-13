// 翻译工作流对话框(对照 partials/main-content.html 的
// #translation-workflow-dialog 区块 + features/translation-workflow-dialog/view.js
// 的 applyTranslationWorkflowDialogSnapshot 渲染语义)。
//
// Dialog 渲染层(阶段 C 第二批,shadcn 改造):从 bespoke <div role="dialog">
// 换成 radix-ui 的 Dialog 原语(DialogPrimitive.Root/Portal/Overlay/Content)。
// 相比阶段 C 第一批(CredentialsDialog 等 4 个,dialog-store.js 工厂 + 单态
// 关闭语义)结构上有三处不同,逐一说明:
//
// 1. 开合状态源不是 dialog-store.js 工厂,是 bespoke createStore 包装的
//    dialogStatePort({open,mode})——services.stores.dialog 快照。本文件不改
//    这层(铁律),只换渲染。
//
// 2. 两态语义(dialog.mode: UPLOAD/STATUS)是对话框*内部*状态,不是 Radix 的
//    open/close——mode 只影响标题文案和 statusMode/uploadMode 两个 class,
//    与本次迁移正交,原样保留。
//
// 3. 两段式关闭(本文件风险最高的一处):不能像 CredentialsDialog 那样
//    onOpenChange(false) 直接调 store 的 close()——services.workflowDialog.
//    requestClose() 内部有分流(状态区可见时先 statusAreaPort.returnHome()
//    回到上传视图，对话框本身不关；只有状态区不可见时才真正 dispatch
//    closeTranslationWorkflow 关闭，见 translation-workflow-dialog-runtime.js）。
//    这是 e61282b 修过的真实 bug 的根治点，Escape/背板/关闭按钮三条触发路径
//    必须统一路由到 requestClose()，不能有任何一条绕过去直接调
//    dialogStatePort.close()。
//
//    Escape 键需要额外处理:本对话框在 Radix 化之前就已经有一条独立的
//    document 级 keydown 监听(translation-workflow-dialog-runtime.js 的
//    bindEvents，事件契约需要它在 document 上可见，3b 库刷新挂起/恢复依赖，
//    不能删)，它已经在调 requestClose()。若同时让 Radix Content 自己的
//    onEscapeKeyDown 走默认行为(触发 onOpenChange(false) → requestClose())，
//    一次 Escape 按键会在同一个事件循环内触发两次 requestClose()——第一次把
//    状态模式 returnHome()(statusArea 隐藏)，第二次因为此时 isVisible() 已
//    经是 false，会直接把对话框整个关掉，两段式关闭被"合并"成一段，是真实的
//    回归(实测验证过)。这里显式 onEscapeKeyDown={(e)=>e.preventDefault()}，
//    把 Escape 完全交给既有的 document 监听器处理——DismissableLayer 的
//    keydown 监听挂在 capture 阶段，bindEvents 的监听挂在 bubble 阶段，同一个
//    document 目标上前者必然先跑：我们在这里 preventDefault() 之后，Radix 自
//    己的 onDismiss(→onOpenChange(false))被跳过，随后 bubble 阶段 bindEvents
//    的监听器正常触发一次 requestClose()——三条路径最终都恰好调用一次
//    requestClose(),满足"统一路由,不绕过"的要求。
//
// 4. 不 forceMount Content(同其余对话框的决策，见 use-dialog-return-focus.js
//    头注释——forceMount 会让 Radix modal Content 内部的 hideOthers() 副作用
//    在应用启动时就永久生效)。WorkflowPanel(上传表单)和 #status-section(3b
//    StatusCard)因此随对话框关闭一起卸载——这不是新增的状态丢失:
//    openUpload() 本来就在每次打开时无条件 resetUploadSession()，而真正的
//    整体关闭只发生在 statusArea 不可见(没有活跃任务展示中)时(见上面第 3
//    点)，卸载时没有"正在展示中的任务状态"可丢。job-runtime 轮询引擎是独立
//    于 React 挂载生命周期的服务(store 驱动，不依赖 StatusCard 组件是否挂载)，
//    卸载 StatusCard 不影响后台轮询本身。
//
// <html> 级样式钩子(rootOpen class)在 React 根之外,用 effect 同步(卸载时
// 清理),保持不动。触发按钮("添加",在 LibraryBottomBar 里)与本对话框跨
// 子树，Radix 默认的 triggerRef 焦点归还机制失效，复用
// use-dialog-return-focus.js(同 CredentialsDialog 等的先例)。

import { useEffect } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import {
  TRANSLATION_WORKFLOW_DIALOG,
  TRANSLATION_WORKFLOW_MODES,
} from "../../../../js/features/translation-workflow-dialog/contract.js";
import { useStoreSnapshot } from "../../../../shared/react/use-store.js";
import { useHomeServices } from "../../home-services-context.js";
import { useDialogReturnFocus } from "../../../../shared/react/use-dialog-return-focus.js";
import { WorkflowPanel } from "./WorkflowPanel.jsx";
import { StatusCard } from "../status/StatusCard.jsx";

export function TranslationWorkflowDialog() {
  const services = useHomeServices();
  const dialog = useStoreSnapshot(services.stores.dialog);
  const statusArea = useStoreSnapshot(services.stores.statusArea);

  const open = Boolean(dialog.open);
  const statusMode = dialog.mode === TRANSLATION_WORKFLOW_MODES.STATUS;
  const { onCloseAutoFocus } = useDialogReturnFocus(open);

  // <html> 级样式钩子在 React 根之外,用 effect 同步(卸载时清理)
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle(TRANSLATION_WORKFLOW_DIALOG.classes.rootOpen, open);
    return () => root.classList.remove(TRANSLATION_WORKFLOW_DIALOG.classes.rootOpen);
  }, [open]);

  const contentClasses = [
    "translation-workflow-dialog",
    statusMode
      ? TRANSLATION_WORKFLOW_DIALOG.classes.statusMode
      : TRANSLATION_WORKFLOW_DIALOG.classes.uploadMode,
  ].join(" ");

  // Escape(见头注释第 3 点，这里只 preventDefault，实际关闭由既有 document
  // 监听器处理)/ 背板点击(DismissableLayer 的 outside-click 检测)/ 关闭按钮
  // (DialogPrimitive.Close)最终都统一路由到 requestClose() 的两段式关闭判断
  // (状态可见先 returnHome，否则才真正 close)，不直接调
  // dialogStatePort/dialogStore 的 close()。
  function handleOpenChange(nextOpen) {
    if (!nextOpen) {
      services.workflowDialog.requestClose();
    }
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="translation-workflow-overlay" />
        <DialogPrimitive.Content
          id={TRANSLATION_WORKFLOW_DIALOG.ids.dialog}
          className={contentClasses}
          data-open={TRANSLATION_WORKFLOW_DIALOG.datasetValues.open}
          onCloseAutoFocus={onCloseAutoFocus}
          onEscapeKeyDown={(event) => event.preventDefault()}
        >
          <div className="desktop-shell translation-workflow-shell">
            <div className="translation-workflow-head">
              <DialogPrimitive.Title asChild>
                <h2 id={TRANSLATION_WORKFLOW_DIALOG.ids.title}>
                  {statusMode
                    ? TRANSLATION_WORKFLOW_DIALOG.copy.statusTitle
                    : TRANSLATION_WORKFLOW_DIALOG.copy.uploadTitle}
                </h2>
              </DialogPrimitive.Title>
              <DialogPrimitive.Close asChild>
                <button
                  id={TRANSLATION_WORKFLOW_DIALOG.ids.closeButton}
                  type="button"
                  className="dialog-close-btn"
                  aria-label="关闭"
                >
                  ×
                </button>
              </DialogPrimitive.Close>
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
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
