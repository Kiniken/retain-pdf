import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

// F3 "只入库,不翻译":PDF 在**上传完成那一刻**后端就已经建好 document 了
// (POST /uploads → upsert_document_from_upload,document_id = 内容哈希),所以
// "只入库"不需要任何新接口——就是不提交翻译 job:关掉工作流对话框 + 刷新图书馆,
// 新文档以馆藏态进网格,以后想翻再在卡片上点"翻译"(F5)。
//
// 独立文件 + 每个 test 一份全新 JSDOM(不与 home-app-component.test.mjs 共用
// 模块级 dom):同一个 jsdom 里第二次 createRoot 会停摆(见 memory
// react-jsdom-test-pitfalls)。

function makeDom(search = "") {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: `http://localhost/index.html${search}`,
  });
  for (const key of ["window", "document", "HTMLElement", "HTMLInputElement", "CustomEvent", "Event", "KeyboardEvent", "MouseEvent", "Node", "MutationObserver", "NodeFilter"]) {
    Object.defineProperty(globalThis, key, {
      value: dom.window[key] ?? dom.window,
      writable: true,
      configurable: true,
    });
  }
  globalThis.window = dom.window;
  globalThis.requestAnimationFrame = (callback) => setTimeout(() => callback(0), 0);
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
  globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
  globalThis.IS_REACT_ACT_ENVIRONMENT = false;
  return dom;
}

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

function click(dom, element) {
  element.dispatchEvent(new dom.window.MouseEvent("mousedown", { bubbles: true, button: 0 }));
  element.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
}

async function bootHomeApp(dom) {
  const { createRoot } = await import("react-dom/client");
  const React = await import("react");
  const { createHomeComposition } = await import("../src/pages/home/composition.js");
  const { HomeApp } = await import("../src/pages/home/HomeApp.jsx");

  const host = dom.window.document.createElement("div");
  host.id = "home-root";
  dom.window.document.body.appendChild(host);

  const services = createHomeComposition({
    fetchGlossaries: async () => ({ items: [] }),
    loadPersistedDeveloperConfig: () => ({}),
    loadPersistedBrowserConfig: () => ({}),
  });
  services.initialize();

  const root = createRoot(host);
  root.render(React.createElement(HomeApp, { services }));
  await waitFor(() => dom.window.document.getElementById("app-shell"), "HomeApp 首帧渲染");
  await wait(0);
  return { services, root, host };
}

test("只入库不翻译:上传就绪才出现,点击 = 关对话框 + 刷新图书馆(不提交翻译 job)", async () => {
  const dom = makeDom("?mock=parallel");
  const byId = (id) => dom.window.document.getElementById(id);
  const { services, root, host } = await bootHomeApp(dom);
  const { APP_EVENTS } = await import("../src/js/contracts/app-contract.js");

  // 打开"添加 PDF"对话框
  click(dom, byId("library-add-pdf-btn"));
  await waitFor(() => byId("translation-workflow-dialog") !== null, "工作流对话框打开");

  // 未上传就绪 → 只入库按钮隐藏(没有 document 可入库)
  assert.ok(byId("store-only-btn"), "只入库按钮在 DOM 里");
  assert.equal(byId("store-only-btn").classList.contains("hidden"), true, "未上传就绪时隐藏");

  // 上传完成(后端此刻已建好 document)→ 只入库按钮出现
  services.uploadViewActions.patch({ ready: true, actionSlotVisible: true });
  await waitFor(
    () => byId("store-only-btn").classList.contains("hidden") === false,
    "上传就绪后只入库按钮出现",
  );

  let libraryRefreshed = false;
  let jobSubmitted = false;
  dom.window.document.addEventListener(APP_EVENTS.libraryRefreshRequested, () => { libraryRefreshed = true; });
  // 只入库绝不能走翻译提交链路
  dom.window.document.addEventListener(APP_EVENTS.libraryJobCreated, () => { jobSubmitted = true; });

  click(dom, byId("store-only-btn"));

  await waitFor(() => byId("translation-workflow-dialog") === null, "只入库后关闭工作流对话框");
  await waitFor(() => libraryRefreshed, "只入库后请求刷新图书馆(新文档以馆藏态出现)");
  await wait(50);
  assert.equal(jobSubmitted, false, "只入库不提交任何翻译 job");

  root.unmount();
  services.dispose();
  host.remove();
});
