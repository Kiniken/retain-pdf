import {
  AI_ASSISTANT_DIALOG_DATASETS,
  AI_ASSISTANT_DIALOG_DATASET_VALUES,
  AI_ASSISTANT_DIALOG_ELEMENT,
  AI_ASSISTANT_DIALOG_IDS,
} from "./ai-assistant-dialog-contract.js";
import { aiAssistantDialogTemplate } from "./ai-assistant-dialog-template.js";

class AiAssistantDialog extends HTMLElement {
  connectedCallback() {
    if (this.dataset[AI_ASSISTANT_DIALOG_DATASETS.hydrated] === AI_ASSISTANT_DIALOG_DATASET_VALUES.hydrated) {
      return;
    }
    this.dataset[AI_ASSISTANT_DIALOG_DATASETS.hydrated] = AI_ASSISTANT_DIALOG_DATASET_VALUES.hydrated;
    this.innerHTML = aiAssistantDialogTemplate();
    this.bindEvents();
  }

  dialogElement() {
    return this.querySelector(`#${AI_ASSISTANT_DIALOG_IDS.dialog}`);
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

  bindEvents() {
    document.getElementById(AI_ASSISTANT_DIALOG_IDS.openButton)?.addEventListener("click", () => this.open());
    this.querySelector(`#${AI_ASSISTANT_DIALOG_IDS.closeButton}`)?.addEventListener("click", () => this.close());
    this.dialogElement()?.addEventListener("click", (event) => {
      if (event.target === event.currentTarget) {
        this.close();
      }
    });
  }
}

if (!customElements.get(AI_ASSISTANT_DIALOG_ELEMENT.tagName)) {
  customElements.define(AI_ASSISTANT_DIALOG_ELEMENT.tagName, AiAssistantDialog);
}
