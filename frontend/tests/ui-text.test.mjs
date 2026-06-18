import test from "node:test";
import assert from "node:assert/strict";

import { setText } from "../src/js/ui/text.js";

test("setText mirrors diagnostic objects to inline error box and summary text", () => {
  const previousDocument = global.document;
  const errorBox = { textContent: "" };
  const inlineErrorBox = {
    classList: {
      hidden: false,
      toggle(name, hidden) {
        if (name === "hidden") {
          this.hidden = hidden;
        }
      },
    },
    received: null,
    setError(value) {
      this.received = value;
    },
    textContent: "",
  };
  global.document = {
    getElementById(id) {
      if (id === "error-box") {
        return errorBox;
      }
      if (id === "error-box-inline") {
        return inlineErrorBox;
      }
      return null;
    },
  };

  try {
    const diagnostic = {
      kind: "error-diagnostic",
      summary: "提交 PDF 任务失败：boom",
      diagnostic: "full details",
    };
    setText("error-box", diagnostic);

    assert.equal(errorBox.textContent, "提交 PDF 任务失败：boom");
    assert.equal(inlineErrorBox.received, diagnostic);
    assert.equal(inlineErrorBox.classList.hidden, false);

    setText("error-box", "-");
    assert.equal(errorBox.textContent, "-");
    assert.equal(inlineErrorBox.received, "-");
    assert.equal(inlineErrorBox.classList.hidden, true);
  } finally {
    global.document = previousDocument;
  }
});
