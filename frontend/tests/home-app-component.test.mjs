import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

// HomeApp(Phase 3a:app-shell / upload / workflow 三域 React 骨架)组件级测试。
// 校验:DOM 契约 id 逐一存在、idle 复位链落 store、工作流对话框开合的
// APP_EVENTS 契约(蓝图风险 5)、错误盒 setText 通道、页码区间约束、
// 状态区可见性 → 对话框模式同步、3b 回调桥接口定型。

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/index.html" });
for (const key of ["window", "document", "HTMLElement", "HTMLInputElement", "CustomEvent", "Event", "KeyboardEvent", "MouseEvent", "Node", "MutationObserver"]) {
  Object.defineProperty(globalThis, key, {
    value: dom.window[key] ?? dom.window,
    writable: true,
    configurable: true,
  });
}
globalThis.window = dom.window;
globalThis.requestAnimationFrame = (callback) => setTimeout(() => callback(0), 0);
globalThis.IS_REACT_ACT_ENVIRONMENT = false;

const { createRoot } = await import("react-dom/client");
const React = await import("react");
const { createHomeComposition } = await import("../src/pages/home/composition.js");
const { HomeApp } = await import("../src/pages/home/HomeApp.jsx");
const { APP_EVENTS } = await import("../src/js/contracts/app-contract.js");

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(predicate, description) {
  const deadline = Date.now() + 3000;
  while (Date.now() < deadline) {
    if (predicate()) {
      return;
    }
    await wait(15);
  }
  assert.fail(`等待超时：${description}`);
}

function byId(id) {
  return dom.window.document.getElementById(id);
}

function click(element) {
  element.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
}

// 控制端输入:绕开 React 的 value 追踪,用原生 setter 写入再冒泡 input
function typeInput(element, value) {
  const setter = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value").set;
  setter.call(element, value);
  element.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
}

function createServices() {
  return createHomeComposition({
    fetchGlossaries: async () => ({
      items: [{ glossary_id: "g-1", name: "术语表甲", entry_count: 3 }],
    }),
    loadPersistedDeveloperConfig: () => ({}),
    loadPersistedBrowserConfig: () => ({}),
  });
}

