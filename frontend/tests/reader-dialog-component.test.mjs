import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

// ReaderDialog(Phase 3 dialogs 群,蓝图 §4;阶段 C 收官批换 Radix Dialog)
// 组件级测试。覆盖蓝图 §4.4 + 施工范围第 6 条新增测试清单:open/close 生命
// 周期(路由同步、frame src 切换、loading 复位)、postMessage 进度驱动(mock
// message event,断言进度条宽度/文案)、stage==="ready" 关闭延时、
// APP_EVENTS.openReaderRequested 触发打开、URL 深链启动(?view=reader&job_id=)。
//
// 阶段 C 收官批断言口径变化:Content 不 forceMount,关闭态整个子树(含
// #reader-dialog-frame/#reader-dialog-loading 等)不挂载于 DOM——断言从
// "dialog.open 属性真假"改为"元素是否挂载",同 C-1/C-2 已迁移的 4 个对话框
// 测试文件先例。背板点击的纯关闭语义靠 fresh Playwright 实测(jsdom 下
// Radix DismissableLayer 的 outside-pointerdown 检测不可靠,同
// PageRangeDialog/credentials-dialog-component.test.mjs 等既有先例,只在这里
// 测挂载/关闭按钮,不测背板/Esc)。
//
// makeDom(search) 模式镜像 status-detail-dialog-component.test.mjs 先例
// (不同测试需要不同起始 URL,不能像 home-app-component.test.mjs 那样共用
// 一个模块级 dom)。

function makeDom(search) {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: `http://localhost/home-react-dev.html${search}`,
  });
  for (const key of ["window", "document", "HTMLElement", "HTMLInputElement", "HTMLSelectElement", "CustomEvent", "Event", "MessageEvent", "KeyboardEvent", "MouseEvent", "Node", "MutationObserver", "NodeFilter"]) {
    Object.defineProperty(globalThis, key, {
      value: dom.window[key] ?? dom.window,
      writable: true,
      configurable: true,
    });
  }
  globalThis.window = dom.window;
  globalThis.requestAnimationFrame = (callback) => setTimeout(() => callback(0), 0);
  // Radix Presence/Tabs/FocusScope(阶段 B/C 引入)在 jsdom 下需要
  // cancelAnimationFrame(TabsContent 的 mount 动画计时器清理)和
  // getComputedStyle(Presence 读取 animation-name 判断退场动画是否结束)——
  // jsdom 的 window 上有实现,只是没有像 requestAnimationFrame 一样被复制到
  // 裸 global 上,这里一并补上。
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

function byId(dom, id) {
  return dom.window.document.getElementById(id);
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
  // 阶段 C 收官批后 #reader-dialog 不再常驻挂载(Radix Content 不 forceMount,
  // 只有打开过才存在于 DOM),首帧就绪信号改用永远无条件渲染的 #app-shell。
  await waitFor(() => byId(dom, "app-shell"), "HomeApp 首帧渲染");
  // React 18 的 useSyncExternalStore 订阅落在 passive effect 里,这里让出一个
  // 宏任务,确保 dialog store 的订阅已建立(同 home-app-component.test.mjs 的
  // 既有先例),也让 URL 深链检查(ReaderDialog 自己的一次性挂载 effect)有
  // 机会跑完。
  await wait(0);

  return { services, root, host };
}

// 派发一条来源受信的 postMessage 进度事件——照搬 config/runtime.js#isTrustedWindowMessage
// 的校验条件:event.source 必须等于 iframe 的 contentWindow,event.origin 必须
// 等于宿主自身 origin(jsdom 下与 isFileProtocol() 无关,走 http: 分支)。
function postReaderProgressMessage(dom, data) {
  const frame = byId(dom, "reader-dialog-frame");
  const event = new dom.window.MessageEvent("message", {
    data,
    origin: dom.window.location.origin,
    source: frame?.contentWindow,
  });
  dom.window.dispatchEvent(event);
}

