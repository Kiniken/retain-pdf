import test from "node:test";
import assert from "node:assert/strict";

import {
  createRetainPdfApp,
} from "../src/js/app-framework/app.js";
import {
  createCommandBus,
} from "../src/js/app-framework/commands.js";
import {
  defineComponent,
} from "../src/js/app-framework/component.js";
import {
  defineConnectedComponent,
} from "../src/js/app-framework/connector.js";
import {
  createPageRuntime,
} from "../src/js/app-framework/page-runtime.js";
import {
  createResource,
} from "../src/js/app-framework/resource.js";
import {
  createSelector,
} from "../src/js/app-framework/selector.js";
import {
  createStore,
} from "../src/js/app-framework/store.js";

test("createStore owns immutable snapshots and action updates", () => {
  const store = createStore({
    name: "library",
    initialState: {
      items: [],
      selectedId: "",
    },
    actions: {
      addBook(state, book) {
        state.items.push(book);
        return state;
      },
      selectBook(state, jobId) {
        return {
          ...state,
          selectedId: jobId,
        };
      },
    },
  });

  const events = [];
  const unsubscribe = store.subscribe((snapshot, meta) => {
    events.push({ snapshot, meta });
  });

  store.actions.addBook({ jobId: "job-1" });
  store.actions.selectBook("job-1");
  unsubscribe();
  store.actions.addBook({ jobId: "job-2" });

  assert.deepEqual(store.getSnapshot(), {
    items: [{ jobId: "job-1" }, { jobId: "job-2" }],
    selectedId: "job-1",
  });
  assert.equal(events.length, 2);
  assert.equal(events[0].meta.action, "addBook");
  assert.equal(events[0].meta.store, "library");
  assert.throws(() => {
    events[0].snapshot.items = [];
  }, TypeError);
});

test("createStore batches multiple updates into one subscriber notification", () => {
  const store = createStore({
    name: "status",
    initialState: {
      stage: "ocr",
      percent: 0,
    },
    actions: {
      setStage(state, stage) {
        return {
          ...state,
          stage,
        };
      },
      setPercent(state, percent) {
        return {
          ...state,
          percent,
        };
      },
    },
  });
  const events = [];
  store.subscribe((snapshot, meta) => {
    events.push({ snapshot, meta });
  });

  const result = store.batch(({ actions }) => {
    actions.setStage("translation");
    actions.setPercent(75);
    return "done";
  });

  assert.equal(result, "done");
  assert.deepEqual(store.getSnapshot(), {
    stage: "translation",
    percent: 75,
  });
  assert.equal(events.length, 1);
  assert.equal(events[0].meta.action, "setStage");
  assert.deepEqual(events[0].meta.previousState, {
    stage: "ocr",
    percent: 0,
  });
});

test("createCommandBus dispatches commands and can isolate handler errors", async () => {
  const errors = [];
  const commands = createCommandBus({
    onError: (error, meta) => errors.push({ error, meta }),
  });
  const calls = [];
  commands.on("reader:open", async (payload, meta) => {
    calls.push({ payload, meta });
    return payload.jobId;
  });
  commands.on("reader:open", () => {
    throw new Error("boom");
  });

  const results = await commands.dispatch("reader:open", { jobId: "job-1" });

  assert.deepEqual(results, ["job-1"]);
  assert.equal(calls[0].meta.command, "reader:open");
  assert.equal(errors.length, 1);
  assert.equal(errors[0].meta.command, "reader:open");
});

test("createResource owns loading success error and stale request guards", async () => {
  let releaseFirst;
  const firstLoad = new Promise((resolve) => {
    releaseFirst = () => resolve({ value: "first" });
  });
  const loads = [];
  const resource = createResource({
    name: "jobDetail",
    loader: async ({ jobId }) => {
      loads.push(jobId);
      if (jobId === "slow") {
        return firstLoad;
      }
      return { value: jobId };
    },
    cacheKey: ({ jobId }) => jobId,
  });

  const slowPromise = resource.load({ jobId: "slow" });
  const fastSnapshot = await resource.load({ jobId: "fast" });
  releaseFirst();
  await slowPromise;

  assert.equal(fastSnapshot.status, "success");
  assert.deepEqual(resource.getSnapshot().data, { value: "fast" });

  await resource.load({ jobId: "fast" });
  assert.deepEqual(loads, ["slow", "fast"]);

  resource.invalidate({ jobId: "fast" });
  await resource.load({ jobId: "fast" });
  assert.deepEqual(loads, ["slow", "fast", "fast"]);
});

