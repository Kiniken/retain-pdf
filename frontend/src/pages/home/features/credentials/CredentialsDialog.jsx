// CredentialsDialog(React 版 <browser-credentials-dialog>,对照
// components/dialogs/browser-credentials-dialog.js 逐 id 镜像 + browser.js
// (kept 控制器)的开合/校验/保存编排)。
//
// 原生 <dialog> 语义(蓝图 §0.2):常驻挂载,effect 依 credentialsDialogStore
// 的 open 状态驱动 showModal()/close();背板点击 + 表单 method=dialog 的
// 关闭按钮都会触发原生 "close" 事件,统一回写 store,不依赖旧
// app-shell/view.js:bindDialogBackdropClose(那是一次性 getElementById,
// 常驻挂载才让它的等价语义成立——这里干脆用 onClick+onClose 自建,不复用)。
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
// 值最终生效),语义与原来手写的 hidden 属性完全一致。

import { useEffect, useRef } from "react";
import { Tabs as TabsPrimitive } from "radix-ui";
import { APP_EVENTS } from "../../../../js/contracts/app-contract.js";
import { useAppEvent } from "../../../../shared/react/use-app-event.js";
import { CREDENTIAL_DOM_IDS } from "./credentials-dom-ids.js";
import { useCredentialsController } from "./useCredentialsController.js";
import { OcrProviderPanels } from "./OcrProviderPanels.jsx";
import { DeepSeekPanel } from "./DeepSeekPanel.jsx";
import { TaskOptionsPanel } from "./TaskOptionsPanel.jsx";
import { Button } from "../../../../components/Button.jsx";

const { browser: BROWSER_IDS } = CREDENTIAL_DOM_IDS;

const TABS = [
  { id: "api", label: "API 设置" },
  { id: "task", label: "任务选项" },
];

export function CredentialsDialog() {
  const { open, view, feature, dialogStore, handlers } = useCredentialsController();
  const dialogRef = useRef(null);

  useAppEvent(APP_EVENTS.openBrowserCredentials, (event) => {
    feature?.openBrowserCredentialsDialog(event?.detail || {});
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) {
      if (typeof dialog.showModal === "function") {
        dialog.showModal();
      } else {
        dialog.setAttribute("open", "");
      }
    } else if (!open && dialog.open) {
      if (typeof dialog.close === "function") {
        dialog.close();
      } else {
        dialog.removeAttribute("open");
      }
    }
  }, [open]);

  function handleBackdropClick(event) {
    if (event.target === dialogRef.current) {
      dialogStore.close();
    }
  }

  // Esc / method=dialog 关闭按钮等原生关闭路径 → 回写 store(dialogStore.close()
  // 对已关闭状态是幂等 no-op,和 handlers.save() 内部调用 viewPort.closeDialog()
  // 不会冲突)。
  function handleNativeClose() {
    dialogStore.close();
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
    <dialog
      id={CREDENTIAL_DOM_IDS.dialog}
      className="desktop-dialog"
      ref={dialogRef}
      data-setup-mode={setupMode ? "1" : "0"}
      onClick={handleBackdropClick}
      onClose={handleNativeClose}
    >
      <form method="dialog" className="desktop-shell">
        <div className="desktop-head">
          <div className="credential-dialog-head">
            <h2 id={BROWSER_IDS.title}>{setupMode ? "首次配置" : "接口设置"}</h2>
            <p id={BROWSER_IDS.subtitle} className="muted hidden"></p>
          </div>
          <Button id={BROWSER_IDS.closeButton} type="submit" className="dialog-close-btn" aria-label="关闭">×</Button>
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
      </form>
    </dialog>
  );
}
