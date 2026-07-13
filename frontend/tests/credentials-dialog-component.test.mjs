import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

// CredentialsDialog(Phase 3 dialogs 群,蓝图 §2)组件级测试。
// 校验:契约 id、openBrowserCredentials 事件打开(含 setupMode 首次配置态)、
// OCR/DeepSeek 校验三态、保存两分支(浏览器/桌面)、隐藏 input 与
// credentialsStatePort 双向同步、SettingsHubDialog 的 #credentials-btn 触发点、
// 词表/更新两个 tab 的占位 id 契约。

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/index.html" });
for (const key of ["window", "document", "HTMLElement", "HTMLInputElement", "CustomEvent", "Event", "KeyboardEvent", "MouseEvent", "Node", "MutationObserver"]) {
  Object.defineProperty(globalThis, key, {
    value: dom.window[key] ?? dom.window,
    writable: true,
    configurable: true,
  });
}
globalThis.window = dom.window;
globalThis.localStorage = dom.window.localStorage;
globalThis.requestAnimationFrame = (callback) => setTimeout(() => callback(0), 0);
globalThis.IS_REACT_ACT_ENVIRONMENT = false;

const { createRoot } = await import("react-dom/client");
const React = await import("react");
const { createHomeComposition } = await import("../src/pages/home/composition.js");
const { HomeApp } = await import("../src/pages/home/HomeApp.jsx");
const { APP_EVENTS } = await import("../src/js/contracts/app-contract.js");
const { defaultCredentialsStatePort } = await import("../src/js/features/credentials/default-state-port.js");

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

function typeInput(element, value) {
  const setter = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value").set;
  setter.call(element, value);
  element.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
}

function mockValidators(overrides = {}) {
  return {
    validateOcrToken: async (_apiPrefix, _providerId, token) => {
      if (!token) {
        return { ok: false, status: "unauthorized", summary: "缺少 token" };
      }
      if (token === "bad-token") {
        return { ok: false, status: "unauthorized", summary: "Token 无效" };
      }
      return { ok: true, status: "valid", summary: "Token 有效" };
    },
    validateDeepSeekToken: async (_apiPrefix, payload) => {
      if (!payload?.api_key) {
        return { ok: false, status: 0 };
      }
      if (payload.api_key === "bad-key") {
        return { ok: false, status: 401, summary: "DeepSeek Key 无效或已过期。" };
      }
      return { ok: true, status: 200, summary: "DeepSeek 接口连接成功。" };
    },
    queryDeepSeekBalance: async () => ({
      ok: true,
      is_available: true,
      balance_infos: [{ currency: "CNY", total_balance: "88.00" }],
    }),
    ...overrides,
  };
}

function createServices(overrides = {}) {
  const { validateOcrToken, validateDeepSeekToken, queryDeepSeekBalance, ...rest } = mockValidators(overrides.validators);
  return createHomeComposition({
    fetchGlossaries: async () => ({ items: [] }),
    loadPersistedDeveloperConfig: () => ({}),
    loadPersistedBrowserConfig: () => ({}),
    validateOcrToken,
    validateDeepSeekToken,
    queryDeepSeekBalance,
    ...rest,
    ...overrides,
  });
}

async function mountHome(services) {
  const host = dom.window.document.createElement("div");
  host.id = "home-root";
  dom.window.document.body.appendChild(host);
  services.initialize();
  const root = createRoot(host);
  root.render(React.createElement(HomeApp, { services }));
  await waitFor(() => byId("app-shell"), "HomeApp 首帧渲染");
  await wait(0);
  return { host, root };
}

