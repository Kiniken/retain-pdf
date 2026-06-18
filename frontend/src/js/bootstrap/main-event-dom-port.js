import { $ } from "../dom/query.js";

export function createMainEventDomPort(overrides = {}) {
  const {
    byId = $,
  } = overrides;

  function bindElementEvent(id, eventName, handler) {
    byId(id)?.addEventListener(eventName, handler);
  }

  return Object.freeze({
    bindElementEvent,
    ...overrides,
  });
}
