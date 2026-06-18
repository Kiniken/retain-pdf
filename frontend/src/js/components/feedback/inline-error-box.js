import { copyText } from "../../utils/clipboard.js";
import { messageForErrorBox } from "../../utils/error-diagnostics.js";

class InlineErrorBox extends HTMLElement {
  connectedCallback() {
    this.classList.add("log", "error-box", "inline-error-box");
    if (!this.textContent.trim()) {
      this.textContent = "-";
    }
    if (!this.classList.contains("hidden") && this.textContent.trim() === "-") {
      this.classList.add("hidden");
    }
    this.setAttribute("aria-live", "polite");
  }

  setError(value) {
    const summary = messageForErrorBox(value);
    const text = `${summary ?? ""}`.trim();
    const diagnostic = value && typeof value === "object" && value.kind === "error-diagnostic"
      ? `${value.diagnostic || ""}`.trim()
      : "";
    this.replaceChildren();
    if (!text || text === "-") {
      this.textContent = summary ?? "-";
      this.classList.add("hidden");
      return;
    }
    this.classList.remove("hidden");
    if (!diagnostic) {
      this.textContent = summary;
      return;
    }

    const summaryEl = document.createElement("div");
    summaryEl.className = "inline-error-summary";
    summaryEl.textContent = summary;

    const actions = document.createElement("div");
    actions.className = "inline-error-actions";

    const details = document.createElement("details");
    details.className = "inline-error-details";
    const detailsSummary = document.createElement("summary");
    detailsSummary.textContent = "查看诊断";
    const pre = document.createElement("pre");
    pre.textContent = diagnostic;
    details.append(detailsSummary, pre);

    const copyButton = document.createElement("button");
    copyButton.type = "button";
    copyButton.className = "inline-error-copy-btn";
    copyButton.textContent = "复制诊断";
    copyButton.addEventListener("click", async () => {
      try {
        await copyText(diagnostic);
        copyButton.textContent = "已复制";
        window.setTimeout(() => {
          copyButton.textContent = "复制诊断";
        }, 1600);
      } catch (_error) {
        copyButton.textContent = "复制失败";
      }
    });

    actions.append(details, copyButton);
    this.append(summaryEl, actions);
  }
}

if (!customElements.get("inline-error-box")) {
  customElements.define("inline-error-box", InlineErrorBox);
}
