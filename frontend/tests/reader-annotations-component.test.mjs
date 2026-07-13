import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

// React 组件级测试:经 tests/helpers/jsx-loader.mjs 的 esbuild 钩子直接加载 .jsx

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/" });
for (const key of ["window", "document", "HTMLElement", "CustomEvent", "Event", "Node", "MutationObserver"]) {
  Object.defineProperty(globalThis, key, {
    value: dom.window[key] ?? dom.window,
    writable: true,
    configurable: true,
  });
}
globalThis.window = dom.window;
globalThis.requestAnimationFrame = (callback) => setTimeout(() => callback(0), 0);
// Radix Presence/Tabs(阶段 B 引入)在 jsdom 下需要 cancelAnimationFrame
// (TabsContent 的 mount 动画计时器清理)和 getComputedStyle(Presence 读取
// animation-name 判断退场动画是否结束)——jsdom 的 window 上有实现,只是没有
// 像 requestAnimationFrame 一样被复制到裸 global 上,这里一并补上。
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
globalThis.IS_REACT_ACT_ENVIRONMENT = false;

const { ANNOTATION_KIND_META } = await import("../src/js/reader/annotations/view-model.js");
const { mountReaderAnnotationsApp } = await import("../src/js/islands/reader-annotations/reader-annotations-app.jsx");

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function click(element) {
  element.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
}

function makeAnnotations() {
  return [
    {
      favoriteId: "fav-1",
      pageIdx: 0,
      blockId: "b-1",
      kind: "sentence",
      quoteText: "第一条批注原文",
      translatedQuoteText: "",
      note: "已有的笔记",
      createdAt: "2026-07-01T10:00:00Z",
    },
    {
      favoriteId: "fav-2",
      pageIdx: 0,
      blockId: "b-2",
      kind: "data",
      quoteText: "第二条批注原文",
      translatedQuoteText: "第二条批注译文",
      note: "",
      createdAt: "2026-07-01T11:00:00Z",
    },
    {
      favoriteId: "fav-3",
      pageIdx: 2,
      blockId: "b-3",
      kind: "figure",
      quoteText: "第三条批注原文",
      translatedQuoteText: "",
      note: "",
      createdAt: "2026-07-02T09:00:00Z",
    },
  ];
}

test("批注面板:分组渲染、笔记编辑、乐观删除与 Markdown 导出", async () => {
  const host = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(host);

  const deleteCalls = [];
  const saveCalls = [];
  const exportCalls = [];
  const jumpCalls = [];
  const ports = {
    subscribeOpen: (subscriber) => {
      subscriber(true);
      return () => {};
    },
    loadAnnotations: async () => makeAnnotations(),
    deleteAnnotation: async (favoriteId) => {
      deleteCalls.push(favoriteId);
      return true;
    },
    saveNote: async (annotation, note) => {
      saveCalls.push([annotation.favoriteId, note]);
      return { ...annotation, note };
    },
    jumpToAnchor: (anchor) => {
      jumpCalls.push(anchor);
    },
    exportMarkdown: async (text) => {
      exportCalls.push(text);
      return true;
    },
    documentTitle: () => "测试文档",
  };

  const app = mountReaderAnnotationsApp(host, ports);
  await wait(50);

  // 基础渲染:分组标题、卡片、徽章、已有笔记
  assert.ok(host.querySelector(".reader-annotations-panel"), "面板已渲染");
  assert.equal(host.querySelector(".reader-annotations-count")?.textContent, "3 条批注");
  const groupTitles = [...host.querySelectorAll(".reader-annotations-group-title")];
  assert.equal(groupTitles.length, 2, "两个分组标题");
  assert.deepEqual(groupTitles.map((node) => node.textContent), ["第 1 页", "第 3 页"]);
  const items = [...host.querySelectorAll(".reader-annotations-item")];
  assert.equal(items.length, 3, "三张批注卡片");
  assert.deepEqual(
    [...host.querySelectorAll(".reader-annotations-kind")].map((node) => node.textContent),
    [
      ANNOTATION_KIND_META.sentence.label,
      ANNOTATION_KIND_META.data.label,
      ANNOTATION_KIND_META.figure.label,
    ],
    "kind 徽章文案正确",
  );
  assert.ok(host.querySelector(".reader-annotations-kind.is-data"), "徽章带 is-{kind} 类名");
  assert.equal(host.querySelector(".reader-annotations-note")?.textContent, "已有的笔记");
  assert.equal(host.querySelector(".reader-annotations-translated")?.textContent, "第二条批注译文");

  // 添加笔记:出现 textarea,输入后保存
  const secondItem = host.querySelectorAll(".reader-annotations-item")[1];
  click(secondItem.querySelector(".reader-annotations-note-add"));
  await wait(30);
  const textarea = secondItem.querySelector(".reader-annotations-note-input");
  assert.ok(textarea, "编辑态出现 textarea");
  const valueSetter = Object.getOwnPropertyDescriptor(
    dom.window.HTMLTextAreaElement.prototype,
    "value",
  ).set;
  valueSetter.call(textarea, "新增的笔记");
  textarea.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  await wait(30);
  click(secondItem.querySelector(".reader-annotations-note-save"));
  await wait(50);
  assert.deepEqual(saveCalls, [["fav-2", "新增的笔记"]], "saveNote 被调用");
  const noteTexts = [...host.querySelectorAll(".reader-annotations-note")].map((node) => node.textContent);
  assert.ok(noteTexts.includes("新增的笔记"), "笔记文案已更新");

  // 导出 Markdown:含 "# " 标题与 "> " 引用块,按钮短暂变为「已复制」
  click(host.querySelector(".reader-annotations-export"));
  await wait(50);
  assert.equal(exportCalls.length, 1, "exportMarkdown 被调用一次");
  assert.ok(exportCalls[0].includes("# "), "Markdown 含标题");
  assert.ok(exportCalls[0].includes("> "), "Markdown 含引用块");
  assert.equal(host.querySelector(".reader-annotations-export")?.textContent, "已复制");

  // 删除:乐观移除且 deleteAnnotation 被调
  click(host.querySelector(".reader-annotations-item .reader-annotations-remove"));
  await wait(50);
  assert.equal(host.querySelectorAll(".reader-annotations-item").length, 2, "卡片乐观移除");
  assert.deepEqual(deleteCalls, ["fav-1"], "deleteAnnotation 被调用");

  // 定位:传 annotationAnchor 结果
  click(host.querySelector(".reader-annotations-item .reader-annotations-locate"));
  await wait(30);
  assert.deepEqual(jumpCalls, [{ pageIdx: 0, blockId: "b-2" }]);

  app.unmount();
  host.remove();
});