test("ReaderDialog：open/close 生命周期——路由同步、frame src 切换、loading 复位", async () => {
  const dom = makeDom("?mock=succeeded");
  const { services, root, host } = await bootHomeApp(dom);
  const { getMockJobId } = await import("../src/js/mock/index.js");
  const jobId = getMockJobId();

  assert.equal(byId(dom, "reader-dialog"), null, "初始未打开时不挂载");

  services.reader.openReader(jobId);
  // 注意:等待条件用"iframe src 已写入"而不是"#reader-dialog 挂载"——Content
  // 的 mount 发生在 React 提交阶段(同步),而实际写入 src 的是 effect (b)
  // (被动 effect,提交完成后才异步 flush),两者之间有真实的可观察窗口。旧
  // 实现里 <dialog> 常驻挂载,轮询的是 dialog.open 属性,而这个属性恰好也是
  // 由被动 effect 设置的,和 src 写入effect 同批 flush、顺序在前,不会有这个
  // 竞态;现在 Content 按需 mount,不能再用"元素存在"当"effect 已跑完"的
  // 代理信号。
  await waitFor(() => (byId(dom, "reader-dialog-frame")?.getAttribute("src") || "").includes(`job_id=${jobId}`), "对话框打开且 iframe src 已同步");
  const frame = byId(dom, "reader-dialog-frame");
  assert.equal(frame.hasAttribute("srcdoc"), false, "打开后 srcdoc 被清除");
  assert.match(frame.getAttribute("src") || "", /reader\.html\?job_id=mock-job-20260415/, "iframe src 指向阅读器页面并带上 job_id");
  assert.match(dom.window.location.href, /view=reader/, "路由同步写入 view=reader");
  assert.match(dom.window.location.href, new RegExp(`job_id=${jobId}`), "路由同步写入 job_id");
  assert.equal(byId(dom, "reader-dialog-loading").classList.contains("hidden"), false, "打开瞬间 loading 遮罩可见");

  // 关闭:阶段 C 收官批换 Radix Dialog 后不再是原生 <dialog>,没有 close 事件
  // 语义了——Esc/背板点击/关闭按钮三条路径都统一路由到
  // onOpenChange(false) → dialogStore.close(),这里直接驱动 store 等价触发。
  // Content 不 forceMount,关闭后整个子树(iframe/loading 遮罩)随之卸载,
  // 断言从"属性/class 复位"改为"元素不再挂载"。
  services.reader.dialogStore.close();
  await waitFor(() => byId(dom, "reader-dialog") === null, "对话框关闭(Content 卸载)");
  assert.equal(byId(dom, "reader-dialog-frame"), null, "关闭后 iframe 随 Content 一起卸载");
  assert.equal(byId(dom, "reader-dialog-loading"), null, "关闭后 loading 遮罩随 Content 一起卸载");
  assert.doesNotMatch(dom.window.location.href, /view=reader/, "关闭后路由清掉 view=reader");
  assert.doesNotMatch(dom.window.location.href, /job_id=/, "关闭后路由清掉 job_id");

  root.unmount();
  services.dispose();
  host.remove();
});

test("ReaderDialog：关闭按钮点击会关闭对话框", async () => {
  const dom = makeDom("?mock=succeeded");
  const { services, root, host } = await bootHomeApp(dom);
  const { getMockJobId } = await import("../src/js/mock/index.js");

  services.reader.openReader(getMockJobId());
  await waitFor(() => byId(dom, "reader-dialog") !== null, "对话框打开");

  byId(dom, "reader-dialog-close-btn").dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
  await waitFor(() => byId(dom, "reader-dialog") === null, "关闭按钮点击后对话框卸载");

  // 关闭后重新打开:Content 卸载后再挂载是全新的 DOM 节点(iframe 也是全新
  // 元素),这里验证 src 切换在这个 mount/unmount 循环里依然正常生效,不是
  // 死链或空白(蓝图 §4 铁律关注点)。
  services.reader.openReader(getMockJobId());
  await waitFor(() => (byId(dom, "reader-dialog-frame")?.getAttribute("src") || "").includes("reader.html?job_id="), "再次打开且 iframe src 已同步");
  const frame = byId(dom, "reader-dialog-frame");
  assert.match(frame.getAttribute("src") || "", /reader\.html\?job_id=/, "重新打开后 iframe src 指向阅读器页面,不是死链/空白");

  root.unmount();
  services.dispose();
  host.remove();
});

