import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

// 图书馆优先(参考 PDF_MD_lib 的 UploadModal):上传 = 入库,不是翻译。
// PDF 在**上传完成那一刻**后端就建好 document 了(POST /uploads →
// upsert_document_from_upload),所以上传成功即"入库并关对话框",不再让用户在
// "开始翻译 / 只入库"里二选一。要翻译到书架卡片上点"翻译"(F5)。
//
// 独立文件 + 每个 test 一份全新 JSDOM(同一个 jsdom 里第二次 createRoot 会停摆,
// 见 memory react-jsdom-test-pitfalls)。

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

test("上传即入库:上传完成自动关对话框 + 刷新图书馆,不提交任何翻译 job", async () => {
  const dom = makeDom("?mock=parallel");
  const byId = (id) => dom.window.document.getElementById(id);
  const { services, root, host } = await bootHomeApp(dom);
  const { APP_EVENTS } = await import("../src/js/contracts/app-contract.js");

  click(dom, byId("library-add-pdf-btn"));
  await waitFor(() => byId("translation-workflow-dialog") !== null, "添加对话框打开");
  // 添加对话框不再是"翻译 PDF",而是"添加 PDF 到图书馆",也没有"只入库"这个二选一按钮。
  assert.equal(byId("translation-workflow-title").textContent, "添加 PDF 到图书馆");
  assert.equal(byId("store-only-btn"), null, "不再有独立的只入库按钮(上传即入库)");

  let libraryRefreshed = false;
  let jobSubmitted = false;
  dom.window.document.addEventListener(APP_EVENTS.libraryRefreshRequested, () => { libraryRefreshed = true; });
  dom.window.document.addEventListener(APP_EVENTS.libraryJobCreated, () => { jobSubmitted = true; });

  // 模拟"上传完成"(真实上传成功后 markUploadReady(true))——应触发自动入库 + 关闭。
  services.uploadViewActions.patch({ ready: true, actionSlotVisible: true });

  await waitFor(() => byId("translation-workflow-dialog") === null, "上传完成后自动关闭添加对话框");
  await waitFor(() => libraryRefreshed, "上传完成后自动刷新图书馆(新书以馆藏态出现)");
  await wait(50);
  assert.equal(jobSubmitted, false, "上传入库不提交任何翻译 job");

  root.unmount();
  services.dispose();
  host.remove();
});
