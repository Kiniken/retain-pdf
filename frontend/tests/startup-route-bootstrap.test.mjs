import test from "node:test";
import assert from "node:assert/strict";

import {
  bootstrapStartupRoute,
  initializeIdleAndRecentJobs,
} from "../src/js/bootstrap/startup-route.js";
import {
  buildRecentJobsStartupMountPayload,
  buildRecentJobsStartupPorts,
} from "../src/js/bootstrap/startup-route-recent-jobs-payloads.js";
import {
  openReaderDirectly,
} from "../src/js/bootstrap/startup-reader-open-flow.js";
import {
  createStartupRoutePorts,
} from "../src/js/bootstrap/startup-route-ports.js";
import {
  createStartupRouteReaderPort,
} from "../src/js/bootstrap/startup-route-reader-port.js";
import {
  createStartupRouteRecentJobsPort,
} from "../src/js/bootstrap/startup-route-recent-jobs-port.js";
import {
  createStartupRouteHomeStatePort,
} from "../src/js/bootstrap/startup-route-home-state-port.js";
import {
  createStartupRouteRecentJobsFeaturePort,
} from "../src/js/bootstrap/startup-route-recent-jobs-feature-port.js";
import {
  createStartupRouteRecentJobsControllerPort,
} from "../src/js/bootstrap/startup-route-recent-jobs-controller-port.js";
import {
  createStartupRouteRecentJobsReaderPort,
} from "../src/js/bootstrap/startup-route-recent-jobs-reader-port.js";
import {
  createStartupRouteRecentJobsRuntimePort,
} from "../src/js/bootstrap/startup-route-recent-jobs-runtime-port.js";
import {
  createStartupRouteRecentJobsStatePort,
} from "../src/js/bootstrap/startup-route-recent-jobs-state-port.js";
import {
  createStartupRouteRuntimePort,
} from "../src/js/bootstrap/startup-route-runtime-port.js";
import {
  createStartupRouteConfigPort,
} from "../src/js/bootstrap/startup-route-config-port.js";
import {
  createStartupRouteUiPort,
} from "../src/js/bootstrap/startup-route-ui-port.js";

