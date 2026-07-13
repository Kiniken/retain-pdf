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

import { useEffect, useRef, useState } from "react";
import { APP_EVENTS } from "../../../../js/contracts/app-contract.js";
import { useHomeServices } from "../../home-services-context.js";
import { useDialogState } from "../../state/use-dialog-state.js";
import { APP_SETTINGS_DIALOG_IDS } from "../credentials/credentials-dom-ids.js";
import { AppUpdateBanner } from "../app-update/AppUpdateBanner.jsx";

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
          <button
            id={APP_SETTINGS_DIALOG_IDS.closeButton}
            type="button"
            className="dialog-close-btn"
            aria-label="关闭"
            onClick={() => dialogStore.close()}
          >
            ×
          </button>
        </div>
        <div className="app-settings-body">
          <div className="app-settings-tabs" role="tablist" aria-label="设置分类">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={activeTab === tab.id ? "is-active" : ""}
                data-settings-tab={tab.id}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <section
            className={`app-settings-panel${activeTab === "api" ? " is-active" : ""}`}
            data-settings-panel="api"
            hidden={activeTab !== "api"}
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
            <button id={APP_SETTINGS_DIALOG_IDS.credentialsButton} type="button" className="app-settings-action" onClick={openCredentials}>
              打开 API 设置
            </button>
          </section>

          <section
            className={`app-settings-panel${activeTab === "glossary" ? " is-active" : ""}`}
            data-settings-panel="glossary"
            hidden={activeTab !== "glossary"}
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
            <button id={APP_SETTINGS_DIALOG_IDS.glossaryButton} type="button" className="app-settings-action" onClick={openGlossaries}>
              打开词表
            </button>
          </section>

          <section
            className={`app-settings-panel${activeTab === "update" ? " is-active" : ""}`}
            data-settings-panel="update"
            hidden={activeTab !== "update"}
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
                一体(蓝图 §5),父级 section 只用 hidden 属性切换,不卸载——
                dialog 只在用户点击本组件自己的按钮时才 showModal(),此时
                "更新" tab 必然是激活态,不存在祖先 hidden 时误开 dialog 的
                场景(见 AppUpdateBanner.jsx 头注释)。 */}
            <AppUpdateBanner />
          </section>
        </div>
      </div>
    </dialog>
  );
}