test("ReaderDialog：postMessage 进度驱动——契约字段与进度条/文案写入", async () => {
  const dom = makeDom("?mock=succeeded");
  const { services, root, host } = await bootHomeApp(dom);
  const { getMockJobId } = await import("../src/js/mock/index.js");
  const { READER_DIALOG_MESSAGES } = await import("../src/js/features/reader-dialog/contract.js");

  services.reader.openReader(getMockJobId());
  await waitFor(() => byId(dom, "reader-dialog") !== null, "对话框打开");

  assert.equal(READER_DIALOG_MESSAGES.progress, "retainpdf-reader-progress", "契约字符串对齐 Phase2b 发送端");

  postReaderProgressMessage(dom, {
    type: READER_DIALOG_MESSAGES.progress,
    stage: "pdfs",
    percent: 54,
    text: "原始 PDF 已加载，正在加载译文 PDF…",
  });

  await waitFor(() => byId(dom, "reader-dialog-loading-text").textContent === "原始 PDF 已加载，正在加载译文 PDF…", "文案写入(ref 直写 textContent)");
  await waitFor(() => byId(dom, "reader-dialog-loading-bar").style.width === "54%", "进度条宽度写入(rAF easing 落定后应等于目标值)");
  assert.equal(byId(dom, "reader-dialog-loading-percent").textContent, "54%", "百分比文案写入");
  assert.equal(byId(dom, "reader-dialog-loading").classList.contains("hidden"), false, "进度中 loading 遮罩保持可见");

  // 不受信来源(origin 不匹配)应被 isTrustedWindowMessage 拒绝,不产生任何写入。
  const untrustedEvent = new dom.window.MessageEvent("message", {
    data: { type: READER_DIALOG_MESSAGES.progress, stage: "pdfs", percent: 10, text: "不该生效" },
    origin: "https://evil.example",
    source: byId(dom, "reader-dialog-frame")?.contentWindow,
  });
  dom.window.dispatchEvent(untrustedEvent);
  await wait(30);
  assert.equal(byId(dom, "reader-dialog-loading-text").textContent, "原始 PDF 已加载，正在加载译文 PDF…", "不受信消息不改变文案");

  root.unmount();
  services.dispose();
  host.remove();
});

test("ReaderDialog：stage===\"ready\" && percent>=100 触发 180ms 延时隐藏", async () => {
  const dom = makeDom("?mock=succeeded");
  const { services, root, host } = await bootHomeApp(dom);
  const { getMockJobId } = await import("../src/js/mock/index.js");
  const { READER_DIALOG_MESSAGES } = await import("../src/js/features/reader-dialog/contract.js");

  services.reader.openReader(getMockJobId());
  await waitFor(() => byId(dom, "reader-dialog") !== null, "对话框打开");

  postReaderProgressMessage(dom, {
    type: READER_DIALOG_MESSAGES.progress,
    stage: "ready",
    percent: 100,
    text: "对照阅读已就绪",
  });

  // 断言时机用文案(setLoadingText 同步写入)而不是百分比数字——百分比走
  // rAF easing 动画,大跳变(0→100)缓动本身就要跑到 1400ms,比 180ms 隐藏
  // 延时还慢,用它当"消息已处理"的信号会正好等过 180ms 窗口,断言必然假
  // 阳性通过。
  await waitFor(() => byId(dom, "reader-dialog-loading-text").textContent === "对照阅读已就绪", "文案先写入(同步)");
  assert.equal(byId(dom, "reader-dialog-loading").classList.contains("hidden"), false, "180ms 延时触发前遮罩仍可见");

  await waitFor(() => byId(dom, "reader-dialog-loading").classList.contains("hidden") === true, "180ms 后遮罩隐藏");

  root.unmount();
  services.dispose();
  host.remove();
});

test("ReaderDialog：APP_EVENTS.openReaderRequested 是打开的唯一消费点(recent-jobs/ResultActions/library-search 共用)", async () => {
  const dom = makeDom("?mock=succeeded");
  const { services, root, host } = await bootHomeApp(dom);
  const { APP_EVENTS } = await import("../src/js/contracts/app-contract.js");
  const { getMockJobId } = await import("../src/js/mock/index.js");
  const jobId = getMockJobId();

  dom.window.document.dispatchEvent(new dom.window.CustomEvent(APP_EVENTS.openReaderRequested, {
    detail: { jobId, pageIdx: null, blockId: "" },
  }));

  await waitFor(() => (byId(dom, "reader-dialog-frame")?.getAttribute("src") || "").includes(`job_id=${jobId}`), "事件驱动对话框打开且 iframe src 已同步");
  const frame = byId(dom, "reader-dialog-frame");
  assert.match(frame.getAttribute("src") || "", new RegExp(`job_id=${jobId}`));
  // 回归:pageIdx 显式传 null 时不应该退化成 page_idx=0(Number(null) === 0 的坑)。
  assert.doesNotMatch(frame.getAttribute("src") || "", /page_idx=/, "无锚点时 URL 不应带 page_idx");

  root.unmount();
  services.dispose();
  host.remove();
});

