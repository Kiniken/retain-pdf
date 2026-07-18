// CredentialsDialog(React 版 <browser-credentials-dialog>,对照
// components/dialogs/browser-credentials-dialog.js 逐 id 镜像 + browser.js
// (kept 控制器)的开合/校验/保存编排)。
//
// Dialog 渲染层(阶段 C,shadcn 改造):从原生 <dialog>+showModal/close 换成
// radix-ui 的 Dialog 原语(DialogPrimitive.Root/Portal/Overlay/Content),不经
// src/components/ui/dialog.jsx 那层默认皮肤(className 继续用现有的
// desktop-dialog/desktop-shell 这套 bespoke CSS)。open 受控于
// credentialsDialogStore(useCredentialsController 的 open),onOpenChange
// 在 next===false 时统一调用 dialogStore.close()——Escape、点击背板
// (DialogPrimitive.Overlay 之外的 outside-click 检测)、点击关闭按钮
// (DialogPrimitive.Close)三条路径都走这一个回调,不需要再手写
// handleBackdropClick/keydown 监听。
//
// 不 forceMount Content/Overlay:Radix modal Content 内部有一个
// hideOthers(content)(aria-hidden 兄弟节点)的 effect,依赖组件的真实
// mount/unmount 生命周期(deps=[]),forceMount 会让它在对话框从未打开时就
// 永久生效——反而制造新的无障碍缺陷。已确认对话框关闭时 OCR/DeepSeek/任务
// 选项的未保存草稿会随之丢失(输入是非受控 ref,组件卸载即重置),但没有
// 测试/产品语义要求"关闭后保留未保存草稿",这是可接受的、更符合直觉的
// Dialog UX(草稿在保存前不持久)。
//
// 打开入口统一走 APP_EVENTS.openBrowserCredentials(HeroUpload 的
// #credential-gate-action、SettingsHubDialog 的 #credentials-btn 都 dispatch
// 同一个事件);detail.setupMode 透传给 browser.js 的 openBrowserCredentialsDialog,
// 驱动首次配置态(标题/保存按钮文案/隐藏 tabs)。
//
// Tabs 实现(阶段 B,shadcn 改造):同 SettingsHubDialog.jsx 的选择——直接用
// radix-ui 的 Tabs 原语,不经 src/components/ui/tabs.jsx 默认皮肤(避免和
// credential-tabs/credential-panel 这套 bespoke CSS 冲突)。activeTab 由
// useCredentialsController 的 view.activeTab 驱动(不是本组件自己的
// useState),Radix 走受控模式:value={activeTab} +
// onValueChange={feature.activateCredentialTab}——原本挂在每个 trigger 上的
// onClick 收敛成 Root 级别一个回调,行为不变。
//
// TaskOptionsPanel 常驻挂载(不随 tab 卸载,见下方 JSX 内联注释)这条既有
// 约束继续保留:TabsPrimitive.Content 的 forceMount + 显式 hidden 覆盖(Radix
// 内部会算一份 hidden,但 contentProps 展开顺序在其后,我们自己传的 hidden
// 值最终生效),语义与原来手写的 hidden 属性完全一致——这条只在对话框处于
// 打开态时才有意义(对话框关闭时 Content 整体卸载,tab 常驻挂载无从谈起)。

import { Dialog as DialogPrimitive, Tabs as TabsPrimitive } from "radix-ui";
import { APP_EVENTS } from "../../../../js/contracts/app-contract.js";
import { useAppEvent } from "../../../../shared/react/use-app-event.js";
import { useDialogReturnFocus } from "../../../../shared/react/use-dialog-return-focus.js";
import { CREDENTIAL_DOM_IDS } from "./credentials-dom-ids.js";
import { useCredentialsController } from "./useCredentialsController.js";
import { OcrProviderPanels } from "./OcrProviderPanels.jsx";
import { DeepSeekPanel } from "./DeepSeekPanel.jsx";
import { TaskOptionsPanel } from "./TaskOptionsPanel.jsx";
import { Button as ButtonBase } from "../../../../components/Button.jsx";

// Button.size 在未注解源文件里被推断为必填;unstyled 路径运行时不用 size。
const Button = ButtonBase as any;

const { browser: BROWSER_IDS } = CREDENTIAL_DOM_IDS;

const TABS = [
  { id: "api", label: "API 设置" },
  { id: "task", label: "任务选项" },
];

