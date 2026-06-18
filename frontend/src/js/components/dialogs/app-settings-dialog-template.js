import {
  APP_SETTINGS_DIALOG_DATASETS,
  APP_SETTINGS_DIALOG_IDS,
} from "./app-settings-dialog-contract.js";
import {
  APP_UPDATE_DATASETS,
  APP_UPDATE_IDS,
  APP_UPDATE_STATES,
  appUpdateDataAttribute,
} from "../layout/app-update-dom-contract.js";

function iconPath(name) {
  if (name === "key") {
    return '<path d="M14.5 9.5a4 4 0 1 1-1.2 2.86L5 20.65 3.35 19 11.6 10.7A4 4 0 0 1 14.5 9.5Z" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M18 6.5h.01" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>';
  }
  if (name === "book") {
    return '<path d="M5.5 5.2A2.2 2.2 0 0 1 7.7 3H19v15.5H7.7a2.2 2.2 0 0 0-2.2 2.2V5.2Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M5.5 5.2A2.2 2.2 0 0 0 3.3 3H3v15.5h.3a2.2 2.2 0 0 1 2.2 2.2" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>';
  }
  return '<path d="M12 5v2.1M12 16.9V19M5 12h2.1M16.9 12H19M7.05 7.05l1.5 1.5M15.45 15.45l1.5 1.5M16.95 7.05l-1.5 1.5M8.55 15.45l-1.5 1.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><circle cx="12" cy="12" r="3.2" stroke="currentColor" stroke-width="1.7"/>';
}

function settingsIcon(name) {
  return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">${iconPath(name)}</svg>`;
}

function tabButton(tab, label, active = false) {
  return `
    <button type="button" class="${active ? "is-active" : ""}" data-${appSettingsDataAttribute(APP_SETTINGS_DIALOG_DATASETS.settingsTab)}="${tab}">
      ${label}
    </button>
  `;
}

function appSettingsDataAttribute(datasetKey = "") {
  return `${datasetKey || ""}`.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
}

export function appSettingsDialogTemplate() {
  return `
    <dialog id="${APP_SETTINGS_DIALOG_IDS.dialog}" class="desktop-dialog app-settings-dialog">
      <div class="desktop-shell app-settings-shell">
        <div class="app-settings-head">
          <div>
            <h2>设置</h2>
            <p>接口、术语表和版本更新</p>
          </div>
          <button id="${APP_SETTINGS_DIALOG_IDS.closeButton}" type="button" class="dialog-close-btn" aria-label="关闭">×</button>
        </div>
        <div class="app-settings-body">
          <div class="app-settings-tabs" role="tablist" aria-label="设置分类">
            ${tabButton("api", "API 设置", true)}
            ${tabButton("glossary", "词表")}
            ${tabButton("update", "更新")}
          </div>
          <section class="app-settings-panel is-active" data-${appSettingsDataAttribute(APP_SETTINGS_DIALOG_DATASETS.settingsPanel)}="api">
            <div class="app-settings-panel-copy">
              ${settingsIcon("key")}
              <div>
                <strong>API 设置</strong>
                <span>配置 OCR Token、DeepSeek Key、模型地址和任务选项。</span>
              </div>
            </div>
            <button id="credentials-btn" type="button" class="app-settings-action">打开 API 设置</button>
          </section>
          <section class="app-settings-panel" data-${appSettingsDataAttribute(APP_SETTINGS_DIALOG_DATASETS.settingsPanel)}="glossary">
            <div class="app-settings-panel-copy">
              ${settingsIcon("book")}
              <div>
                <strong>术语表</strong>
                <span>维护固定译法、保留词和专业术语偏好。</span>
              </div>
            </div>
            <button id="glossary-btn" type="button" class="app-settings-action">打开词表</button>
          </section>
          <section class="app-settings-panel" data-${appSettingsDataAttribute(APP_SETTINGS_DIALOG_DATASETS.settingsPanel)}="update">
            <div class="app-settings-panel-copy">
              ${settingsIcon("update")}
              <div>
                <strong>更新</strong>
                <span>查看当前版本，并从 GitHub Releases 重新检查更新。</span>
              </div>
            </div>
            <button id="${APP_UPDATE_IDS.button}" type="button" class="app-settings-action app-update-btn" aria-label="检查更新" title="检查更新" data-${appUpdateDataAttribute(APP_UPDATE_DATASETS.state)}="${APP_UPDATE_STATES.idle}">
              检查更新
              <span class="app-update-dot" aria-hidden="true"></span>
            </button>
          </section>
        </div>
      </div>
    </dialog>
  `;
}