test("HomeApp：契约 id、idle 链、工作流对话框事件契约与交互", async () => {
  const host = dom.window.document.createElement("div");
  host.id = "home-root";
  dom.window.document.body.appendChild(host);

  const services = createServices();
  services.initialize();

  const events = { open: 0, close: 0 };
  dom.window.document.addEventListener(APP_EVENTS.openTranslationWorkflow, () => { events.open += 1; });
  dom.window.document.addEventListener(APP_EVENTS.closeTranslationWorkflow, () => { events.close += 1; });

  const root = createRoot(host);
  root.render(React.createElement(HomeApp, { services }));
  await waitFor(() => byId("app-shell"), "HomeApp 首帧渲染");
  // React 18 的 useSyncExternalStore 订阅落在 passive effect 里；首帧 DOM
  // 提交（上面的 waitFor 已满足）与订阅真正生效之间有一拍时间差——jsdom 下
  // 没有 act() 自动 flush passive effects，这里让出一个宏任务，确保
  // dialog/statusArea 等 store 的订阅已建立，避免下面的首次交互在订阅生效
  // 前触发 store 变更而被错过（表现为「工作流对话框打开」等待超时）。
  await wait(0);

  // ---- DOM 契约:三域 + 占位容器 id 逐一存在 ----
  const contractIds = [
    // app-shell
    "app-shell", "developer-btn", "open-output-btn", "app-update-dialog", "app-update-status", "app-update-check-btn",
    // library 骨架(3b 占位)
    "library-view", "recent-jobs-scroll-body", "recent-jobs-summary", "recent-jobs-empty",
    "library-grid", "recent-jobs-list", "load-more-jobs-btn", "open-query-btn", "library-search-input",
    "library-add-pdf-btn", "app-settings-btn",
    // workflow 对话框
    "translation-workflow-dialog", "translation-workflow-title", "translation-workflow-close-btn", "job-warning",
    // upload(job-form 家族)
    "job-form", "ocr_provider", "mineru_token", "paddle_token", "api_key",
    "file", "upload-fill", "credential-gate", "credential-gate-title", "credential-gate-help", "credential-gate-action",
    "upload-glyph", "file-label", "upload-help", "upload-status", "upload-progress-panel", "upload-progress-text",
    "inline-page-range", "page-range-start", "page-range-end", "translation-budget-note",
    "upload-action-slot", "page-range-btn", "submit-btn", "error-box-inline",
    // status 区占位(3b StatusCard)
    "status-section", "job-status-card",
    // 专业翻译对话框
    "page-range-dialog", "page-range-title", "page-range-limit-text", "job-glossary-id",
    "page-range-close-btn", "page-range-clear-btn", "page-range-apply-btn",
  ];
  for (const id of contractIds) {
    assert.ok(byId(id), `契约 id 缺失：#${id}`);
  }

  // ---- idle 复位链:上传瓦片回到默认态,提交按钮置灰 ----
  assert.equal(byId("file-label").textContent, "点击选择文件或拖到这里");
  assert.equal(byId("upload-help").textContent, "上传后会执行 OCR、翻译与 PDF 渲染。");
  assert.equal(byId("submit-btn").disabled, true);
  assert.equal(byId("submit-btn").textContent, "开始翻译");
  assert.equal(byId("job-warning").classList.contains("hidden"), true);
  assert.equal(byId("status-section").classList.contains("hidden"), true);

  // ---- 打开:添加按钮 → dispatch openTranslationWorkflow → 对话框开 ----
  const dialog = byId("translation-workflow-dialog");
  assert.equal(dialog.classList.contains("hidden"), true);
  click(byId("library-add-pdf-btn"));
  await waitFor(() => dialog.classList.contains("hidden") === false, "工作流对话框打开");
  assert.equal(events.open, 1, "打开必须经 APP_EVENTS.openTranslationWorkflow(3b 刷新挂起依赖)");
  assert.equal(dialog.dataset.open, "1");
  assert.equal(dialog.classList.contains("is-upload-mode"), true);
  assert.equal(byId("translation-workflow-title").textContent, "翻译 PDF");
  assert.equal(dom.window.document.documentElement.classList.contains("translation-workflow-open"), true);
  await waitFor(() => byId("library-add-pdf-btn").getAttribute("aria-expanded") === "true", "触发按钮 aria 同步");
  assert.equal(byId("library-add-pdf-btn").dataset.workflowOpen, "1");

  // ---- 关闭:Escape → dispatch closeTranslationWorkflow → 对话框关 ----
  dom.window.document.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  await waitFor(() => dialog.classList.contains("hidden") === true, "Escape 关闭对话框");
  assert.equal(events.close, 1, "关闭必须经 APP_EVENTS.closeTranslationWorkflow(3b 刷新恢复依赖)");
  assert.equal(dom.window.document.documentElement.classList.contains("translation-workflow-open"), false);

  // ---- 关闭按钮路径 ----
  click(byId("library-add-pdf-btn"));
  await waitFor(() => dialog.classList.contains("hidden") === false, "再次打开");
  click(byId("translation-workflow-close-btn"));
  await waitFor(() => dialog.classList.contains("hidden") === true, "关闭按钮关闭对话框");
  assert.equal(events.close, 2);

  // ---- setText("error-box") 通道:inline-error-box 显隐 ----
  services.bridge.setText("error-box", "上传通道异常");
  await waitFor(() => byId("error-box-inline").classList.contains("hidden") === false, "错误盒显示");
  assert.match(byId("error-box-inline").textContent, /上传通道异常/);
  services.bridge.setText("error-box", "-");
  await waitFor(() => byId("error-box-inline").classList.contains("hidden") === true, "错误盒隐藏");

  // ---- 页码区间:上传态就位后可见,输入越界被约束 ----
  services.ports.uploadStatePort.setUpload({ uploadId: "u-1", uploadedPageCount: 10 });
  services.features.uploadFeature.renderPageRangeSummary();
  await waitFor(() => byId("inline-page-range").classList.contains("hidden") === false, "页码区间显示");
  typeInput(byId("page-range-start"), "99");
  await waitFor(() => byId("page-range-start").value === "10", "起始页被约束到总页数");

  // ---- 状态区可见性 → 对话框模式同步(statusAreaVisibilityChanged 契约) ----
  click(byId("library-add-pdf-btn"));
  await waitFor(() => dialog.classList.contains("hidden") === false, "第三次打开");
  // openUpload 会复位上传会话(uploadId 清空)
  assert.equal(services.ports.uploadStatePort.getSnapshot().uploadId, "");
  services.bridge.setWorkflowSections({ job_id: "job-1", status: "running" });
  await waitFor(() => byId("status-section").classList.contains("hidden") === false, "状态区显示");
  await waitFor(() => dialog.classList.contains("is-status-mode"), "对话框切到状态模式");
  assert.equal(byId("translation-workflow-title").textContent, "任务进度");
  services.bridge.setWorkflowSections(null);
  await waitFor(() => byId("status-section").classList.contains("hidden") === true, "状态区隐藏");
  await waitFor(() => dialog.classList.contains("is-upload-mode"), "对话框回到上传模式");

  // ---- 状态模式下的关闭 = 返回主页(returnHome 事件),不直接关框 ----
  services.bridge.setWorkflowSections({ job_id: "job-2", status: "running" });
  await waitFor(() => dialog.classList.contains("is-status-mode"), "回到状态模式");
  let returnHomeCount = 0;
  dom.window.document.addEventListener(APP_EVENTS.returnHome, () => { returnHomeCount += 1; });
  const closesBefore = events.close;
  click(byId("translation-workflow-close-btn"));
  await wait(30);
  assert.equal(returnHomeCount, 1, "状态模式关闭应走 returnHome");
  assert.equal(events.close, closesBefore, "状态模式关闭不应 dispatch closeTranslationWorkflow");

  root.unmount();
  services.dispose();
  host.remove();
});

test("HomeApp：3b 回调桥接口定型(蓝图 §4)", () => {
  const services = createServices();
  // mountJobRuntimeFeature / status-detail / credentials 接线所需的回调名
  const bridgeContract = [
    "setText",
    "setWorkflowSections",
    "setLinearProgress",
    "updateActionButtons",
    "renderPageRangeSummary",
    "resetUploadProgress",
    "resetUploadedFile",
    "applyWorkflowMode",
    "updateJobWarning",
    "resetEventsList",
    "activateDetailTab",
    "setSubmitBusy",
    "submitForm",
  ];
  for (const name of bridgeContract) {
    assert.equal(typeof services.bridge[name], "function", `bridge.${name} 缺失`);
  }
  // 3b workflow-open-port 注入口
  assert.equal(typeof services.workflowDialog.isOpen, "function");
  assert.equal(services.workflowDialog.isOpen(), false);
  services.dispose();
});
