// AppUpdateBanner 的纯视图态 + 与 features/app-update/controller.js(kept
// 控制器)对接的 store 驱动 viewPort(蓝图 §5,镜像
// credentials-view-store.js/glossaries-store.js 的写法)。
//
// 旧世界 update-view-port.js/view.js 全部是 DOM 直写(死,不 import);这里用
// 同名方法签名(bindButton/setChecking/setReady/setAvailable/setLatest/
// setError)重新实现,只是"写"的目的地从 DOM 换成 store。逐字段行为抄自
// src/js/features/app-update/view.js:88-166(setUpdateChecking/setUpdateReady/
// setUpdateAvailable/setUpdateLatest/setUpdateError),controller.js
// (checkForUpdates 编排 + 24h 缓存)一行不改地复用。

import { createStore } from "../../../../js/app-framework/store.js";
import { APP_VERSION } from "../../../../js/features/app-update/current-version.js";
import { APP_UPDATE_STATES } from "./app-update-contract.js";

function panelOf({
  title = "检查更新",
  body = "",
  latestVersion = "",
  currentVersion = APP_VERSION,
  htmlUrl = "",
} = {}) {
  return { title, body, latestVersion, currentVersion, htmlUrl };
}

export function createAppUpdateViewFeature() {
  const store = createStore({
    name: "appUpdateView",
    initialState: {
      buttonState: APP_UPDATE_STATES.idle,
      hasUpdate: false,
      buttonTitle: "检查更新",
      statusText: "",
      panel: panelOf({
        title: "检查更新",
        body: "点击“重新检查”从 GitHub Releases 获取最新版本。",
      }),
    },
    actions: {
      apply(_currentState, nextState) {
        return nextState;
      },
    },
  });

  const handlersRef = { current: null };

  const viewPort = {
    bindButton: (handlers) => {
      handlersRef.current = handlers;
    },
    // 抄自 view.js:88-100(setUpdateChecking)
    setChecking: () => store.actions.apply({
      buttonState: APP_UPDATE_STATES.checking,
      hasUpdate: store.getSnapshot().hasUpdate,
      buttonTitle: "正在检查更新",
      statusText: "正在检查 GitHub Releases...",
      panel: panelOf({
        title: "正在检查更新",
        body: "正在连接 GitHub Releases...",
      }),
    }),
    // 抄自 view.js:102-115(setUpdateReady)
    setReady: () => store.actions.apply({
      buttonState: APP_UPDATE_STATES.idle,
      hasUpdate: false,
      buttonTitle: "检查更新",
      statusText: "",
      panel: panelOf({
        title: "检查更新",
        body: "点击“重新检查”从 GitHub Releases 获取最新版本。",
      }),
    }),
    // 抄自 view.js:117-133(setUpdateAvailable)
    setAvailable: (info = {}) => store.actions.apply({
      buttonState: APP_UPDATE_STATES.available,
      hasUpdate: true,
      buttonTitle: `发现新版本 ${info.latestVersion}`,
      statusText: "发现新版本",
      panel: panelOf({
        title: info.title || `RetainPDF ${info.latestVersion}`,
        body: info.body,
        latestVersion: info.latestVersion,
        currentVersion: info.currentVersion,
        htmlUrl: info.htmlUrl,
      }),
    }),
    // 抄自 view.js:135-151(setUpdateLatest)
    setLatest: (info) => store.actions.apply({
      buttonState: APP_UPDATE_STATES.latest,
      hasUpdate: false,
      buttonTitle: "已是最新版本",
      statusText: "已是最新版本",
      panel: panelOf({
        title: "已是最新版本",
        body: "当前版本已经是 GitHub Releases 上的最新版本。",
        latestVersion: info?.latestVersion || APP_VERSION,
        currentVersion: info?.currentVersion || APP_VERSION,
        htmlUrl: info?.htmlUrl || "",
      }),
    }),
    // 抄自 view.js:153-166(setUpdateError)
    setError: (error) => store.actions.apply({
      buttonState: APP_UPDATE_STATES.error,
      hasUpdate: false,
      buttonTitle: "检查更新失败",
      statusText: "检查失败",
      panel: panelOf({
        title: "检查更新失败",
        body: error?.message || "暂时无法连接 GitHub Releases。",
      }),
    }),
  };

  return {
    store,
    viewPort,
    handlersRef,
  };
}
