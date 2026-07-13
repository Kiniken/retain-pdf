import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";

// 首页 shell 的集成测试:在 jsdom 里真实注册全部 Web Component、
// 注入 partials(与 app-bundle-entry.js 相同路径),然后断言各 DOM 契约
// 的 id 在挂载后的页面上真实存在。填补"727 个单测全在测接线,
// 组件挂载后的 DOM 没人验证"的空白。

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost/",
});
const jsdomWindow = dom.window;
for (const key of [
  "window",
  "document",
  "HTMLElement",
  "customElements",
  "CustomEvent",
  "Event",
  "Node",
  "navigator",
  "localStorage",
  "getComputedStyle",
  "MutationObserver",
]) {
  Object.defineProperty(globalThis, key, {
    value: jsdomWindow[key],
    writable: true,
    configurable: true,
  });
}
globalThis.window = jsdomWindow;
globalThis.requestAnimationFrame = (callback) => setTimeout(() => callback(0), 0);

await import("../src/js/components/index.js");

const { renderPageShellHtml } = await import("../src/js/bootstrap/page-shell.js");
renderPageShellHtml({
  mainContent: readFileSync(new URL("../src/partials/main-content.html", import.meta.url), "utf8"),
  dialogs: readFileSync(new URL("../src/partials/dialogs.html", import.meta.url), "utf8"),
  documentRef: jsdomWindow.document,
});
await new Promise((resolve) => setTimeout(resolve, 20));

const { APP_SHELL_IDS, APP_DIALOG_IDS } = await import("../src/js/contracts/app-contract.js");
const { DOWNLOAD_ACTION_IDS } = await import("../src/js/contracts/download-action-contract.js");
const { STATUS_CARD_IDS, STATUS_CARD_SELECTORS } = await import(
  "../src/js/components/status/job-status-card-dom-contract.js"
);

// 已确认的过期/未接线契约条目(挂载后确实不存在)。修复后 hygiene 用例会强制移除。
const KNOWN_MISSING = {
  APP_SHELL_IDS: {
    // partials 里实际是 error-box-inline,此条目已过期(desktop/index.js 靠双查询兜底)
    errorBox: "error-box",
    // AI 助手对话框整体未接线,partials 中没有按钮与 <ai-assistant-dialog> 标签
    aiAssistantButton: "ai-assistant-btn",
  },
  APP_DIALOG_IDS: {
    aiAssistant: "ai-assistant-dialog",
    // 真实 dialog id 由 reader-dialog 组件自己的契约提供,"reader-dialog" 只是标签名/类名
    reader: "reader-dialog",
  },
};

const CONTRACT_TABLES = [
  ["APP_SHELL_IDS", APP_SHELL_IDS],
  ["APP_DIALOG_IDS", APP_DIALOG_IDS],
  ["DOWNLOAD_ACTION_IDS", DOWNLOAD_ACTION_IDS],
  ["STATUS_CARD_IDS", STATUS_CARD_IDS],
];

for (const [tableName, table] of CONTRACT_TABLES) {
  const knownMissing = KNOWN_MISSING[tableName] || {};

  test(`${tableName} 的元素在页面 shell 挂载后存在`, () => {
    const missing = Object.entries(table)
      .filter(([key]) => !(key in knownMissing))
      .filter(([, id]) => !jsdomWindow.document.getElementById(id))
      .map(([key, id]) => `${key} -> #${id}`);
    assert.deepEqual(
      missing,
      [],
      `以下契约 id 在挂载后的 DOM 中不存在(改了 partials 或组件模板?):\n  ${missing.join("\n  ")}`,
    );
  });

  test(`${tableName} 的 KNOWN_MISSING 清单没有过期条目`, () => {
    const stale = Object.entries(knownMissing)
      .filter(([, id]) => jsdomWindow.document.getElementById(id))
      .map(([key, id]) => `${key} -> #${id}`);
    assert.deepEqual(
      stale,
      [],
      `以下条目已能在 DOM 中找到,请从 KNOWN_MISSING 移除:${stale.join(", ")}`,
    );
  });
}

test("STATUS_CARD_SELECTORS 在挂载后的状态卡中可命中", () => {
  const missing = Object.entries(STATUS_CARD_SELECTORS)
    .filter(([, selector]) => !jsdomWindow.document.querySelector(selector))
    .map(([key, selector]) => `${key} -> ${selector}`);
  assert.deepEqual(missing, [], `选择器未命中:${missing.join(", ")}`);
});

test("partials 中的每个自定义标签都已注册对应组件", () => {
  const html =
    readFileSync(new URL("../src/partials/main-content.html", import.meta.url), "utf8") +
    readFileSync(new URL("../src/partials/dialogs.html", import.meta.url), "utf8");
  // features/reader-dialog/entry.js 打开时才动态 import 注册,不在启动时注册
  const lazyRegisteredTags = ["reader-dialog"];
  const tags = [...new Set([...html.matchAll(/<([a-z]+(?:-[a-z]+)+)/g)].map((m) => m[1]))];
  assert.ok(tags.length >= 10, `自定义标签数异常(${tags.length}),检查扫描逻辑`);
  const undefinedTags = tags
    .filter((tag) => !lazyRegisteredTags.includes(tag))
    .filter((tag) => !jsdomWindow.customElements.get(tag));
  assert.deepEqual(
    undefinedTags,
    [],
    `以下标签写在 partials 里但没有注册组件(会渲染成空元素):${undefinedTags.join(", ")}`,
  );
});
