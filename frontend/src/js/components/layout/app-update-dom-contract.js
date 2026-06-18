export const APP_UPDATE_IDS = {
  button: "app-update-btn",
  dialog: "app-update-dialog",
  status: "app-update-status",
  checkButton: "app-update-check-btn",
};

export const APP_UPDATE_SELECTORS = {
  title: "[data-update-title]",
  version: "[data-update-version]",
  notes: "[data-update-notes]",
  link: "[data-update-link]",
};

export const APP_UPDATE_DATASETS = {
  state: "updateState",
  title: "updateTitle",
  version: "updateVersion",
  notes: "updateNotes",
  link: "updateLink",
};

export const APP_UPDATE_CLASSES = {
  hidden: "hidden",
  hasUpdate: "has-update",
};

export const APP_UPDATE_STATES = {
  checking: "checking",
  idle: "idle",
  available: "available",
  latest: "latest",
  error: "error",
};

export function appUpdateDataAttribute(datasetKey = "") {
  return `${datasetKey || ""}`.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
}
