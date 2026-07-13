// reader 页 React 入口(Phase 2a 探针):挂载 #reader-root,渲染阅读器壳。
// PDF 本体不进虚拟 DOM——由 src/js/reader/ 的命令式模块驱动(见 hooks/use-reader-boot.js)。
// 打包产物为 dist/reader.bundle.js(见 scripts/build-js-bundle.mjs)。

import { createRoot } from "react-dom/client";
import { ReaderApp } from "./ReaderApp.jsx";

// 渲染前同步 body class:CSS 的 :has()/body-class 驱动规则(reader-page.css)依赖它们。
// reader-embedded 必须在首帧前设好,否则嵌入态(reader-dialog iframe)动作组会从右上角闪到左上角。
function syncReaderBodyClasses(body = document.body) {
  body.classList.add("reader-body", "reader-mode-compare");
  if (globalThis.window && window.self !== window.top) {
    body.classList.add("reader-embedded");
  }
}

// 过渡期兜底:探针验证时 reader.html 只换 <script> 入口,旧静态骨架仍在 body 里,
// 先清掉再挂 React 树,避免两套 DOM(重复 id/固定层)叠加。
// cutover(2b)后 body 只剩脚本与 #reader-root,此步退化为空操作。
function purgeLegacyMarkup(body = document.body) {
  Array.from(body.children).forEach((element) => {
    if (element.tagName !== "SCRIPT" && element.id !== "reader-root") {
      element.remove();
    }
  });
}

function resolveReaderRoot(body = document.body) {
  let host = document.getElementById("reader-root");
  if (!host) {
    host = document.createElement("div");
    host.id = "reader-root";
    body.appendChild(host);
  }
  return host;
}

syncReaderBodyClasses();
purgeLegacyMarkup();
createRoot(resolveReaderRoot()).render(<ReaderApp />);