test("createResource records loader errors without throwing by default", async () => {
  const resource = createResource({
    name: "failing",
    loader: async () => {
      throw new Error("network failed");
    },
  });

  const snapshot = await resource.load();

  assert.equal(snapshot.status, "error");
  assert.equal(snapshot.error.message, "network failed");
});

test("createRetainPdfApp mounts components with shared app context", async () => {
  const store = createStore({
    name: "job",
    initialState: { opened: "" },
    actions: {
      open(state, jobId) {
        return { ...state, opened: jobId };
      },
    },
  });
  const calls = [];
  const component = defineComponent({
    name: "reader",
    mount(props, context) {
      calls.push(["mount", props.jobId, Boolean(context.stores.job)]);
      return {
        update(nextProps) {
          calls.push(["update", nextProps.jobId]);
        },
        unmount() {
          calls.push(["unmount"]);
        },
      };
    },
  });
  const app = createRetainPdfApp({
    stores: { job: store },
  });

  app.start();
  const instance = app.mount("reader", component, { jobId: "job-1" });
  instance.update({ jobId: "job-2" });
  app.context.commands.on("job:open", ({ jobId }) => {
    app.context.stores.job.actions.open(jobId);
  });
  await app.context.commands.dispatch("job:open", { jobId: "job-3" });
  app.stop();

  assert.equal(app.isStarted(), false);
  assert.deepEqual(store.getSnapshot(), { opened: "job-3" });
  assert.deepEqual(calls, [
    ["mount", "job-1", true],
    ["update", "job-2"],
    ["unmount"],
  ]);
});

test("createPageRuntime owns page startup errors and cleanup callbacks", async () => {
  const events = [];
  const runtime = createPageRuntime({
    onError(error) {
      events.push(["error", error.message]);
    },
    onStop() {
      events.push(["stopped"]);
    },
  });

  runtime.onCleanup(() => {
    events.push(["cleanup-a"]);
  });
  runtime.onCleanup(() => {
    events.push(["cleanup-b"]);
  });

  await runtime.start(() => {
    events.push(["start"]);
    throw new Error("startup failed");
  });

  assert.equal(runtime.isStarted(), true);
  runtime.stop();

  assert.equal(runtime.isStarted(), false);
  assert.deepEqual(events, [
    ["start"],
    ["error", "startup failed"],
    ["cleanup-b"],
    ["cleanup-a"],
    ["stopped"],
  ]);
});

test("createSelector memoizes derived view models by input values", () => {
  let calls = 0;
  const selector = createSelector([
    (state) => state.count,
    (state) => state.label,
  ], (count, label) => {
    calls += 1;
    return { title: `${label}:${count}` };
  });

  const first = selector({ count: 1, label: "ocr", ignored: "a" });
  const second = selector({ count: 1, label: "ocr", ignored: "b" });
  const third = selector({ count: 2, label: "ocr", ignored: "b" });

  assert.equal(first, second);
  assert.notEqual(second, third);
  assert.deepEqual(third, { title: "ocr:2" });
  assert.equal(calls, 2);
});

test("defineConnectedComponent renders from store snapshots and unsubscribes on unmount", () => {
  const store = createStore({
    name: "status",
    initialState: { percent: 0, stage: "ocr" },
    actions: {
      update(state, patch) {
        return { ...state, ...patch };
      },
    },
  });
  const renders = [];
  const component = defineConnectedComponent({
    name: "status-card",
    sources: { status: store },
    mapState: ({ status }, props) => ({
      text: `${props.prefix}:${status.stage}:${status.percent}`,
    }),
    render(viewModel, { meta }) {
      renders.push([viewModel.text, meta.initial === true, meta.source || "initial"]);
    },
  });
  const app = createRetainPdfApp();

  app.start();
  app.mount("status-card", component, { prefix: "job" });
  store.actions.update({ percent: 20 });
  app.unmount("status-card");
  store.actions.update({ percent: 40 });

  assert.deepEqual(renders, [
    ["job:ocr:0", true, "initial"],
    ["job:ocr:20", false, "status"],
  ]);
});
