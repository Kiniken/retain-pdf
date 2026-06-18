import { $ } from "../dom/query.js";
import { messageForErrorBox } from "../utils/error-diagnostics.js";

export function setText(id, value) {
  const el = $(id);
  const displayValue = id === "error-box" ? messageForErrorBox(value) : value;
  if (el) {
    el.textContent = displayValue;
  }
  if (id !== "error-box") {
    return;
  }
  const inlineError = $("error-box-inline");
  if (!inlineError) {
    return;
  }
  const text = `${displayValue ?? ""}`.trim();
  if (typeof inlineError.setError === "function") {
    inlineError.setError(value);
  } else {
    inlineError.textContent = displayValue;
  }
  inlineError.classList.toggle("hidden", !text || text === "-");
}
