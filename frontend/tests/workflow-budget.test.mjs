import test from "node:test";
import assert from "node:assert/strict";

import {
  resolveTranslationBudgetState,
} from "../src/js/features/workflow/budget.js";
import {
  renderTranslationBudgetNote,
} from "../src/js/features/workflow/view.js";

function createClassList() {
  const values = new Set();
  return {
    add: (...names) => names.forEach((name) => values.add(name)),
    remove: (...names) => names.forEach((name) => values.delete(name)),
    toggle(name, force) {
      if (force === undefined ? !values.has(name) : force) {
        values.add(name);
      } else {
        values.delete(name);
      }
    },
    contains: (name) => values.has(name),
  };
}

function createBudgetNode() {
  const node = {
    children: [],
    classList: createClassList(),
    textContent: "",
    append(child) {
      this.children.push(child);
      this.textContent += `${child?.textContent ?? child?.nodeValue ?? ""}`;
    },
    replaceChildren() {
      this.children = [];
      this.textContent = "";
    },
    querySelector(selector) {
      if (selector !== "a") {
        return null;
      }
      return this.children.find((child) => child?.tagName === "A") || null;
    },
  };
  return node;
}

test("translation budget blocks DeepSeek submission when estimated cost exceeds balance", () => {
  const budget = resolveTranslationBudgetState({
    pageRanges: "",
    uploadedPageCount: 533,
    balanceCny: 1,
    balanceChecked: true,
    needsTranslation: true,
  });

  assert.equal(budget.visible, true);
  assert.equal(budget.blocking, true);
  assert.equal(budget.pageCount, 533);
  assert.equal(budget.estimatedCost.toFixed(2), "8.79");
  assert.equal(budget.message, "预计 ¥8.79 · 533 页 · 余额 ¥1.00");
  assert.equal(budget.topUpUrl, "https://platform.deepseek.com/top_up");
});

test("translation budget note renders DeepSeek top up link when blocking", () => {
  const previousDocument = global.document;
  const note = createBudgetNode();
  global.document = {
    getElementById(id) {
      return id === "translation-budget-note" ? note : null;
    },
    createElement(tagName) {
      return {
        tagName: `${tagName || ""}`.toUpperCase(),
        href: "",
        rel: "",
        target: "",
        textContent: "",
      };
    },
    createTextNode(text) {
      return {
        nodeValue: `${text || ""}`,
        textContent: `${text || ""}`,
      };
    },
  };

  try {
    renderTranslationBudgetNote({
      visible: true,
      blocking: true,
      tone: "error",
      message: "预计 ¥8.79 · 533 页 · 余额 ¥1.00",
      topUpUrl: "https://platform.deepseek.com/top_up",
    });

    const link = note.querySelector("a");
    assert.equal(note.classList.contains("hidden"), false);
    assert.equal(note.classList.contains("is-error"), true);
    assert.equal(note.textContent, "预计 ¥8.79 · 533 页 · 余额 ¥1.00 · 去充值");
    assert.equal(link.href, "https://platform.deepseek.com/top_up");
    assert.equal(link.target, "_blank");
    assert.equal(link.rel, "noopener noreferrer");
    assert.equal(link.textContent, "去充值");
  } finally {
    global.document = previousDocument;
  }
});
