// SettingsHubDialog(React 版 <app-settings-dialog>,对照
// components/dialogs/app-settings-dialog-template.js 逐 id 镜像,蓝图 §0.4)。
//
// 三 tab 壳:API 设置(CredentialsDialog agent 的真实内容,内部按钮打开
// CredentialsDialog)/ 词表(内部按钮打开 GlossariesDialog——真实对话框是
// 独立顶层 <dialog>,与 CredentialsDialog 同一模式,本处只保留触发按钮)/
// 更新(AppUpdateBanner 真实内容——按钮 + 详情 dialog 合并挂在本 tab 面板下,
// 蓝图 §5;AppShellHeader 旧 app-update-dialog 骨架已清理,不再有重复模板)。
//
// tab 切换是本对话框子树内部的纯 UI 瞬态(状态策略第 5 条),用 useState,
// 不进 store;开合状态跨子树(#app-settings-btn 在 AppShellHeader/
// LibraryBottomBar,对话框挂在这里),走 settings-hub-dialog-store.js。
//
// Tabs 实现(阶段 B,shadcn 改造):直接用 radix-ui 的 Tabs 原语(不经
// src/components/ui/tabs.jsx 那层默认皮肤——那层组件自带的 Tailwind 工具类
// (bg-muted/rounded-lg 等)会和 app-settings-tabs/app-settings-panel 这套已经
// 成熟的 bespoke CSS 正面冲突,阶段 C 换皮时再统一处理),换来的是真正的
// role=tab/aria-selected(此前 SettingsHub 是这三个 tab 里唯一缺这两个属性的,
// 探索 3/3 记录在案)+ 键盘方向键切换,视觉保持原样。
//
// AppUpdateBanner 常驻挂载(蓝图铁律 1,见该组件头注释)在这里通过
// TabsPrimitive.Content 的 forceMount + 显式 hidden 覆盖实现——forceMount 只是
// "强制渲染 children",可见性依旧由我们自己算的 hidden 属性决定(Radix 内部
// 的 hidden 计算会被 contentProps 里显式传入的 hidden 覆盖,浏览器对
// [hidden] 元素的默认 display:none 语义和原先手写版本完全一致)。
// TabsPrimitive.Root 用 className="contents"(display:contents)包住
// List+3×Content,避免多引入一层 DOM 打乱 app-settings-body 的
// display:grid 子元素计数(该父级靠 gap 在 4 个直接子元素间留白)。

import { useEffect, useRef, useState } from "react";
import { Tabs as TabsPrimitive } from "radix-ui";
import { APP_EVENTS } from "../../../../js/contracts/app-contract.js";
import { useHomeServices } from "../../home-services-context.js";
import { useDialogState } from "../../state/use-dialog-state.js";
import { APP_SETTINGS_DIALOG_IDS } from "../credentials/credentials-dom-ids.js";
import { AppUpdateBanner } from "../app-update/AppUpdateBanner.jsx";
import { Button } from "../../../../components/Button.jsx";

const TABS = [
  { id: "api", label: "API 设置" },
  { id: "glossary", label: "词表" },
  { id: "update", label: "更新" },
];