export function CredentialsDialog() {
  const { open, view, feature, dialogStore, handlers } = useCredentialsController();
  const { onCloseAutoFocus } = useDialogReturnFocus(open);

  useAppEvent(APP_EVENTS.openBrowserCredentials, (event) => {
    feature?.openBrowserCredentialsDialog(event?.detail || {});
  });

  // Esc / 背板点击 / 关闭按钮都经这一个回调回写 store(dialogStore.close()
  // 对已关闭状态是幂等 no-op,和 handlers.save() 内部调用 viewPort.closeDialog()
  // 不会冲突)。
  function handleOpenChange(nextOpen) {
    if (!nextOpen) {
      dialogStore.close();
    }
  }

  const setupMode = Boolean(view.setupMode);
  const activeTab = view.activeTab || "api";
  const dialogStatus = view.dialogStatus || { message: "", tone: "" };
  const statusContent = `${dialogStatus.message || ""}`.trim();
  const statusClasses = [
    "upload-status",
    statusContent ? "" : "hidden",
    dialogStatus.tone === "valid" ? "is-valid" : "",
    dialogStatus.tone === "error" ? "is-error" : "",
  ].filter(Boolean).join(" ");

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="desktop-dialog-overlay" />
        <DialogPrimitive.Content
          id={CREDENTIAL_DOM_IDS.dialog}
          className="desktop-dialog"
          data-setup-mode={setupMode ? "1" : "0"}
          onCloseAutoFocus={onCloseAutoFocus}
        >
          <div className="desktop-shell">
            <div className="desktop-head">
              <div className="credential-dialog-head">
                <DialogPrimitive.Title asChild>
                  <h2 id={BROWSER_IDS.title}>{setupMode ? "首次配置" : "接口设置"}</h2>
                </DialogPrimitive.Title>
                <p id={BROWSER_IDS.subtitle} className="muted hidden"></p>
              </div>
              <DialogPrimitive.Close asChild>
                <Button id={BROWSER_IDS.closeButton} className="dialog-close-btn" aria-label="关闭">×</Button>
              </DialogPrimitive.Close>
            </div>
            <TabsPrimitive.Root
              className="contents"
              value={activeTab}
              onValueChange={(tab) => feature?.activateCredentialTab(tab)}
            >
              <div className="desktop-body credential-dialog-body">
                <TabsPrimitive.List
                  id={BROWSER_IDS.tabs}
                  className={`developer-tabs credential-tabs${setupMode ? " hidden" : ""}`}
                  aria-label="接口设置"
                >
                  {TABS.map((tab) => (
                    <TabsPrimitive.Trigger
                      key={tab.id}
                      value={tab.id}
                      id={tab.id === "api" ? BROWSER_IDS.tabApi : BROWSER_IDS.tabTask}
                      className={`developer-tab credential-tab${activeTab === tab.id ? " is-active" : ""}`}
                      data-credential-tab={tab.id}
                    >
                      {tab.label}
                    </TabsPrimitive.Trigger>
                  ))}
                </TabsPrimitive.List>
                <div className="credential-panels">
                  <TabsPrimitive.Content
                    value="api"
                    forceMount
                    hidden={activeTab !== "api"}
                    className={`credential-panel${activeTab === "api" ? " is-active" : ""}`}
                    data-credential-panel="api"
                  >
                    <div className="credential-card-grid credential-card-grid-compact credential-api-grid">
                      <section className="credential-card">
                        <div className="credential-card-head">
                          <h3>OCR</h3>
                        </div>
                        <OcrProviderPanels />
                      </section>
                      <DeepSeekPanel />
                    </div>
                  </TabsPrimitive.Content>
                  {/* TaskOptionsPanel 不套 TabsPrimitive.Content:它内部本来就是一个
                      自带 role="tabpanel" 的独立 <section>(见 TaskOptionsPanel.jsx),
                      再包一层 Content 会产生嵌套的 role=tabpanel(a11y 语义重复),
                      收益还不如维持现状。常驻挂载(不随 tab 条件卸载)语义本来就不
                      依赖 Radix——它只是普通 React 组件,从来没被 Radix 卸载过,
                      这里继续沿用原有 hidden 属性写法即可:TaskOptionsPanel 持有的
                      modelBaseUrl/modelName/mathMode 字段 ref 在保存时被
                      dialog-values.js 统一读取,不论用户当前停在哪个 tab —— 卸载会
                      让这些 ref 变 null,复现"切到 API 面板点保存,任务选项静默丢失"
                      的问题。 */}
                  <TaskOptionsPanel hidden={activeTab !== "task"} />
                </div>
                <div className="actions credential-dialog-actions">
                  <span id={BROWSER_IDS.status} className={statusClasses}>{statusContent}</span>
                  <Button
                    id={BROWSER_IDS.saveButton}
                    className="app-button"
                    onClick={() => handlers?.save?.()}
                  >
                    {setupMode ? "保存并启动" : "保存"}
                  </Button>
                </div>
              </div>
            </TabsPrimitive.Root>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
