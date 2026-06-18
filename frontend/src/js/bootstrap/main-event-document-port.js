export function createMainEventDocumentPort(overrides = {}) {
  const {
    CustomEventCtor = typeof CustomEvent === "undefined" ? null : CustomEvent,
    documentRef = typeof document === "undefined" ? null : document,
  } = overrides;

  function dispatchDocumentEvent(eventName, detail) {
    if (!documentRef?.dispatchEvent || !CustomEventCtor) {
      return;
    }
    documentRef.dispatchEvent(new CustomEventCtor(eventName, { detail }));
  }

  function bindDocumentEvent(eventName, handler) {
    documentRef?.addEventListener?.(eventName, handler);
  }

  return Object.freeze({
    bindDocumentEvent,
    dispatchDocumentEvent,
    ...overrides,
  });
}
