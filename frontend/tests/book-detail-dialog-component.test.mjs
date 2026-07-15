import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

// 书籍详情弹窗(参考 PDF_MD_lib 的 BookDetailModal)组件级测试:点卡片打开、
// 元数据渲染、阅读状态切换走 patchDocument、馆藏/已翻译的动作集不同。
//
// 每个 test 一份全新 JSDOM(同一个 jsdom 第二次 createRoot 会停摆)。

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
    const value = predicate();
    if (value) {
      return value;
    }
    await wait(15);
  }
  assert.fail(`等待超时：${description}`);
}

function click(dom, element) {
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

test("馆藏卡打开书籍详情:元数据 + 阅读状态切换 + 翻译/读原文动作,无对照阅读", async () => {
  const dom = makeDom("?mock=parallel");
  const byId = (id) => dom.window.document.getElementById(id);
  const { services, root, host } = await bootHomeApp(dom);

  const card = await waitFor(
    () => dom.window.document.querySelector('#recent-jobs-list .recent-job-item[data-library-only="true"]'),
    "馆藏卡就位",
  );
  const documentId = card.getAttribute("data-document-id");
  click(dom, card);

  const dlg = await waitFor(() => byId("book-detail-dialog"), "书籍详情弹窗打开");
  // 元数据(标题从完整文档拉回来)
  await waitFor(() => byId("book-detail-title-input")?.value, "标题就位");
  assert.ok(dlg.querySelector(".book-detail-status")?.textContent.includes("未翻译"), "馆藏显示未翻译");
  // 馆藏:有翻译 + 读原文,无对照阅读
  assert.ok(byId("book-detail-translate-btn"), "馆藏有翻译按钮");
  assert.ok(byId("book-detail-read-source-btn"), "有读原文");
  assert.equal(byId("book-detail-compare-btn"), null, "馆藏没有对照阅读");

  // 阅读状态切换 → patchDocument(mock),按钮变激活
  const { getMockDocument } = await import("../src/js/mock/documents.js");
  const readBtns = dlg.querySelectorAll(".book-detail-reading-btn");
  const doneBtn = Array.from(readBtns).find((b) => b.textContent === "读完");
  click(dom, doneBtn);
  await waitFor(() => doneBtn.classList.contains("is-active"), "读完变激活");
  await waitFor(() => getMockDocument(documentId).reading_status === "done", "patchDocument 落库 reading_status=done");

  root.unmount();
  services.dispose();
  host.remove();
});

test("已翻译卡打开书籍详情:有对照阅读,无翻译按钮", async () => {
  const dom = makeDom("?mock=parallel");
  const byId = (id) => dom.window.document.getElementById(id);
  const { services, root, host } = await bootHomeApp(dom);

  // mock 里 att-001/scl-002 等合成 book 是 succeeded 的已翻译文档
  const card = await waitFor(
    () => dom.window.document.querySelector('#recent-jobs-list .recent-job-item[data-library-only="false"][data-status="succeeded"]'),
    "已翻译卡就位",
  );
  click(dom, card);

  const dlg = await waitFor(() => byId("book-detail-dialog"), "书籍详情弹窗打开");
  assert.ok(dlg.querySelector(".book-detail-status")?.textContent.includes("已完成"), "显示已完成");
  assert.ok(byId("book-detail-compare-btn"), "已翻译有对照阅读");
  assert.equal(byId("book-detail-translate-btn"), null, "已翻译没有翻译按钮");
  assert.ok(byId("book-detail-read-source-btn"), "仍可读原文");

  root.unmount();
  services.dispose();
  host.remove();
});
