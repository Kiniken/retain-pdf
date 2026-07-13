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
// Dialog 渲染层(阶段 C,shadcn 改造):从原生 <dialog>+showModal/close 换成
// radix-ui 的 Dialog 原语,不经 src/components/ui/dialog.jsx 默认皮肤
// (className 继续用现有的 desktop-dialog/desktop-shell/app-settings-* 这套
// bespoke CSS)。open 受控于 settingsHub 域的 dialogStore,onOpenChange 在
// next===false 时统一调用 dialogStore.close()——Escape、点击背板、点击关闭
// 按钮三条路径都走这一个回调。
//
// 不 forceMount Content/Overlay(同 CredentialsDialog.jsx 头注释的结论):
// Radix modal Content 内部 hideOthers(content) 的 effect 依赖真实
// mount/unmount 生命周期,forceMount 会让它在对话框从未打开时就永久生效,
// 制造新的无障碍缺陷。
//
// 已知行为变化(风险披露,非本次范围蔓延):AppUpdateBanner 挂在本对话框
// "更新"tab 面板下,此前 SettingsHubDialog 是原生 <dialog>(React 树里永远
// 挂载,只是原生显示态被 showModal/close 切换),AppUpdateBanner 因此从 App
// 启动起就常驻挂载。换成 Radix 后 Content 只在对话框打开时才挂载/渲染——
// AppUpdateBanner 的按钮/详情 dialog 在设置对话框从未被打开过之前不存在于
// DOM。已确认这不影响"启动 1200ms 后台自检"这个真实产品功能:该自检定时器
// 由 services.appUpdateFeature(composition.js 里 mountAppUpdateFeature 调用,
// 纯逻辑控制器,应用启动时就跑起来,与 AppUpdateBanner.jsx 是否挂载无关)
// 驱动,AppUpdateBanner 只是订阅其 store 快照的纯展示层——重新挂载时会立刻
// 读到当前最新状态,不会丢失。受影响的只是"DOM 契约 id 在从未打开设置对话框
// 时就能查到"这条测试假设,已在 home-app-component.test.mjs 里改为"先打开
// 设置对话框,再断言这些 id"。

import { useEffect, useState } from "react";
import { Dialog as DialogPrimitive, Tabs as TabsPrimitive } from "radix-ui";
import { APP_EVENTS } from "../../../../js/contracts/app-contract.js";
import { useHomeServices } from "../../home-services-context.js";
import { useDialogState } from "../../state/use-dialog-state.js";
import { useDialogReturnFocus } from "../../state/use-dialog-return-focus.js";
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
  const { onCloseAutoFocus } = useDialogReturnFocus(open);
  const [activeTab, setActiveTab] = useState(dialogState.payload?.tab || "api");

  useEffect(() => {
    if (open) {
      setActiveTab(dialogState.payload?.tab || "api");
    }
  }, [open]);

  function handleOpenChange(nextOpen) {
    if (!nextOpen) {
      dialogStore.close();
    }
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
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="desktop-dialog-overlay" />
        <DialogPrimitive.Content
          id={APP_SETTINGS_DIALOG_IDS.dialog}
          className="desktop-dialog app-settings-dialog"
          onCloseAutoFocus={onCloseAutoFocus}
        >
          <div className="desktop-shell app-settings-shell">
            <div className="app-settings-head">
              <div>
                <DialogPrimitive.Title asChild>
                  <h2>设置</h2>
                </DialogPrimitive.Title>
                <p>接口、术语表和版本更新</p>
              </div>
              <DialogPrimitive.Close asChild>
                <Button
                  id={APP_SETTINGS_DIALOG_IDS.closeButton}
                  className="dialog-close-btn"
                  aria-label="关闭"
                >
                  ×
                </Button>
              </DialogPrimitive.Close>
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
                  {/* AppUpdateBanner:按钮 + 详情 dialog 合并一体(蓝图 §5),
                      forceMount + 显式 hidden 覆盖(不用条件渲染)——dialog 只
                      在用户点击本组件自己的按钮时才打开,此时"更新" tab 必然是
                      激活态,不存在祖先 hidden 时误开 dialog 的场景(见
                      AppUpdateBanner.jsx 头注释)。本组件所在的
                      SettingsHubDialog 自身现在只在打开态才挂载(见本文件头
                      注释的行为变化说明),AppUpdateBanner 的挂载生命周期因此
                      从"App 启动起常驻"变为"设置对话框打开起常驻"——不影响
                      其订阅的后台自检状态(见头注释)。 */}
                  <AppUpdateBanner />
                </TabsPrimitive.Content>
              </div>
            </TabsPrimitive.Root>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
