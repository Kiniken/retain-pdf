import test from "node:test";
import assert from "node:assert/strict";

import {
  bindDynamicPrimaryActions,
} from "../src/js/bootstrap/dynamic-primary-actions.js";
import {
  createDynamicPrimaryActionsPort,
} from "../src/js/bootstrap/dynamic-primary-actions-port.js";
import {
  createDynamicPrimaryActionsReaderPort,
} from "../src/js/bootstrap/dynamic-primary-actions-reader-port.js";
import {
  createDynamicPrimaryActionsTextPort,
} from "../src/js/bootstrap/dynamic-primary-actions-text-port.js";

function nextTick() {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

test("dynamic primary actions route status and reader clicks through injected ports", async () => {
  const calls = [];
  let clickHandler = null;
  const documentRef = {
    addEventListener(eventName, handler) {
      calls.push(["bind", eventName]);
      clickHandler = handler;
    },
  };
  const target = {
    closest(selector) {
      return selector === "#status-detail-btn" ? { id: "status-detail-btn" } : null;
    },
  };

  bindDynamicPrimaryActions({
    documentRef,
    statusDetailFeature: {
      openStatusDetailDialog(tab) {
        calls.push(["detail", tab]);
      },
    },
  });

  clickHandler?.({
    target,
    preventDefault() {
      calls.push(["prevent"]);
    },
  });

  assert.deepEqual(calls, [
    ["bind", "click"],
    ["prevent"],
    ["detail", "overview"],
  ]);

  calls.length = 0;
  bindDynamicPrimaryActions({
    documentRef,
    fetchProtected: async () => "ok",
    openReaderFromButtonFn: async ({ button }) => {
      calls.push(["reader", button.id]);
    },
    setTextFn: (id, text) => calls.push(["text", id, text]),
    state: { job: true },
  });
  clickHandler?.({
    target: {
      closest(selector) {
        return selector === "#reader-btn" ? { id: "reader-btn" } : null;
      },
    },
    preventDefault() {
      calls.push(["prevent"]);
    },
  });
  await nextTick();

  assert.deepEqual(calls, [
    ["bind", "click"],
    ["prevent"],
    ["reader", "reader-btn"],
  ]);
});

test("dynamic primary actions can use a grouped default action port", async () => {
  const calls = [];
  let clickHandler = null;
  const documentRef = {
    addEventListener(eventName, handler) {
      calls.push(["bind", eventName]);
      clickHandler = handler;
    },
  };
  const readerPort = createDynamicPrimaryActionsReaderPort({
    openReaderFromButton: async ({ button, setTextFn }) => {
      calls.push(["reader", button.id]);
      setTextFn("reader-state", "opened");
    },
  });
  const textPort = createDynamicPrimaryActionsTextPort({
    setText: (id, text) => calls.push(["text", id, text]),
  });
  const port = createDynamicPrimaryActionsPort({
    readerPort,
    textPort,
  });

  bindDynamicPrimaryActions({
    documentRef,
    fetchProtected: async () => "ok",
    port,
    state: { job: true },
  });
  assert.equal(port.readerPort, readerPort);
  assert.equal(port.textPort, textPort);
  clickHandler?.({
    target: {
      closest(selector) {
        return selector === "#reader-btn" ? { id: "reader-btn" } : null;
      },
    },
    preventDefault() {
      calls.push(["prevent"]);
    },
  });
  await nextTick();

  assert.deepEqual(calls, [
    ["bind", "click"],
    ["prevent"],
    ["reader", "reader-btn"],
    ["text", "reader-state", "opened"],
  ]);
});