test("CredentialsDialog：契约 id、openBrowserCredentials 事件打开、setupMode 首次配置态", async () => {
  const services = createServices();
  const { host, root } = await mountHome(services);

  const dialog = byId("browser-credentials-dialog");
  assert.ok(dialog, "对话框常驻挂载");
  assert.equal(dialog.open, false, "初始未打开");

  for (const id of [
    "browser-credentials-title", "browser-credentials-close-btn", "browser-credentials-status",
    "browser-credentials-tabs", "browser-credential-tab-api", "browser-credential-tab-task",
    "browser-credentials-save-btn", "browser-paddle-token", "browser-paddle-validate-btn",
    "browser-paddle-validation", "browser-api-key", "browser-deepseek-validate-btn",
    "browser-deepseek-validation", "browser-deepseek-top-up-link", "browser-job-math-mode",
  ]) {
    assert.ok(byId(id), `契约 id 缺失：#${id}`);
  }

  dom.window.document.dispatchEvent(new dom.window.CustomEvent(APP_EVENTS.openBrowserCredentials));
  await waitFor(() => byId("browser-credentials-dialog").open === true, "普通打开");
  assert.equal(byId("browser-credentials-title").textContent, "接口设置");
  assert.equal(byId("browser-credentials-save-btn").textContent, "保存");
  assert.equal(byId("browser-credentials-tabs").classList.contains("hidden"), false);

  // ---- setupMode 首次配置态:tabs 隐藏,标题/保存文案切换 ----
  dom.window.document.dispatchEvent(new dom.window.CustomEvent(APP_EVENTS.openBrowserCredentials, {
    detail: { setupMode: true },
  }));
  await waitFor(() => byId("browser-credentials-title").textContent === "首次配置", "setupMode 标题切换");
  assert.equal(byId("browser-credentials-save-btn").textContent, "保存并启动");
  assert.equal(byId("browser-credentials-tabs").classList.contains("hidden"), true);
  assert.equal(byId("browser-credentials-dialog").dataset.setupMode, "1");

  root.unmount();
  services.dispose();
  host.remove();
});

test("CredentialsDialog：#credentials-btn(设置)与 #credential-gate-action(上传引导)都能打开对话框", async () => {
  const services = createServices();
  const { host, root } = await mountHome(services);

  click(byId("app-settings-btn"));
  await waitFor(() => byId("app-settings-dialog").open === true, "设置对话框打开");
  click(byId("credentials-btn"));
  await waitFor(() => byId("browser-credentials-dialog").open === true, "credentials-btn 打开凭据对话框");

  services.credentials.dialogStore.close();
  await waitFor(() => byId("browser-credentials-dialog").open === false, "关闭凭据对话框");

  click(byId("credential-gate-action"));
  await waitFor(() => byId("browser-credentials-dialog").open === true, "credential-gate-action 打开凭据对话框");

  root.unmount();
  services.dispose();
  host.remove();
});

