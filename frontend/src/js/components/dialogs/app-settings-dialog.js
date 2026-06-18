import {
  APP_SETTINGS_DIALOG_DATASETS,
  APP_SETTINGS_DIALOG_DATASET_VALUES,
  APP_SETTINGS_DIALOG_ELEMENT,
  APP_SETTINGS_DIALOG_IDS,
  APP_SETTINGS_DIALOG_SELECTORS,
} from "./app-settings-dialog-contract.js";
import { appSettingsDialogTemplate } from "./app-settings-dialog-template.js";

class AppSettingsDialog extends HTMLElement {
  connectedCallback() {
    if (this.dataset[APP_SETTINGS_DIALOG_DATASETS.hydrated] === APP_SETTINGS_DIALOG_DATASET_VALUES.hydrated) {
      return;
    }
    this.dataset[APP_SETTINGS_DIALOG_DATASETS.hydrated] = APP_SETTINGS_DIALOG_DATASET_VALUES.hydrated;
    this.innerHTML = appSettingsDialogTemplate();
    this.bindEvents();
  }

  dialogElement() {
    return this.querySelector(`#${APP_SETTINGS_DIALOG_IDS.dialog}`);
  }

  open() {
    const dialog = this.dialogElement();
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }

  close() {
    const dialog = this.dialogElement();
    if (dialog?.open) {
      dialog.close();
    }
  }

  activateTab(tabName = "api") {
    const normalized = `${tabName || "api"}`.trim() || "api";
    this.querySelectorAll(APP_SETTINGS_DIALOG_SELECTORS.tab).forEach((tab) => {
      tab.classList.toggle("is-active", tab.dataset[APP_SETTINGS_DIALOG_DATASETS.settingsTab] === normalized);
    });
    this.querySelectorAll(APP_SETTINGS_DIALOG_SELECTORS.panel).forEach((panel) => {
      panel.classList.toggle("is-active", panel.dataset[APP_SETTINGS_DIALOG_DATASETS.settingsPanel] === normalized);
    });
  }

  bindEvents() {
    document.getElementById(APP_SETTINGS_DIALOG_IDS.openButton)?.addEventListener("click", () => this.open());
    this.querySelector(`#${APP_SETTINGS_DIALOG_IDS.closeButton}`)?.addEventListener("click", () => this.close());
    this.dialogElement()?.addEventListener("click", (event) => {
      if (event.target === event.currentTarget) {
        this.close();
      }
    });
    this.querySelectorAll(APP_SETTINGS_DIALOG_SELECTORS.tab).forEach((tab) => {
      tab.addEventListener("click", () => this.activateTab(tab.dataset[APP_SETTINGS_DIALOG_DATASETS.settingsTab]));
    });
  }
}

if (!customElements.get(APP_SETTINGS_DIALOG_ELEMENT.tagName)) {
  customElements.define(APP_SETTINGS_DIALOG_ELEMENT.tagName, AppSettingsDialog);
}

