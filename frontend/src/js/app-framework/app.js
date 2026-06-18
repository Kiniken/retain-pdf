import { createCommandBus } from "./commands.js";
import { mountComponent } from "./component.js";

export function createRetainPdfApp({
  stores = {},
  resources = {},
  commands = null,
} = {}) {
  const commandBus = commands || createCommandBus();
  const mountedComponents = new Map();
  let started = false;

  const context = Object.freeze({
    stores,
    resources,
    commands: commandBus,
  });

  function mount(name, component, props = {}) {
    const key = `${name || component?.name || ""}`.trim();
    if (!key) {
      throw new TypeError("Mounted component requires a key.");
    }
    mountedComponents.get(key)?.unmount();
    const instance = mountComponent(component, props, context);
    mountedComponents.set(key, instance);
    return instance;
  }

  function unmount(name) {
    const key = `${name || ""}`.trim();
    const instance = mountedComponents.get(key);
    if (!instance) {
      return;
    }
    instance.unmount();
    mountedComponents.delete(key);
  }

  function start() {
    started = true;
    return context;
  }

  function stop() {
    for (const instance of mountedComponents.values()) {
      instance.unmount();
    }
    mountedComponents.clear();
    commandBus.clear();
    started = false;
  }

  function isStarted() {
    return started;
  }

  return Object.freeze({
    context,
    mount,
    unmount,
    start,
    stop,
    isStarted,
  });
}