test("CredentialsDialog：OCR/DeepSeek 校验三态(缺失/错误/通过)", async () => {
  const services = createServices();
  const { host, root } = await mountHome(services);

  dom.window.document.dispatchEvent(new dom.window.CustomEvent(APP_EVENTS.openBrowserCredentials));
  await waitFor(() => byId("browser-credentials-dialog").open === true, "打开对话框");

  // ---- OCR(paddle):缺失 → 错误 → 通过 ----
  click(byId("browser-paddle-validate-btn"));
  await waitFor(() => byId("browser-paddle-validation").title === "请先填写 Paddle Access Token。", "OCR 缺失态");
  assert.equal(byId("browser-paddle-validation").classList.contains("is-error"), true);

  typeInput(byId("browser-paddle-token"), "bad-token");
  click(byId("browser-paddle-validate-btn"));
  await waitFor(() => byId("browser-paddle-validation").title === "Token 无效", "OCR 错误态");
  assert.equal(byId("browser-paddle-validation").classList.contains("is-error"), true);

  typeInput(byId("browser-paddle-token"), "good-token");
  click(byId("browser-paddle-validate-btn"));
  await waitFor(() => byId("browser-paddle-validation").title === "Token 有效", "OCR 通过态");
  assert.equal(byId("browser-paddle-validation").classList.contains("is-valid"), true);

  // ---- DeepSeek:缺失 → 错误 → 通过(含充值提示,余额 < 2 元时才出现——
  //      mock 返回 88 元,不应显示充值链接) ----
  // 缺失态:deepseek-flow.js(kept)的 handleBrowserDeepSeekValidate 对"缺少
  // Key"分支直接 return,不写校验徽标(与 OCR 分支的语义不同,这是既有
  // 业务逻辑,不是本域重写的行为)——缺失态改由保存按钮的守卫触发验证。
  click(byId("browser-credentials-save-btn"));
  await waitFor(() => byId("browser-deepseek-validation").title === "请先填写 DeepSeek Key。", "DeepSeek 缺失态(经保存守卫触发)");
  assert.equal(byId("browser-deepseek-validation").classList.contains("is-error"), true);
  assert.equal(byId("browser-credentials-dialog").open, true, "缺字段时保存应被拦截,对话框不关闭");

  typeInput(byId("browser-api-key"), "bad-key");
  click(byId("browser-deepseek-validate-btn"));
  await waitFor(() => byId("browser-deepseek-validation").title === "DeepSeek Key 无效或已过期。", "DeepSeek 错误态");
  assert.equal(byId("browser-deepseek-validation").classList.contains("is-error"), true);
  assert.equal(byId("browser-deepseek-top-up-link").classList.contains("hidden"), true);

  typeInput(byId("browser-api-key"), "good-key");
  click(byId("browser-deepseek-validate-btn"));
  await waitFor(() => byId("browser-deepseek-validation").classList.contains("is-valid"), "DeepSeek 通过态");
  assert.match(byId("browser-deepseek-validation").title, /余额 CNY 88\.00/);
  assert.equal(byId("browser-deepseek-top-up-link").classList.contains("hidden"), true, "余额充足不提示充值");

  root.unmount();
  services.dispose();
  host.remove();
});

test("CredentialsDialog：保存(浏览器模式)——写隐藏 input、同步 credentialsStatePort、关闭对话框", async () => {
  const services = createServices();
  const { host, root } = await mountHome(services);

  dom.window.document.dispatchEvent(new dom.window.CustomEvent(APP_EVENTS.openBrowserCredentials));
  await waitFor(() => byId("browser-credentials-dialog").open === true, "打开对话框");

  typeInput(byId("browser-paddle-token"), "paddle-secret");
  typeInput(byId("browser-api-key"), "deepseek-secret");

  click(byId("browser-credentials-save-btn"));
  await waitFor(() => byId("browser-credentials-dialog").open === false, "保存成功后对话框关闭");

  assert.equal(byId("paddle_token").value, "paddle-secret", "隐藏 input 桥接:paddle_token");
  assert.equal(byId("api_key").value, "deepseek-secret", "隐藏 input 桥接:api_key");
  assert.equal(byId("ocr_provider").value, "paddle");

  const credentials = defaultCredentialsStatePort.getCredentials();
  assert.equal(credentials.paddleToken, "paddle-secret");
  assert.equal(credentials.modelApiKey, "deepseek-secret");

  root.unmount();
  services.dispose();
  host.remove();
});

test("CredentialsDialog：保存(桌面模式)——走 saveDesktopConfig 分支", async () => {
  const desktopCalls = [];
  const services = createServices({
    initialDesktopMode: true,
    saveDesktopConfig: async (mineruToken, modelApiKey, afterSave, extra) => {
      desktopCalls.push({ mineruToken, modelApiKey, extra });
      await afterSave?.();
      return { firstRunCompleted: true };
    },
  });
  const { host, root } = await mountHome(services);

  dom.window.document.dispatchEvent(new dom.window.CustomEvent(APP_EVENTS.openBrowserCredentials, {
    detail: { setupMode: true },
  }));
  await waitFor(() => byId("browser-credentials-dialog").open === true, "打开对话框(setupMode)");

  typeInput(byId("browser-paddle-token"), "paddle-desktop");
  typeInput(byId("browser-api-key"), "deepseek-desktop");

  click(byId("browser-credentials-save-btn"));
  await waitFor(() => desktopCalls.length === 1, "saveDesktopConfig 被调用");
  assert.equal(desktopCalls[0].mineruToken, "");
  assert.equal(desktopCalls[0].modelApiKey, "deepseek-desktop");
  assert.equal(desktopCalls[0].extra.paddleToken, "paddle-desktop");
  assert.equal(desktopCalls[0].extra.markConfigured, true, "setupMode 下应标记首次配置完成");
  await waitFor(() => byId("browser-credentials-dialog").open === false, "保存成功后对话框关闭");

  root.unmount();
  services.dispose();
  host.remove();
});

