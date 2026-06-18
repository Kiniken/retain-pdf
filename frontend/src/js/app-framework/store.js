function freezeSnapshot(value) {
  if (!value || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return Object.freeze(value.map((item) => freezeSnapshot(item)));
  }
  const copy = {};
  for (const [key, item] of Object.entries(value)) {
    copy[key] = freezeSnapshot(item);
  }
  return Object.freeze(copy);
}

function cloneState(value) {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value ?? null));
}

export function createStore({
  name = "store",
  initialState = {},
  actions = {},
} = {}) {
  let state = cloneState(initialState);
  const listeners = new Set();
  let batchDepth = 0;
  let pendingNotification = null;

  function getSnapshot() {
    return freezeSnapshot(cloneState(state));
  }

  function notify(actionName, previousState) {
    const snapshot = getSnapshot();
    for (const listener of listeners) {
      listener(snapshot, {
        action: actionName,
        previousState: freezeSnapshot(cloneState(previousState)),
        store: name,
      });
    }
  }

  function queueNotification(actionName, previousState) {
    if (batchDepth <= 0) {
      notify(actionName, previousState);
      return;
    }
    pendingNotification = {
      action: pendingNotification?.action || actionName,
      previousState: pendingNotification?.previousState || cloneState(previousState),
    };
  }

  function setState(updater, actionName = "setState") {
    const previousState = state;
    const nextState = typeof updater === "function"
      ? updater(cloneState(state))
      : updater;
    if (!nextState || typeof nextState !== "object") {
      throw new TypeError(`Store "${name}" action "${actionName}" must return an object state.`);
    }
    state = cloneState(nextState);
    queueNotification(actionName, previousState);
    return getSnapshot();
  }

  const boundActions = {};
  for (const [actionName, action] of Object.entries(actions || {})) {
    if (typeof action !== "function") {
      continue;
    }
    boundActions[actionName] = (...args) => setState(
      (draft) => action(draft, ...args),
      actionName,
    );
  }

  function subscribe(listener) {
    if (typeof listener !== "function") {
      return () => {};
    }
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function reset(nextState = initialState) {
    return setState(cloneState(nextState), "reset");
  }

  function batch(callback) {
    if (typeof callback !== "function") {
      return getSnapshot();
    }
    batchDepth += 1;
    try {
      return callback({
        actions: boundActions,
        getSnapshot,
        setState,
      });
    } finally {
      batchDepth -= 1;
      if (batchDepth === 0 && pendingNotification) {
        const notification = pendingNotification;
        pendingNotification = null;
        notify(notification.action, notification.previousState);
      }
    }
  }

  return Object.freeze({
    name,
    batch,
    getSnapshot,
    setState,
    subscribe,
    reset,
    actions: Object.freeze(boundActions),
  });
}
