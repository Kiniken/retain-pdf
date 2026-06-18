import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { isNewerVersion } from "../src/js/features/app-update/github-release.js";
import {
  createUpdateCachePort,
  readUpdateCache,
  writeUpdateCache,
} from "../src/js/features/app-update/state.js";
import {
  APP_UPDATE_CLASSES,
  APP_UPDATE_DATASETS,
  APP_UPDATE_IDS,
  APP_UPDATE_SELECTORS,
  APP_UPDATE_STATES,
  appUpdateDataAttribute,
} from "../src/js/features/app-update/contract.js";
import {
  bindUpdateButton,
  setUpdateAvailable,
  setUpdateChecking,
  setUpdateError,
  setUpdateLatest,
  setUpdateReady,
} from "../src/js/features/app-update/view.js";
import { mountAppUpdateFeature } from "../src/js/features/app-update/controller.js";
import { createAppUpdateViewPort } from "../src/js/features/app-update/update-view-port.js";
import { createCoreAppUpdateRuntimePort } from "../src/js/bootstrap/core-app-update-runtime-port.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendRoot = path.resolve(__dirname, "..");
const generatedVersionPath = path.join(frontendRoot, "src/js/generated/app-version.js");

function createMemoryStorage() {
  const store = new Map();
  return {
    getItem: (key) => store.get(key) || null,
    setItem: (key, value) => store.set(key, value),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  };
}

function createClassList(initial = []) {
  const classes = new Set(initial);
  return {
    add: (...names) => names.forEach((name) => classes.add(name)),
    remove: (...names) => names.forEach((name) => classes.delete(name)),
    toggle(name, force) {
      if (force) {
        classes.add(name);
      } else {
        classes.delete(name);
      }
    },
    contains: (name) => classes.has(name),
  };
}

function createElement({ id = "", dataset = {}, classes = [] } = {}) {
  const listeners = new Map();
  return {
    id,
    dataset: { ...dataset },
    classList: createClassList(classes),
    textContent: "",
    href: "",
    open: false,
    attributes: new Map(),
    children: [],
    parentElement: null,
    setAttribute(name, value) {
      this.attributes.set(name, value);
    },
    getAttribute(name) {
      return this.attributes.get(name) || "";
    },
    addEventListener(type, handler) {
      listeners.set(type, handler);
    },
    click() {
      listeners.get("click")?.({ currentTarget: this, target: this });
    },
    showModal() {
      this.open = true;
    },
    querySelector(selector) {
      return this.children.find((child) => child.selector === selector) || null;
    },
  };
}

function withUpdateDom(fn) {
  const previousDocument = globalThis.document;
  const button = createElement({
    id: APP_UPDATE_IDS.button,
    dataset: { [APP_UPDATE_DATASETS.state]: APP_UPDATE_STATES.idle },
  });
  const status = createElement({ id: APP_UPDATE_IDS.status, classes: [APP_UPDATE_CLASSES.hidden] });
  const checkButton = createElement({ id: APP_UPDATE_IDS.checkButton });
  const dialog = createElement({ id: APP_UPDATE_IDS.dialog });
  const title = createElement();
  const version = createElement();
  const notes = createElement();
  const link = createElement({ classes: [APP_UPDATE_CLASSES.hidden] });
  title.selector = APP_UPDATE_SELECTORS.title;
  version.selector = APP_UPDATE_SELECTORS.version;
  notes.selector = APP_UPDATE_SELECTORS.notes;
  link.selector = APP_UPDATE_SELECTORS.link;
  dialog.children = [title, version, notes, link];
  const elements = new Map([
    [APP_UPDATE_IDS.button, button],
    [APP_UPDATE_IDS.dialog, dialog],
    [APP_UPDATE_IDS.status, status],
    [APP_UPDATE_IDS.checkButton, checkButton],
  ]);
  globalThis.document = {
    getElementById: (id) => elements.get(id) || null,
  };

  try {
    return fn({ button, status, checkButton, dialog, title, version, notes, link });
  } finally {
    globalThis.document = previousDocument;
  }
}

test("isNewerVersion compares beta suffix numbers instead of only major version", () => {
  assert.equal(isNewerVersion("v4.1.6-beta2", "4.1.6-beta1"), true);
  assert.equal(isNewerVersion("v4.1.6-beta1", "4.1.6-beta2"), false);
  assert.equal(isNewerVersion("v4.1.6-beta10", "4.1.6-beta1"), true);
  assert.equal(isNewerVersion("v4.1.6-beta1", "4.1.6-beta10"), false);
  assert.equal(isNewerVersion("v4.1.7", "4.1.6-beta9"), true);
});