export function SettingsHubDialog() {
  const services = useHomeServices();
  const { dialogStore } = services.settingsHub;
  const dialogState = useDialogState(dialogStore);
  const open = Boolean(dialogState.open);
  const dialogRef = useRef(null);
  const [activeTab, setActiveTab] = useState(dialogState.payload?.tab || "api");

  useEffect(() => {
    if (open) {
      setActiveTab(dialogState.payload?.tab || "api");
    }
  }, [open]);

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

  function handleNativeClose() {
    dialogStore.close();
  }

  function openCredentials() {
    // 与 HeroUpload 的 #credential-gate-action 走同一条契约(蓝图 §0.6):
    // CredentialsDialog.jsx 用 useAppEvent 消费,两个入口不重复实现打开逻辑。
    document.dispatchEvent(new CustomEvent(APP_EVENTS.openBrowserCredentials));
  }

  function openGlossaries() {
    // GlossariesDialog 是独立顶层 <dialog>(与 CredentialsDialog 同一模式,
    // 蓝图 §3);打开这个 store 会触发 GlossariesDialog 内部的 open 状态迁移
    // effect,接回 controller.js 的 open()(reload 列表 + showModal)。
    services.glossaries.dialogStore.open();
  }

  return (
    <dialog
      id={APP_SETTINGS_DIALOG_IDS.dialog}
      className="desktop-dialog app-settings-dialog"
      ref={dialogRef}
      onClick={handleBackdropClick}
      onClose={handleNativeClose}
    >
      <div className="desktop-shell app-settings-shell">
        <div className="app-settings-head">
          <div>
            <h2>设置</h2>
            <p>接口、术语表和版本更新</p>
          </div>
          <Button
            id={APP_SETTINGS_DIALOG_IDS.closeButton}
            className="dialog-close-btn"
            aria-label="关闭"
            onClick={() => dialogStore.close()}
          >
            ×
          </Button>
        </div>
        <TabsPrimitive.Root className="contents" value={activeTab} onValueChange={setActiveTab}>
          <div className="app-settings-body">
            <TabsPrimitive.List className="app-settings-tabs" aria-label="设置分类">
              {TABS.map((tab) => (
                <TabsPrimitive.Trigger
                  key={tab.id}
                  value={tab.id}
                  className={activeTab === tab.id ? "is-active" : ""}
                  data-settings-tab={tab.id}
                >
                  {tab.label}
                </TabsPrimitive.Trigger>
              ))}
            </TabsPrimitive.List>

            <TabsPrimitive.Content
              value="api"
              forceMount
              hidden={activeTab !== "api"}
              className={`app-settings-panel${activeTab === "api" ? " is-active" : ""}`}
              data-settings-panel="api"
            >
              <div className="app-settings-panel-copy">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M14.5 9.5a4 4 0 1 1-1.2 2.86L5 20.65 3.35 19 11.6 10.7A4 4 0 0 1 14.5 9.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M18 6.5h.01" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                </svg>
                <div>
                  <strong>API 设置</strong>
                  <span>配置 OCR Token、DeepSeek Key、模型地址和任务选项。</span>
                </div>
              </div>
              <Button id={APP_SETTINGS_DIALOG_IDS.credentialsButton} className="app-settings-action" onClick={openCredentials}>
                打开 API 设置
              </Button>
            </TabsPrimitive.Content>

            <TabsPrimitive.Content
              value="glossary"
              forceMount
              hidden={activeTab !== "glossary"}
              className={`app-settings-panel${activeTab === "glossary" ? " is-active" : ""}`}
              data-settings-panel="glossary"
            >
              <div className="app-settings-panel-copy">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M5.5 5.2A2.2 2.2 0 0 1 7.7 3H19v15.5H7.7a2.2 2.2 0 0 0-2.2 2.2V5.2Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                  <path d="M5.5 5.2A2.2 2.2 0 0 0 3.3 3H3v15.5h.3a2.2 2.2 0 0 1 2.2 2.2" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                </svg>
                <div>
                  <strong>术语表</strong>
                  <span>维护固定译法、保留词和专业术语偏好。</span>
                </div>
              </div>
              <Button id={APP_SETTINGS_DIALOG_IDS.glossaryButton} className="app-settings-action" onClick={openGlossaries}>
                打开词表
              </Button>
            </TabsPrimitive.Content>

            <TabsPrimitive.Content
              value="update"
              forceMount
              hidden={activeTab !== "update"}
              className={`app-settings-panel${activeTab === "update" ? " is-active" : ""}`}
              data-settings-panel="update"
            >
              <div className="app-settings-panel-copy">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 5v2.1M12 16.9V19M5 12h2.1M16.9 12H19M7.05 7.05l1.5 1.5M15.45 15.45l1.5 1.5M16.95 7.05l-1.5 1.5M8.55 15.45l-1.5 1.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                  <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.7" />
                </svg>
                <div>
                  <strong>更新</strong>
                  <span>查看当前版本，并从 GitHub Releases 重新检查更新。</span>
                </div>
              </div>
              {/* AppUpdateBanner 常驻挂载(蓝图铁律 1):按钮 + 详情 dialog 合并
                  一体(蓝图 §5),forceMount + 显式 hidden 覆盖(不用条件渲染)
                  ——dialog 只在用户点击本组件自己的按钮时才 showModal(),此时
                  "更新" tab 必然是激活态,不存在祖先 hidden 时误开 dialog 的
                  场景(见 AppUpdateBanner.jsx 头注释)。 */}
              <AppUpdateBanner />
            </TabsPrimitive.Content>
          </div>
        </TabsPrimitive.Root>
      </div>
    </dialog>
  );
}
