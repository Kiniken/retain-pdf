export function createReaderSideDrawers({
  documentRef = globalThis.document,
  onActiveChanged = null,
} = {}) {
  const drawers = {
    favorites: {
      drawer: documentRef?.getElementById?.("reader-favorites-drawer"),
      toggle: documentRef?.getElementById?.("reader-favorites-toggle-btn"),
      close: documentRef?.getElementById?.("reader-favorites-close-btn"),
    },
  };
  let active = "";

  function sync() {
    Object.entries(drawers).forEach(([key, entry]) => {
      const open = active === key;
      entry.drawer?.classList.toggle("is-open", open);
      if (entry.drawer) {
        entry.drawer.inert = key === "favorites" ? false : !open;
      }
      entry.toggle?.setAttribute("aria-expanded", open ? "true" : "false");
      entry.toggle?.classList.toggle("is-active", open);
    });
    onActiveChanged?.(active);
  }

  function open(name) {
    active = name;
    sync();
    return active;
  }

  function toggle(name) {
    active = active === name ? "" : name;
    sync();
    return active;
  }

  function close(name = "") {
    if (!name || active === name) {
      active = "";
    }
    sync();
    return active;
  }

  function bindEvents() {
    drawers.favorites.toggle?.addEventListener?.("click", () => toggle("favorites"));
    drawers.favorites.close?.addEventListener("click", () => close("favorites"));
    sync();
  }

  return {
    active: () => active,
    bindEvents,
    close,
    open,
    toggle,
  };
}