function nextTick() {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

test("startup route initializes recent jobs through startup ports", () => {
  const calls = [];
  let mountedPayload;
  const ports = createStartupRoutePorts({
    apiPrefix: "/custom/api",
    createHomeStatePort: (targetState) => {
      calls.push(["home-state", targetState.marker]);
      return { kind: "home" };
    },
    createRecentJobsReaderPort: ({ openReader }) => {
      calls.push(["reader-port"]);
      return { openReader };
    },
    createRecentJobsRuntimePort: ({ currentJobId }) => {
      calls.push(["runtime-port", currentJobId()]);
      return { kind: "runtime" };
    },
    createRecentJobsStatePort: (targetState) => {
      calls.push(["recent-state", targetState.marker]);
      return { kind: "recent" };
    },
    mountRecentJobsFeature: (payload) => {
      mountedPayload = payload;
      calls.push(["mount", payload.apiPrefix, payload.homeStatePort.kind, payload.recentJobsStatePort.kind]);
    },
  });
  const fetchJobList = async () => {};
  const fetchJobPayload = async () => {};
  const fetchLibraryBookList = async () => {};
  const deleteLibraryBook = async () => {};
  const libraryEventPort = {};

  initializeIdleAndRecentJobs({
    appShellFeature: {
      initializeIdleView: () => calls.push(["idle"]),
    },
    deleteLibraryBook,
    fetchJobList,
    fetchJobPayload,
    fetchLibraryBookList,
    fetchProtected: async () => {},
    jobRuntimeFeature: {
      currentJobId: () => "job-current",
      startPolling: (jobId) => calls.push(["poll", jobId]),
    },
    libraryEventPort,
    ports,
    state: { marker: "state-1" },
  });

  assert.equal(mountedPayload.fetchJobList, fetchJobList);
  assert.equal(mountedPayload.fetchJobPayload, fetchJobPayload);
  assert.equal(mountedPayload.fetchLibraryBookList, fetchLibraryBookList);
  assert.equal(mountedPayload.deleteLibraryBook, deleteLibraryBook);
  assert.equal(mountedPayload.libraryRefreshPort, libraryEventPort);
  assert.equal(mountedPayload.currentJobId(), "job-current");
  mountedPayload.startPolling("job-from-card");
  assert.deepEqual(calls, [
    ["idle"],
    ["home-state", "state-1"],
    ["recent-state", "state-1"],
    ["runtime-port", "job-current"],
    ["reader-port"],
    ["mount", "/custom/api", "home", "recent"],
    ["poll", "job-from-card"],
  ]);
});

test("startup recent jobs payload keeps reader open success and error paths", async () => {
  const calls = [];
  let mountedPayload;
  const ports = createStartupRoutePorts({
    apiPrefix: "/custom/api",
    createHomeStatePort: () => ({ kind: "home" }),
    createRecentJobsReaderPort: ({ openReader }) => ({ openReader }),
    createRecentJobsRuntimePort: ({ openJob, currentJobId }) => ({ openJob, currentJobId }),
    createRecentJobsStatePort: () => ({ kind: "recent" }),
    ensureReaderDialogFeature: async ({ state }) => ({
      open: ({ jobId }) => calls.push(["open", jobId, state.currentJobSnapshot?.job_id]),
    }),
    mountRecentJobsFeature: (payload) => {
      mountedPayload = payload;
    },
    jobPresentationPort: {
      normalizeJobPayload: (payload) => ({
        ...payload,
        normalized: true,
      }),
    },
  });

  initializeIdleAndRecentJobs({
    appShellFeature: { initializeIdleView: () => calls.push(["idle"]) },
    deleteLibraryBook: async () => {},
    fetchJobList: async () => {},
    fetchJobPayload: async (jobId, apiPrefix) => {
      calls.push(["fetch-job", jobId, apiPrefix]);
      return {
        job_id: jobId,
        status: "succeeded",
      };
    },
    fetchLibraryBookList: async () => {},
    fetchProtected: async () => "protected",
    jobRuntimeFeature: {
      currentJobId: () => "job-current",
      startPolling: (jobId) => calls.push(["poll", jobId]),
    },
    libraryEventPort: {},
    ports,
    setText: (id, text) => calls.push(["text", id, text]),
    state: { marker: "state-reader" },
  });

  mountedPayload.readerPort.openReader("job-reader");
  await nextTick();
  mountedPayload.jobRuntimePort.openJob("job-open");
  assert.equal(mountedPayload.jobRuntimePort.currentJobId(), "job-current");
  assert.deepEqual(calls, [
    ["idle"],
    ["poll", "job-reader"],
    ["fetch-job", "job-reader", "/custom/api"],
    ["open", "job-reader", "job-reader"],
    ["poll", "job-open"],
  ]);

  const failingCalls = [];
  let failingPayload;
  const failingPorts = createStartupRoutePorts({
    apiPrefix: "/custom/api",
    createHomeStatePort: () => ({ kind: "home" }),
    createRecentJobsReaderPort: ({ openReader }) => ({ openReader }),
    createRecentJobsRuntimePort: () => ({ kind: "runtime" }),
    createRecentJobsStatePort: () => ({ kind: "recent" }),
    ensureReaderDialogFeature: async () => {
      throw new Error("reader failed");
    },
    mountRecentJobsFeature: (payload) => {
      failingPayload = payload;
    },
  });

  initializeIdleAndRecentJobs({
    appShellFeature: null,
    deleteLibraryBook: async () => {},
    fetchJobList: async () => {},
    fetchJobPayload: async () => {},
    fetchLibraryBookList: async () => {},
    fetchProtected: async () => "protected",
    jobRuntimeFeature: {
      startPolling: (jobId) => failingCalls.push(["poll", jobId]),
    },
    libraryEventPort: {},
    ports: failingPorts,
    setText: (id, text) => failingCalls.push(["text", id, text]),
    state: { marker: "state-reader" },
  });
  failingPayload.readerPort.openReader("job-error");
  await nextTick();

  assert.equal(failingCalls[0][0], "poll");
  assert.equal(failingCalls[0][1], "job-error");
  assert.equal(failingCalls[1][0], "text");
  assert.equal(failingCalls[1][1], "error-box");
  assert.equal(failingCalls[1][2].kind, "error-diagnostic");
  assert.equal(failingCalls[1][2].summary, "从最近任务打开阅读器失败：reader failed");
  assert.match(failingCalls[1][2].diagnostic, /job_id: job-error/);
});

test("startup recent jobs payload builders expose explicit startup dependencies", () => {
  const calls = [];
  const state = { marker: "state-builder" };
  const homeStatePort = { kind: "home" };
  const recentJobsStatePort = { kind: "recent" };
  const ports = {
    apiPrefix: "/api",
    createHomeStatePort: (value) => {
      calls.push(["home", value.marker]);
      return homeStatePort;
    },
    createRecentJobsReaderPort: ({ openReader }) => ({ openReader }),
    createRecentJobsRuntimePort: ({ currentJobId, openJob }) => ({ currentJobId, openJob }),
    createRecentJobsStatePort: (value) => {
      calls.push(["recent", value.marker]);
      return recentJobsStatePort;
    },
    ensureReaderDialogFeature: async () => ({ open() {} }),
  };
  const jobRuntimeFeature = {
    currentJobId: () => "job-current",
    startPolling: (jobId) => calls.push(["poll", jobId]),
  };
  const startupPorts = buildRecentJobsStartupPorts({
    fetchProtected: async () => {},
    jobRuntimeFeature,
    ports,
    setTextFn: () => {},
    state,
  });
  const libraryEventPort = {};
  const fetchJobList = async () => {};
  const fetchJobPayload = async () => {};
  const fetchLibraryBookList = async () => {};
  const deleteLibraryBook = async () => {};
  const payload = buildRecentJobsStartupMountPayload({
    deleteLibraryBook,
    fetchJobList,
    fetchJobPayload,
    fetchLibraryBookList,
    jobRuntimeFeature,
    libraryEventPort,
    ports,
    startupPorts,
  });

  assert.equal(startupPorts.homeStatePort, homeStatePort);
  assert.equal(startupPorts.recentJobsStatePort, recentJobsStatePort);
  assert.equal(startupPorts.jobRuntimePort.currentJobId(), "job-current");
  startupPorts.jobRuntimePort.openJob("job-open");
  assert.equal(payload.fetchJobList, fetchJobList);
  assert.equal(payload.fetchJobPayload, fetchJobPayload);
  assert.equal(payload.fetchLibraryBookList, fetchLibraryBookList);
  assert.equal(payload.deleteLibraryBook, deleteLibraryBook);
  assert.equal(payload.libraryRefreshPort, libraryEventPort);
  assert.equal(payload.readerPort, startupPorts.readerPort);
  assert.equal(payload.apiPrefix, "/api");
  assert.equal(payload.currentJobId(), "job-current");
  payload.startPolling("job-start");
  assert.deepEqual(calls, [
    ["home", "state-builder"],
    ["recent", "state-builder"],
    ["poll", "job-open"],
    ["poll", "job-start"],
  ]);
});

test("startup reader open flow routes reader feature through startup ports", async () => {
  const calls = [];
  const state = { marker: "reader-state" };
  const fetchProtected = async () => ({ ok: true });
  const setTextFn = () => {};
  const runtimePort = { marker: "reader-runtime" };

  await openReaderDirectly({
    fetchProtected,
    jobId: "job-reader",
    setTextFn,
    state,
    ports: {
      readerDialogRuntimePort: runtimePort,
      ensureReaderDialogFeature: async (payload) => {
        calls.push(["ensure", payload]);
        return {
          open: (payload) => calls.push(["open", payload]),
        };
      },
    },
  });

  assert.deepEqual(calls, [
    ["ensure", { state, fetchProtected, runtimePort, setTextFn }],
    ["open", { jobId: "job-reader" }],
  ]);
});

test("startup route ports expose grouped runtime recent-jobs reader and ui ports", async () => {
  const configPort = createStartupRouteConfigPort({
    apiPrefix: "/startup/api",
  });
  const runtimePort = createStartupRouteRuntimePort({
    configPort,
    getRequestedJobIdFromLocation: () => "job-route",
  });
  const legacyOverrideRuntimePort = createStartupRouteRuntimePort({
    apiPrefix: "/legacy-startup/api",
  });
  const homeStatePort = createStartupRouteHomeStatePort({
    createHomeStatePort: () => ({ kind: "home-route" }),
  });
  const recentJobsControllerPort = createStartupRouteRecentJobsControllerPort({
    mountRecentJobsFeature: () => ({ kind: "recent-mounted" }),
  });
  const recentJobsReaderPort = createStartupRouteRecentJobsReaderPort({
    createRecentJobsReaderPort: () => ({ kind: "recent-reader" }),
  });
  const recentJobsRuntimePort = createStartupRouteRecentJobsRuntimePort({
    createRecentJobsRuntimePort: () => ({ kind: "recent-runtime" }),
  });
  const recentJobsStatePort = createStartupRouteRecentJobsStatePort({
    createRecentJobsStatePort: () => ({ kind: "recent-route" }),
  });
  const recentJobsFeaturePort = createStartupRouteRecentJobsFeaturePort({
    controllerPort: recentJobsControllerPort,
    readerPort: recentJobsReaderPort,
    runtimePort: recentJobsRuntimePort,
    statePort: recentJobsStatePort,
  });
  const recentJobsPort = createStartupRouteRecentJobsPort({
    homeStatePort,
    recentJobsFeaturePort,
  });
  const readerPort = createStartupRouteReaderPort({
    ensureReaderDialogFeature: async () => ({ open() {} }),
  });
  const uiPort = createStartupRouteUiPort({
    setText: () => {},
  });
  const ports = createStartupRoutePorts({
    readerPort,
    recentJobsPort,
    runtimePort,
    uiPort,
  });

  assert.equal(ports.readerPort, readerPort);
  assert.equal(ports.recentJobsPort, recentJobsPort);
  assert.equal(recentJobsPort.homeStatePort, homeStatePort);
  assert.equal(recentJobsPort.recentJobsFeaturePort, recentJobsFeaturePort);
  assert.equal(recentJobsFeaturePort.controllerPort, recentJobsControllerPort);
  assert.equal(recentJobsFeaturePort.readerPort, recentJobsReaderPort);
  assert.equal(recentJobsFeaturePort.runtimePort, recentJobsRuntimePort);
  assert.equal(recentJobsFeaturePort.statePort, recentJobsStatePort);
  assert.equal(ports.runtimePort, runtimePort);
  assert.equal(runtimePort.configPort, configPort);
  assert.equal(legacyOverrideRuntimePort.apiPrefix, "/legacy-startup/api");
  assert.equal(ports.uiPort, uiPort);
  assert.equal(ports.apiPrefix, "/startup/api");
  assert.equal(ports.getRequestedJobIdFromLocation(), "job-route");
  assert.deepEqual(ports.createHomeStatePort(), { kind: "home-route" });
  assert.deepEqual(ports.createRecentJobsStatePort(), { kind: "recent-route" });
  assert.deepEqual(ports.createRecentJobsReaderPort(), { kind: "recent-reader" });
  assert.deepEqual(ports.createRecentJobsRuntimePort(), { kind: "recent-runtime" });
  assert.deepEqual(ports.mountRecentJobsFeature(), { kind: "recent-mounted" });
  assert.equal(ports.mountRecentJobsFeature, recentJobsPort.mountRecentJobsFeature);
  assert.equal(typeof (await ports.ensureReaderDialogFeature()).open, "function");
  assert.equal(ports.setText, uiPort.setText);
});

test("startup route opens requested reader job through startup ports", async () => {
  const calls = [];
  const ports = createStartupRoutePorts({
    ensureReaderDialogFeature: async ({ state, fetchProtected, setTextFn }) => {
      calls.push(["ensure-reader", state.marker, await fetchProtected(), typeof setTextFn]);
      return {
        open: ({ jobId }) => calls.push(["open", jobId]),
      };
    },
    getRequestedJobIdFromLocation: () => "job-from-url",
    getRequestedReaderJobIdFromLocation: () => "reader-job",
    setTimeoutFn: (handler, delay) => {
      calls.push(["timeout", delay]);
      void handler();
    },
  });

  bootstrapStartupRoute({
    fetchProtected: async () => "protected",
    jobRuntimeFeature: {
      startPolling: (jobId) => calls.push(["poll", jobId]),
    },
    ports,
    setText: (id, text) => calls.push(["text", id, text]),
    state: { marker: "state-2" },
  });
  await nextTick();

  assert.deepEqual(calls, [
    ["poll", "reader-job"],
    ["timeout", 0],
    ["ensure-reader", "state-2", "protected", "function"],
    ["open", "reader-job"],
  ]);
});

test("startup route polls ordinary job urls without opening reader", async () => {
  const calls = [];
  const ports = createStartupRoutePorts({
    ensureReaderDialogFeature: async () => {
      calls.push(["ensure-reader"]);
      return { open: () => calls.push(["open-reader"]) };
    },
    getRequestedJobIdFromLocation: () => "job-from-url",
    getRequestedReaderJobIdFromLocation: () => "",
    setTimeoutFn: () => calls.push(["timeout"]),
  });

  bootstrapStartupRoute({
    fetchProtected: async () => "protected",
    jobRuntimeFeature: {
      startPolling: (jobId) => calls.push(["poll", jobId]),
    },
    ports,
    state: { marker: "state-ordinary" },
  });
  await nextTick();

  assert.deepEqual(calls, [
    ["poll", "job-from-url"],
  ]);
});
