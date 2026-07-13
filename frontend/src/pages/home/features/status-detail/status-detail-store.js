// StatusDetailDialog 的读面 store(蓝图 §1 "新 store"清单)。
//
// 两个并行段(数据源铁律,蓝图 §1.0 + §0 全局发现):
// - overview 段:headline/runtime/failure/rerun/job/eventsPayload——job/
//   eventsPayload 是原始数据(不是预拼好的 markup),StageHistoryList/
//   EventsList 直接从这两个字段用纯函数计算结构化数组(见对应组件文件)。
// - translation 段:createTranslationState() 状态袋的浅拷贝 + 少量 UI 态
//   (itemsLoading/itemDetailLoading/replayLoading/emptyMessage/errorText),
//   随 translation-data-port.js(kept)每次读写后同步。
//
// 本 store 与 features/status/status-card-store.js 的 statusCardStore 是两条
// 平行读路径,不合并——status-detail 自己 fetch(events/diagnostics/
// resumePlan),写入频率远低于状态卡的 1s 轮询,合并会污染 StatusCard 的高频
// 订阅快照(蓝图 §1.0 明确铁律)。

import { createStore } from "../../../../js/app-framework/store.js";

const EMPTY_OVERVIEW = Object.freeze({
  headline: { iconMarkup: "", jobId: "-", note: "" },
  runtime: {
    currentStage: "-",
    stageElapsed: "-",
    totalElapsed: "-",
    retryCount: "0",
    lastTransition: "-",
    terminalReason: "-",
    inputProtocol: "-",
    stageSpecVersion: "-",
    mathMode: "-",
  },
  failure: {
    summary: "-",
    category: "-",
    stage: "-",
    rootCause: "-",
    suggestion: "-",
    lastLogLine: "-",
    retryable: "-",
  },
  rerun: { enabled: false, status: "" },
  job: null,
  eventsPayload: null,
  finishedAtFallback: "",
});

const EMPTY_TRANSLATION = Object.freeze({
  jobId: "",
  loaded: false,
  summary: null,
  query: { finalStatus: "", q: "", limit: 20, offset: 0 },
  list: [],
  total: 0,
  selectedItemId: "",
  selectedItem: null,
  replay: null,
  itemsLoading: false,
  itemDetailLoading: false,
  replayLoading: false,
  emptyMessage: "",
  itemsErrorText: "",
  itemErrorText: "",
  replayErrorText: "",
});

export function createStatusDetailStore() {
  return createStore({
    name: "statusDetail",
    initialState: {
      overview: EMPTY_OVERVIEW,
      translation: EMPTY_TRANSLATION,
      rerunPending: false,
    },
    actions: {
      setOverview(state, overview = {}) {
        return { ...state, overview: { ...state.overview, ...overview } };
      },
      resetOverview(state) {
        return { ...state, overview: EMPTY_OVERVIEW };
      },
      setTranslation(state, translation = {}) {
        return { ...state, translation: { ...state.translation, ...translation } };
      },
      resetTranslation(state) {
        return { ...state, translation: EMPTY_TRANSLATION };
      },
      setRerunPending(state, pending = false) {
        return { ...state, rerunPending: Boolean(pending) };
      },
    },
  });
}
