import {
  GLOSSARY_DATASET,
  GLOSSARY_DOM_IDS,
} from "./glossary-manager-dialog-dom-contract.js";
import { glossaryManagerDialogTemplate } from "./glossary-manager-dialog-template.js";

class GlossaryManagerDialog extends HTMLElement {
  connectedCallback() {
    if (this.dataset[GLOSSARY_DATASET.hydrated] === "1") {
      return;
    }
    this.dataset[GLOSSARY_DATASET.hydrated] = "1";
    this.innerHTML = glossaryManagerDialogTemplate();
  }
}

if (!customElements.get(GLOSSARY_DOM_IDS.dialog)) {
  customElements.define(GLOSSARY_DOM_IDS.dialog, GlossaryManagerDialog);
}