test("isNewerVersion treats stable releases as newer than prereleases", () => {
  assert.equal(isNewerVersion("v4.1.6", "4.1.6-beta10"), true);
  assert.equal(isNewerVersion("v4.1.6-beta10", "4.1.6"), false);
});

test("isNewerVersion ignores unsupported prerelease labels", () => {
  assert.equal(isNewerVersion("v4.1.6-preview1", "4.1.6-beta10"), false);
  assert.equal(isNewerVersion("v4.1.6-beta10", "4.1.6-preview1"), false);
});

test("update cache reports freshness using 24 hour ttl", () => {
  let now = 1000;
  const cache = createUpdateCachePort({
    storage: createMemoryStorage(),
    now: () => now,
  });

  cache.write({
    currentVersion: "4.1.6-beta1",
    latestVersion: "4.1.6-beta2",
    hasUpdate: true,
    htmlUrl: "https://github.com/wxyhgk/retain-pdf/releases/tag/v4.1.6-beta2",
  });

  now = 1000 + 23 * 60 * 60 * 1000;
  const fresh = cache.read();
  assert.equal(fresh.fresh, true);
  assert.equal(fresh.info.hasUpdate, true);

  now = 1000 + 25 * 60 * 60 * 1000;
  const stale = cache.read();
  assert.equal(stale.fresh, false);
  assert.equal(stale.info.latestVersion, "4.1.6-beta2");
});

test("update cache treats future timestamps as stale", () => {
  let now = 2000;
  const cache = createUpdateCachePort({
    storage: createMemoryStorage(),
    now: () => now,
  });

  cache.write({
    currentVersion: "4.1.6-beta1",
    latestVersion: "4.1.6-beta2",
    hasUpdate: true,
  });

  now = 1000;
  const cached = cache.read();

  assert.equal(cached.fresh, false);
  assert.equal(cached.info.latestVersion, "4.1.6-beta2");
});

test("update cache tolerates missing or failing storage", () => {
  const missing = createUpdateCachePort({
    storage: null,
    now: () => 1000,
  });
  assert.deepEqual(missing.read(), { info: null, fresh: false });
  missing.write({ latestVersion: "4.1.6-beta2", hasUpdate: true });

  const failing = createUpdateCachePort({
    storage: {
      getItem() {
        throw new Error("read failed");
      },
      setItem() {
        throw new Error("write failed");
      },
    },
    now: () => 1000,
  });
  assert.deepEqual(failing.read(), { info: null, fresh: false });
  failing.write({ latestVersion: "4.1.6-beta2", hasUpdate: true });
});

test("legacy update cache helpers use the default browser storage", () => {
  const previousWindow = globalThis.window;
  globalThis.window = {
    localStorage: createMemoryStorage(),
  };
  try {
    writeUpdateCache({
      currentVersion: "4.1.6-beta1",
      latestVersion: "4.1.6-beta2",
      hasUpdate: true,
    }, 1000);

    const cached = readUpdateCache(1200);
    assert.equal(cached.fresh, true);
    assert.equal(cached.info.latestVersion, "4.1.6-beta2");
  } finally {
    globalThis.window = previousWindow;
  }
});

