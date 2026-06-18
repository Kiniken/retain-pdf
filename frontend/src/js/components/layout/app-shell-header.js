import {
  APP_UPDATE_DATASETS,
  APP_UPDATE_IDS,
  APP_UPDATE_STATES,
  appUpdateDataAttribute,
} from "./app-update-dom-contract.js";

class AppShellHeader extends HTMLElement {
  connectedCallback() {
    if (this.dataset.hydrated === "1") {
      return;
    }
    this.dataset.hydrated = "1";
    this.classList.add("app-shell-header");
    this.innerHTML = `
      <header class="topbar library-topbar">
        <a class="hero-repo-link library-brand-link" href="https://github.com/wxyhgk/retain-pdf" target="_blank" rel="noopener noreferrer">
          <img class="hero-repo-logo" src="src/assets/RetainPDF-logo.svg" alt="RetainPDF logo" />
          <span>RetainPDF</span>
        </a>
        <div class="hero-actions hidden" aria-hidden="true">
          <button id="developer-btn" type="button" class="secondary hidden" aria-hidden="true">开发者</button>
          <button id="open-output-btn" type="button" class="secondary hidden">打开输出目录</button>
        </div>
      </header>
      <dialog id="${APP_UPDATE_IDS.dialog}" class="desktop-dialog app-update-dialog">
        <form method="dialog" class="desktop-shell app-update-shell">
          <div class="app-update-head">
            <div>
              <h2 data-update-title>检查更新</h2>
              <p data-update-version>当前版本</p>
            </div>
            <button type="submit" class="desktop-close app-update-close" aria-label="关闭">×</button>
          </div>
          <div class="app-update-body">
            <div id="${APP_UPDATE_IDS.status}" class="app-update-status hidden">正在检查 GitHub Releases...</div>
            <div class="app-update-notes" data-update-notes>正在准备检查更新。</div>
          </div>
          <div class="app-update-foot">
            <button id="${APP_UPDATE_IDS.checkButton}" type="button" class="home-action-btn secondary">重新检查</button>
            <a class="app-update-link hidden" data-update-link href="#" target="_blank" rel="noopener noreferrer">打开 Release</a>
          </div>
        </form>
      </dialog>
    `;
  }
}

if (!customElements.get("app-shell-header")) {
  customElements.define("app-shell-header", AppShellHeader);
}
