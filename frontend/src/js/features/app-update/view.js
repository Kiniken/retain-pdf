import { APP_VERSION } from "../../generated/app-version.js";
import {
  APP_UPDATE_CLASSES,
  APP_UPDATE_DATASETS,
  APP_UPDATE_IDS,
  APP_UPDATE_SELECTORS,
  APP_UPDATE_STATES,
} from "./contract.js";

function updateButton() {
  return document.getElementById(APP_UPDATE_IDS.button);
}

function updateDialog() {
  return document.getElementById(APP_UPDATE_IDS.dialog);
}

function updateStatus() {
  return document.getElementById(APP_UPDATE_IDS.status);
}

const delegatedUpdateBindings = new WeakMap();

function closestById(target, id) {
  let node = target || null;
  while (node) {
    if (node.id === id) {
      return node;
    }
    if (typeof node.closest === "function") {
      return node.closest(`#${id}`);
    }
    node = node.parentElement || null;
  }
  return null;
}

function setStatusText(text) {
  const status = updateStatus();
  if (!status) {
    return;
  }
  status.classList.toggle(APP_UPDATE_CLASSES.hidden, !text);
  status.textContent = text;
}

function formatReleaseNotes(markdown = "") {
  return `${markdown || ""}`
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line
      .replace(/^#{1,6}\s+/, "")
      .replace(/^\s*[-*]\s+/, "• ")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .trimEnd())
    .filter((line, index, lines) => line || (index > 0 && lines[index - 1]))
    .join("\n")
    .trim();
}

function setPanelContent({ title = "检查更新", body = "", latestVersion = "", currentVersion = APP_VERSION, htmlUrl = "" } = {}) {
  const dialog = updateDialog();
  if (!dialog) {
    return;
  }
  const note = `${body || ""}`.trim();
  dialog.querySelector(APP_UPDATE_SELECTORS.title).textContent = title;
  dialog.querySelector(APP_UPDATE_SELECTORS.version).textContent = latestVersion
    ? `当前 ${currentVersion} · 最新 ${latestVersion}`
    : `当前 ${currentVersion}`;
  dialog.querySelector(APP_UPDATE_SELECTORS.notes).textContent = formatReleaseNotes(note) || "暂无更新说明。";
  const link = dialog.querySelector(APP_UPDATE_SELECTORS.link);
  link.href = htmlUrl || "#";
  link.classList.toggle(APP_UPDATE_CLASSES.hidden, !htmlUrl);
}

export function openUpdateDialog() {
  const dialog = updateDialog();
  if (!dialog) {
    return;
  }
  if (!dialog.open) {
    dialog.showModal();
  }
}

export function setUpdateChecking() {
  const button = updateButton();
  if (!button) {
    return;
  }
  button.dataset[APP_UPDATE_DATASETS.state] = APP_UPDATE_STATES.checking;
  button.setAttribute("title", "正在检查更新");
  setStatusText("正在检查 GitHub Releases...");
  setPanelContent({
    title: "正在检查更新",
    body: "正在连接 GitHub Releases...",
  });
}

export function setUpdateReady() {
  const button = updateButton();
  if (!button) {
    return;
  }
  button.dataset[APP_UPDATE_DATASETS.state] = APP_UPDATE_STATES.idle;
  button.classList.remove(APP_UPDATE_CLASSES.hasUpdate);
  button.setAttribute("title", "检查更新");
  setStatusText("");
  setPanelContent({
    title: "检查更新",
    body: "点击“重新检查”从 GitHub Releases 获取最新版本。",
  });
}

export function setUpdateAvailable(info) {
  const button = updateButton();
  if (!button) {
    return;
  }
  button.dataset[APP_UPDATE_DATASETS.state] = APP_UPDATE_STATES.available;
  button.classList.add(APP_UPDATE_CLASSES.hasUpdate);
  button.setAttribute("title", `发现新版本 ${info.latestVersion}`);
  setStatusText("发现新版本");
  setPanelContent({
    title: info.title || `RetainPDF ${info.latestVersion}`,
    body: info.body,
    latestVersion: info.latestVersion,
    currentVersion: info.currentVersion,
    htmlUrl: info.htmlUrl,
  });
}

export function setUpdateLatest(info) {
  const button = updateButton();
  if (!button) {
    return;
  }
  button.dataset[APP_UPDATE_DATASETS.state] = APP_UPDATE_STATES.latest;
  button.classList.remove(APP_UPDATE_CLASSES.hasUpdate);
  button.setAttribute("title", "已是最新版本");
  setStatusText("已是最新版本");
  setPanelContent({
    title: "已是最新版本",
    body: "当前版本已经是 GitHub Releases 上的最新版本。",
    latestVersion: info?.latestVersion || APP_VERSION,
    currentVersion: info?.currentVersion || APP_VERSION,
    htmlUrl: info?.htmlUrl || "",
  });
}

export function setUpdateError(error) {
  const button = updateButton();
  if (!button) {
    return;
  }
  button.dataset[APP_UPDATE_DATASETS.state] = APP_UPDATE_STATES.error;
  button.classList.remove(APP_UPDATE_CLASSES.hasUpdate);
  button.setAttribute("title", "检查更新失败");
  setStatusText("检查失败");
  setPanelContent({
    title: "检查更新失败",
    body: error?.message || "暂时无法连接 GitHub Releases。",
  });
}

export function bindUpdateButton({ onCheck } = {}) {
  if (typeof document.addEventListener === "function") {
    const existing = delegatedUpdateBindings.get(document);
    if (existing) {
      existing.onCheck = onCheck;
      return;
    }
    const binding = { onCheck };
    delegatedUpdateBindings.set(document, binding);
    document.addEventListener("click", (event) => {
      if (closestById(event.target, APP_UPDATE_IDS.button)) {
        openUpdateDialog();
        return;
      }
      if (closestById(event.target, APP_UPDATE_IDS.checkButton)) {
        binding.onCheck?.();
      }
    });
    return;
  }

  updateButton()?.addEventListener("click", () => openUpdateDialog());
  document.getElementById(APP_UPDATE_IDS.checkButton)?.addEventListener("click", () => onCheck?.());
}
