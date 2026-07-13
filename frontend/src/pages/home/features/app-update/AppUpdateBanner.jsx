// AppUpdateBanner(React 版 app-update 按钮 + 详情 dialog,蓝图 §5)。
//
// 旧世界"两处 DOM 分属两个宿主"的问题(按钮在 app-settings-dialog 模板,
// 详情 dialog 在 app-shell-header.js)在这里合并成同一个组件:本组件整体挂载
// 在 SettingsHubDialog.jsx"更新"tab 面板下(该面板用 hidden 属性切换,不卸载
// ——见 SettingsHubDialog.jsx 头注释同款处理),按钮与 dialog 都是这里的常驻
// 子节点。dialog 只会在用户点击本组件自己的按钮时才 showModal()(此时"更新"
// tab 必然是激活态、祖先没有 hidden),不存在"父级隐藏时误开 dialog"的场景。
//
// 原生 <dialog> 语义(蓝图 §0.2):常驻挂载,effect 依本地 open 状态
// (useAppUpdateDialogOpen,纯 UI 瞬态)驱动 showModal()/close()。
//
// AppShellHeader.jsx 不再残留 app-update-dialog 模板骨架(3a 遗留,已清理,
// 避免 id 重复违反视觉基线/门禁)。

import { useEffect, useRef } from "react";
import { useStoreSnapshot } from "../../../../shared/react/use-store.js";
import { useHomeServices } from "../../home-services-context.js";
import { APP_UPDATE_IDS } from "./app-update-contract.js";
import { useAppUpdateDialogOpen } from "./useAppUpdateDialogOpen.js";

// 抄自 src/js/features/app-update/view.js:47-60(formatReleaseNotes)——纯函数,
// 逐字符保留,拷贝进本组件(蓝图 §5:AppUpdateBanner agent 范围)。
function formatReleaseNotes(markdown = "") {
  return `${markdown || ""}`
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line
      .replace(/^#{1,6}\s+/, "")
      .replace(/^\s*[-*]\s+/, "• ")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .trimEnd())
    .filter((line, index, lines) => line || (index > 0 && lines[index - 1]))
    .join("\n")
    .trim();
}

export function AppUpdateBanner() {
  const services = useHomeServices();
  const { view, handlersRef } = services.appUpdate;
  const state = useStoreSnapshot(view.store);
  const [dialogOpen, setDialogOpen] = useAppUpdateDialogOpen();
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (dialogOpen && !dialog.open) {
      if (typeof dialog.showModal === "function") {
        dialog.showModal();
      } else {
        dialog.setAttribute("open", "");
      }
    } else if (!dialogOpen && dialog.open) {
      if (typeof dialog.close === "function") {
        dialog.close();
      } else {
        dialog.removeAttribute("open");
      }
    }
  }, [dialogOpen]);

  function handleBackdropClick(event) {
    if (event.target === dialogRef.current) {
      setDialogOpen(false);
    }
  }

  function handleNativeClose() {
    setDialogOpen(false);
  }

  const hasUpdate = Boolean(state.hasUpdate);
  const panel = state.panel;
  const notesText = formatReleaseNotes(panel.body) || "暂无更新说明。";
  const versionText = panel.latestVersion
    ? `当前 ${panel.currentVersion} · 最新 ${panel.latestVersion}`
    : `当前 ${panel.currentVersion}`;
  const statusText = `${state.statusText || ""}`;

  return (
    <>
      <button
        id={APP_UPDATE_IDS.button}
        type="button"
        className={`app-settings-action app-update-btn${hasUpdate ? " has-update" : ""}`}
        aria-label="检查更新"
        title={state.buttonTitle}
        data-update-state={state.buttonState}
        onClick={() => setDialogOpen(true)}
      >
        检查更新
        <span className="app-update-dot" aria-hidden="true"></span>
      </button>
      <dialog
        id={APP_UPDATE_IDS.dialog}
        className="desktop-dialog app-update-dialog"
        ref={dialogRef}
        onClick={handleBackdropClick}
        onClose={handleNativeClose}
      >
        <form method="dialog" className="desktop-shell app-update-shell" onSubmit={(event) => event.preventDefault()}>
          <div className="app-update-head">
            <div>
              <h2>{panel.title}</h2>
              <p>{versionText}</p>
            </div>
            <button type="submit" className="desktop-close app-update-close" aria-label="关闭">×</button>
          </div>
          <div className="app-update-body">
            <div id={APP_UPDATE_IDS.status} className={`app-update-status${statusText ? "" : " hidden"}`}>{statusText}</div>
            <div className="app-update-notes">{notesText}</div>
          </div>
          <div className="app-update-foot">
            <button
              id={APP_UPDATE_IDS.checkButton}
              type="button"
              className="home-action-btn secondary"
              onClick={() => handlersRef.current?.onCheck?.()}
            >
              重新检查
            </button>
            <a
              className={`app-update-link${panel.htmlUrl ? "" : " hidden"}`}
              href={panel.htmlUrl || "#"}
              target="_blank"
              rel="noopener noreferrer"
            >
              打开 Release
            </a>
          </div>
        </form>
      </dialog>
    </>
  );
}
