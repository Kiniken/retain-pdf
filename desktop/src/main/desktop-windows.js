const fs = require("fs");
const path = require("path");
const { BrowserWindow, Menu, Tray, dialog, shell } = require("electron");

function createDesktopWindows(app, options = {}) {
  const appRoot = options.appRoot || process.cwd();
  const loadDesktopConfig = options.loadDesktopConfig;
  const saveDesktopConfig = options.saveDesktopConfig;
  const logDesktop = options.logDesktop || console.log;
  const logDesktopError = options.logDesktopError || console.error;
  const updateSplashProgress = options.updateSplashProgress || (() => {});
  const isQuitting = typeof options.isQuitting === "function" ? options.isQuitting : () => false;
  const markQuitting = typeof options.markQuitting === "function" ? options.markQuitting : () => {};
  let mainWindow = null;
  let tray = null;
  let closeToTrayHintShown = false;

  function resolveWindowIcon() {
    return path.join(appRoot, "assets", "RetainPDF-logo.png");
  }

  function showMainWindow() {
    if (!mainWindow || mainWindow.isDestroyed()) {
      return;
    }
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.show();
    mainWindow.focus();
  }

  function hideMainWindowToTray() {
    if (!mainWindow || mainWindow.isDestroyed()) {
      return;
    }
    mainWindow.hide();
    maybeShowCloseToTrayHint();
  }

  function persistCloseToTrayHintShown() {
    if (typeof loadDesktopConfig !== "function" || typeof saveDesktopConfig !== "function") {
      closeToTrayHintShown = true;
      return;
    }
    const current = loadDesktopConfig();
    saveDesktopConfig({
      ...current,
      closeToTrayHintShown: true,
    });
    closeToTrayHintShown = true;
  }

  function maybeShowCloseToTrayHint() {
    if (closeToTrayHintShown || !tray) {
      return;
    }
    if (process.platform === "win32" && typeof tray.displayBalloon === "function") {
      tray.displayBalloon({
        iconType: "info",
        title: "RetainPDF 正在后台运行",
        content: "窗口已隐藏到系统托盘，本地 API 仍可继续使用。右键托盘图标可退出。",
      });
    }
    persistCloseToTrayHintShown();
  }

  function createTray() {
    if (tray) {
      return tray;
    }
    tray = new Tray(resolveWindowIcon());
    tray.setToolTip("RetainPDF");
    tray.setContextMenu(
      Menu.buildFromTemplate([
        {
          label: "显示主窗口",
          click: () => {
            showMainWindow();
          },
        },
        {
          label: "退出",
          click: () => {
            markQuitting();
            app.quit();
          },
        },
      ]),
    );
    tray.on("click", () => {
      if (mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible()) {
        hideMainWindowToTray();
        return;
      }
      showMainWindow();
    });
    tray.on("double-click", () => {
      showMainWindow();
    });
    return tray;
  }

  function createWindow() {
    const frontendRoot = resolveFrontendRoot();
    logDesktop(`[desktop] creating main window frontendRoot=${frontendRoot}`);

    mainWindow = new BrowserWindow({
      width: 1480,
      height: 960,
      minWidth: 1200,
      minHeight: 760,
      autoHideMenuBar: true,
      show: false,
      icon: resolveWindowIcon(),
      webPreferences: {
        preload: path.join(appRoot, "preload.js"),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
    });

    const indexPath = path.join(frontendRoot, "index.html");
    logDesktop(`[desktop] loading frontend index=${indexPath}`);
    mainWindow.loadFile(indexPath);

    mainWindow.on("close", (event) => {
      if (isQuitting()) {
        return;
      }
      event.preventDefault();
      hideMainWindowToTray();
    });

    mainWindow.webContents.on("console-message", (_event, level, message, line, sourceId) => {
      logDesktop(`[desktop][renderer][level=${level}] ${sourceId || "unknown"}:${line || 0} ${message || ""}`);
    });

    mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
      const detail = `code=${errorCode} url=${validatedURL || "unknown"} error=${errorDescription || "unknown"}`;
      logDesktopError(`[desktop] renderer load failed: ${detail}`);
      dialog.showErrorBox("RetainPDF 页面加载失败", detail);
    });

    mainWindow.webContents.on("render-process-gone", (_event, details) => {
      const detail = `reason=${details?.reason || "unknown"} exitCode=${details?.exitCode ?? "unknown"}`;
      logDesktopError(`[desktop] renderer process gone: ${detail}`);
      dialog.showErrorBox("RetainPDF 渲染进程异常退出", detail);
    });

    mainWindow.webContents.once("did-finish-load", () => {
      logDesktop("[desktop] frontend loaded; showing main window");
      updateSplashProgress(100, "准备完成", "正在进入主界面");
      mainWindow.show();
      if (typeof options.closeSplashWindow === "function") {
        options.closeSplashWindow();
      }
    });

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: "deny" };
    });
  }

  function showExistingDesktopWindow(splashWindow) {
    if (mainWindow && !mainWindow.isDestroyed()) {
      showMainWindow();
      return true;
    }
    if (splashWindow && !splashWindow.isDestroyed()) {
      if (splashWindow.isMinimized()) {
        splashWindow.restore();
      }
      splashWindow.show();
      splashWindow.focus();
      return true;
    }
    return false;
  }

  function hasLiveMainWindow() {
    return !!mainWindow && !mainWindow.isDestroyed();
  }

  function setCloseToTrayHintShown(value) {
    closeToTrayHintShown = !!value;
  }

  function resolveFrontendRoot() {
    const generatedFrontendRoot = path.join(appRoot, "app", "frontend");
    if (app.isPackaged) {
      return generatedFrontendRoot;
    }
    if (fs.existsSync(path.join(generatedFrontendRoot, "index.html"))) {
      return generatedFrontendRoot;
    }
    const sourceFrontendRoot = path.resolve(appRoot, "..", "frontend");
    if (fs.existsSync(path.join(sourceFrontendRoot, "index.html"))) {
      return sourceFrontendRoot;
    }
    return generatedFrontendRoot;
  }

  return {
    createTray,
    createWindow,
    hasLiveMainWindow,
    resolveWindowIcon,
    setCloseToTrayHintShown,
    showExistingDesktopWindow,
    showMainWindow,
  };
}

module.exports = {
  createDesktopWindows,
};