test("CredentialsDialog：隐藏 input 与 credentialsStatePort 单向受控同步(蓝图风险 1)", async () => {
  // 实现调整说明(见 HiddenCredentialInputs.jsx 头注释):隐藏 input 改走
  // 受控渲染(value 直接订阅 credentialsStatePort.store),不是蓝图原计划的
  // "非受控 ref + mirrorCredentialsToHiddenInputs 双向同步"——实测证实那套
  // 组合在任何兄弟组件重渲染时都会被 React 的表单元素受控态回收逻辑悄悄清空
  // (上传进行中 HeroUpload 高频重渲染,会把刚保存的 token 冲掉),受控是唯一
  // 不会被 React 自己吃掉的写法。store 是唯一真值,DOM 是纯投影,因此这里只
  // 断言"store → 隐藏 input"单向同步,并确认"外部直接改 DOM"不会被采纳
  // (证明真值确实是 store,不是可以被绕过的 DOM)。
  const services = createServices();
  const { host, root } = await mountHome(services);

  // composition 初始化时 credentialsStatePort 已经写入过持久化配置;
  // HiddenCredentialInputs 应把当前 store 状态实时投影进隐藏 input。
  defaultCredentialsStatePort.setCredentials({
    ocrProvider: "paddle",
    paddleToken: "from-store",
    modelApiKey: "from-store-key",
  });
  await waitFor(() => byId("paddle_token").value === "from-store", "store → 隐藏 input 投影");
  assert.equal(byId("api_key").value, "from-store-key");

  // 外部直接改 DOM(模拟浏览器自动填充等非受控写入路径)不经过 store,
  // 不会被采纳为"真值"——下一次任意 credentials 变更触发的重渲染都会把
  // DOM 拉回 store 的值,证明 store 才是唯一真值,不存在"DOM 悄悄漂移、
  // 表单提交读到脏值"的风险(这正是蓝图风险 1 要防的静默失败)。
  typeInput(byId("paddle_token"), "from-dom");
  assert.equal(byId("paddle_token").value, "from-dom", "原生 setter 写入本身会生效(没有 onChange 拦截)");
  // 触发一次(哪怕内容不变的)credentials 更新,验证下一次渲染把 DOM 拉回 store
  defaultCredentialsStatePort.patchCredentials({});
  await waitFor(() => byId("paddle_token").value === "from-store", "重渲染后 DOM 被拉回 store 真值,外部写入未被采纳");
  assert.equal(defaultCredentialsStatePort.getCredentials().paddleToken, "from-store", "store 未被 DOM 写入污染");

  root.unmount();
  services.dispose();
  host.remove();
});

test("SettingsHubDialog：词表/更新两个 tab 的占位契约 id", async () => {
  const services = createServices();
  const { host, root } = await mountHome(services);

  click(byId("app-settings-btn"));
  await waitFor(() => byId("app-settings-dialog").open === true, "设置对话框打开");

  const glossaryTab = dom.window.document.querySelector('[data-settings-tab="glossary"]');
  click(glossaryTab);
  await waitFor(() => byId("glossary-btn"), "词表 tab 占位按钮存在");
  assert.equal(dom.window.document.querySelector('[data-settings-panel="glossary"]').hidden, false);

  const updateTab = dom.window.document.querySelector('[data-settings-tab="update"]');
  click(updateTab);
  await waitFor(() => byId("app-update-btn"), "更新 tab 占位按钮存在");
  assert.equal(dom.window.document.querySelector('[data-settings-panel="update"]').hidden, false);

  root.unmount();
  services.dispose();
  host.remove();
});