test("generate-app-version uses release version override", () => {
  const before = fs.readFileSync(generatedVersionPath, "utf8");
  try {
    execFileSync(process.execPath, ["./scripts/generate-app-version.mjs"], {
      cwd: frontendRoot,
      env: {
        ...process.env,
        RETAIN_PDF_VERSION: "9.8.7-beta10",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    const generated = fs.readFileSync(generatedVersionPath, "utf8");

    assert.match(generated, /export const APP_VERSION = "9\.8\.7-beta10";/);
  } finally {
    fs.writeFileSync(generatedVersionPath, before, "utf8");
  }
});

test("generate-app-version uses GitHub tag version before package version", () => {
  const before = fs.readFileSync(generatedVersionPath, "utf8");
  try {
    execFileSync(process.execPath, ["./scripts/generate-app-version.mjs"], {
      cwd: frontendRoot,
      env: {
        ...process.env,
        RETAIN_PDF_VERSION: "",
        GITHUB_REF_TYPE: "tag",
        GITHUB_REF_NAME: "v8.7.6-beta3",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    const generated = fs.readFileSync(generatedVersionPath, "utf8");

    assert.match(generated, /export const APP_VERSION = "8\.7\.6-beta3";/);
  } finally {
    fs.writeFileSync(generatedVersionPath, before, "utf8");
  }
});

test("generate-app-version does not fall back to package or local version files", () => {
  const before = fs.readFileSync(generatedVersionPath, "utf8");
  try {
    execFileSync(process.execPath, ["./scripts/generate-app-version.mjs"], {
      cwd: frontendRoot,
      env: {
        ...process.env,
        RETAIN_PDF_VERSION: "",
        GITHUB_REF_TYPE: "",
        GITHUB_REF_NAME: "",
        PATH: "",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    const generated = fs.readFileSync(generatedVersionPath, "utf8");

    assert.match(generated, /export const APP_VERSION = "0\.0\.0\+unknown";/);
  } finally {
    fs.writeFileSync(generatedVersionPath, before, "utf8");
  }
});

test("app update contract exposes shared ids and dataset attributes", () => {
  assert.equal(APP_UPDATE_IDS.button, "app-update-btn");
  assert.equal(APP_UPDATE_IDS.checkButton, "app-update-check-btn");
  assert.equal(APP_UPDATE_SELECTORS.title, "[data-update-title]");
  assert.equal(appUpdateDataAttribute(APP_UPDATE_DATASETS.state), "update-state");
});

test("app update view uses contract states and panel selectors", () => {
  withUpdateDom(({ button, status, title, version, notes, link }) => {
    setUpdateChecking();
    assert.equal(button.dataset[APP_UPDATE_DATASETS.state], APP_UPDATE_STATES.checking);
    assert.equal(button.getAttribute("title"), "正在检查更新");
    assert.equal(status.classList.contains(APP_UPDATE_CLASSES.hidden), false);
    assert.equal(title.textContent, "正在检查更新");

    setUpdateAvailable({
      title: "RetainPDF 4.2",
      body: "## 新版本\n- 修复状态显示",
      currentVersion: "4.1",
      latestVersion: "4.2",
      htmlUrl: "https://github.com/wxyhgk/retain-pdf/releases/tag/v4.2",
    });
    assert.equal(button.dataset[APP_UPDATE_DATASETS.state], APP_UPDATE_STATES.available);
    assert.equal(button.classList.contains(APP_UPDATE_CLASSES.hasUpdate), true);
    assert.equal(version.textContent, "当前 4.1 · 最新 4.2");
    assert.equal(notes.textContent, "新版本\n• 修复状态显示");
    assert.equal(link.classList.contains(APP_UPDATE_CLASSES.hidden), false);

    setUpdateLatest({ currentVersion: "4.2", latestVersion: "4.2" });
    assert.equal(button.dataset[APP_UPDATE_DATASETS.state], APP_UPDATE_STATES.latest);
    assert.equal(button.classList.contains(APP_UPDATE_CLASSES.hasUpdate), false);

    setUpdateError(new Error("network down"));
    assert.equal(button.dataset[APP_UPDATE_DATASETS.state], APP_UPDATE_STATES.error);
    assert.equal(notes.textContent, "network down");

    setUpdateReady();
    assert.equal(button.dataset[APP_UPDATE_DATASETS.state], APP_UPDATE_STATES.idle);
    assert.equal(status.classList.contains(APP_UPDATE_CLASSES.hidden), true);
  });
});

test("app update view opens dialog and binds manual check button", () => {
  withUpdateDom(({ button, checkButton, dialog }) => {
    let checks = 0;
    bindUpdateButton({ onCheck: () => { checks += 1; } });

    button.click();
    assert.equal(dialog.open, true);

    checkButton.click();
    assert.equal(checks, 1);
  });
});

test("app update manual check still works when dialog button is rendered after binding", () => {
  const previousDocument = globalThis.document;
  const listeners = new Map();
  const button = createElement({
    id: APP_UPDATE_IDS.button,
    dataset: { [APP_UPDATE_DATASETS.state]: APP_UPDATE_STATES.idle },
  });
  const dialog = createElement({ id: APP_UPDATE_IDS.dialog });
  const elements = new Map([
    [APP_UPDATE_IDS.button, button],
    [APP_UPDATE_IDS.dialog, dialog],
  ]);
  globalThis.document = {
    addEventListener(type, handler) {
      listeners.set(type, handler);
    },
    getElementById: (id) => elements.get(id) || null,
  };

  try {
    let checks = 0;
    bindUpdateButton({ onCheck: () => { checks += 1; } });
    const checkButton = createElement({ id: APP_UPDATE_IDS.checkButton });
    elements.set(APP_UPDATE_IDS.checkButton, checkButton);

    listeners.get("click")?.({ target: button });
    assert.equal(dialog.open, true);

    listeners.get("click")?.({ target: checkButton });
    assert.equal(checks, 1);
  } finally {
    globalThis.document = previousDocument;
  }
});

test("app update view port owns update button and status rendering methods", () => {
  const calls = [];
  const port = createAppUpdateViewPort({
    bindButton: ({ onCheck }) => calls.push(["bind", typeof onCheck]),
    setAvailable: (info) => calls.push(["available", info.latestVersion]),
    setChecking: () => calls.push(["checking"]),
    setError: (error) => calls.push(["error", error.message]),
    setLatest: (info) => calls.push(["latest", info.latestVersion]),
    setReady: () => calls.push(["ready"]),
  });

  port.bindButton({ onCheck() {} });
  port.setReady();
  port.setAvailable({ latestVersion: "4.2" });
  port.setLatest({ latestVersion: "4.1" });
  port.setChecking();
  port.setError(new Error("network"));

  assert.deepEqual(calls, [
    ["bind", "function"],
    ["ready"],
    ["available", "4.2"],
    ["latest", "4.1"],
    ["checking"],
    ["error", "network"],
  ]);
});

test("app update controller routes cached and manual states through view port", async () => {
  const previousWindow = globalThis.window;
  const calls = [];
  let onCheck = null;
  globalThis.window = {
    setTimeout(callback, delay) {
      calls.push(["timeout", delay]);
      return 1;
    },
  };
  const feature = mountAppUpdateFeature({
    cachePort: {
      read: () => ({
        fresh: true,
        info: {
          hasUpdate: true,
          latestVersion: "4.2.0",
        },
      }),
      write: (info) => calls.push(["write", info.latestVersion]),
    },
    fetchLatestRelease: async () => ({ tag_name: "v4.3.0" }),
    normalizeRelease: (release) => ({
      hasUpdate: false,
      latestVersion: release.tag_name,
    }),
    viewPort: createAppUpdateViewPort({
      bindButton: (payload) => {
        calls.push(["bind"]);
        onCheck = payload.onCheck;
      },
      setAvailable: (info) => calls.push(["available", info.latestVersion]),
      setChecking: () => calls.push(["checking"]),
      setError: (error) => calls.push(["error", error.message]),
      setLatest: (info) => calls.push(["latest", info.latestVersion]),
      setReady: () => calls.push(["ready"]),
    }),
  });

  try {
    assert.equal(typeof onCheck, "function");
    await feature.checkForUpdates({ manual: true });
    onCheck();
    await new Promise((resolve) => setImmediate(resolve));

    assert.equal(calls[0][0], "bind");
    assert.deepEqual(calls.slice(1, 3), [
      ["available", "4.2.0"],
      ["checking"],
    ]);
    assert.equal(calls.some((call) => call[0] === "write" && call[1] === "v4.3.0"), true);
    assert.equal(calls.some((call) => call[0] === "latest" && call[1] === "v4.3.0"), true);
    assert.equal(calls.some((call) => call[0] === "timeout"), false);
    assert.equal(calls.some((call) => call[0] === "error"), false);
  } finally {
    globalThis.window = previousWindow;
  }
});

test("app update controller can be disabled for web runtimes", async () => {
  const previousWindow = globalThis.window;
  const calls = [];
  globalThis.window = {
    setTimeout(callback, delay) {
      calls.push(["timeout", delay]);
      return 1;
    },
  };
  const feature = mountAppUpdateFeature({
    enabled: false,
    cachePort: {
      read: () => {
        calls.push(["read"]);
        return { fresh: false, info: null };
      },
      write: (info) => calls.push(["write", info.latestVersion]),
    },
    fetchLatestRelease: async () => {
      calls.push(["fetch"]);
      return { tag_name: "v9.9.9" };
    },
    viewPort: createAppUpdateViewPort({
      bindButton: (payload) => calls.push(["bind", typeof payload.onCheck]),
      setAvailable: (info) => calls.push(["available", info.latestVersion]),
      setChecking: () => calls.push(["checking"]),
      setError: (error) => calls.push(["error", error.message]),
      setLatest: (info) => calls.push(["latest", info.latestVersion]),
      setReady: () => calls.push(["ready"]),
    }),
  });

  try {
    assert.equal(await feature.checkForUpdates({ manual: true }), false);
    assert.deepEqual(calls, [
      ["bind", "function"],
      ["ready"],
    ]);
  } finally {
    globalThis.window = previousWindow;
  }
});

test("app update runtime port enables static web update checks", () => {
  const port = createCoreAppUpdateRuntimePort();

  assert.equal(port.isAppUpdateEnabled(), true);
});