test("ReaderDialog：openReaderRequested 带 pageIdx/blockId 锚点时透传进 iframe URL", async () => {
  const dom = makeDom("?mock=succeeded");
  const { services, root, host } = await bootHomeApp(dom);
  const { APP_EVENTS } = await import("../src/js/contracts/app-contract.js");
  const { getMockJobId } = await import("../src/js/mock/index.js");
  const jobId = getMockJobId();

  dom.window.document.dispatchEvent(new dom.window.CustomEvent(APP_EVENTS.openReaderRequested, {
    detail: { jobId, pageIdx: 3, blockId: "block-7" },
  }));

  await waitFor(() => (byId(dom, "reader-dialog-frame")?.getAttribute("src") || "").includes("page_idx=3"), "事件驱动对话框打开且 iframe src 已同步");
  const frame = byId(dom, "reader-dialog-frame");
  assert.match(frame.getAttribute("src") || "", /page_idx=3/, "锚点页码透传进 URL");
  assert.match(frame.getAttribute("src") || "", /block_id=block-7/, "锚点 block 透传进 URL");

  root.unmount();
  services.dispose();
  host.remove();
});

test("ReaderDialog：URL 深链启动(?view=reader&job_id=)在挂载时直接打开,不经 openReaderRequested 竞态", async () => {
  const { getMockJobId } = await import("../src/js/mock/index.js");
  const jobId = getMockJobId();
  const dom = makeDom(`?mock=succeeded&view=reader&job_id=${jobId}`);
  const { services, root, host } = await bootHomeApp(dom);

  // 回归用例:composition.js 曾经用 setTimeout(0) 派发 openReaderRequested 来
  // 实现这条深链,与 ReaderDialog 挂载后才注册的 useAppEvent 监听器竞速,
  // 派发常常先于监听器就绪导致深链完全打不开——现在 ReaderDialog 挂载 effect
  // 自己读一次 URL 直接 open(),这里断言深链在合理时间内(远小于旧竞态偶发
  // 命中的窗口)必然打开,不是"有时候能开"。
  await waitFor(() => (byId(dom, "reader-dialog-frame")?.getAttribute("src") || "").includes(`job_id=${jobId}`), "深链启动打开对话框且 iframe src 已同步");
  const frame = byId(dom, "reader-dialog-frame");
  assert.match(frame.getAttribute("src") || "", new RegExp(`job_id=${jobId}`));

  root.unmount();
  services.dispose();
  host.remove();
});

test("ReaderDialog：宿主头部只保留关闭按钮,不渲染下载按钮(运行时复核死代码判定)", async () => {
  const dom = makeDom("?mock=succeeded");
  const { services, root, host } = await bootHomeApp(dom);
  const { getMockJobId } = await import("../src/js/mock/index.js");

  services.reader.openReader(getMockJobId());
  await waitFor(() => byId(dom, "reader-dialog") !== null, "对话框打开");

  assert.equal(byId(dom, "reader-source-download-btn"), null, "宿主不再渲染原始 PDF 下载按钮(下载入口已移入 reader.html 本体)");
  assert.equal(byId(dom, "reader-merged-download-btn"), null, "宿主不再渲染对照 PDF 下载按钮");
  assert.equal(byId(dom, "reader-translated-download-btn"), null, "宿主不再渲染译文 PDF 下载按钮");
  assert.ok(byId(dom, "reader-dialog-close-btn"), "关闭按钮仍在");

  root.unmount();
  services.dispose();
  host.remove();
});

test("ReaderDialog：job-runtime 引擎的 isReaderOpen()/onReaderDialogClose 与 readerDialogStore 联动", async () => {
  const dom = makeDom("?mock=succeeded");
  const { services, root, host } = await bootHomeApp(dom);
  const { getMockJobId } = await import("../src/js/mock/index.js");

  assert.equal(services.reader.dialogStore.getState().open, false);
  services.reader.openReader(getMockJobId());
  await waitFor(() => byId(dom, "reader-dialog") !== null, "对话框打开");
  assert.equal(services.reader.dialogStore.getState().open, true, "store 状态与 DOM 一致");

  // onReaderDialogClose 桥接(composition.js:mountJobRuntimeFeature payload)：
  // job-runtime 引擎在 job 返回 idle 态时应能关闭阅读器对话框。
  services.reader.dialogStore.close();
  await waitFor(() => byId(dom, "reader-dialog") === null, "dialogStore.close() 驱动 Content 卸载");

  root.unmount();
  services.dispose();
  host.remove();
});
