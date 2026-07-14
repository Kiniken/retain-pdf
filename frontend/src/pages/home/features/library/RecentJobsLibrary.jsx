// 图书馆网格根组件(蓝图 §2 features/library/)。
//
// 订阅设计(蓝图 §3):Library 本体走无 selector 全快照订阅——重渲 grid 函数
// 本体便宜,真正的性能隔离靠 RecentJobCard 的 memo + cardSignatureOf(见
// RecentJobCard.jsx),不做 per-card store 订阅(收益零,蓝图已验证)。
//
// 展示模式派生(经与引擎实测核实,非直觉设计——见 library-view-store.js 顶部
// 注释):recentJobsStatePort 的 batch() 分页提交在 storeDrivenRendering:true
// 下从不触发 viewPort.renderList/renderEmpty,所以"items.length > 0 优先"是
// 唯一不会陈旧的信号源;libraryViewStore 的 mode 只在 items 为空时才可信
// (loading/empty/error 三态由 renderLoading()/actions.js 的边缘路径驱动)。

import { useCallback, useRef, useState } from "react";
import { useStoreSnapshot } from "../../../../shared/react/use-store.js";
import { useHomeServices } from "../../home-services-context.js";
import { buildRecentJobsSummaryViewModel } from "../../../../js/features/recent-jobs/summary-view-model.js";
import { HOME_LOADING_STATES } from "../../../../js/features/home/state.js";
import { RecentJobCard } from "./RecentJobCard.jsx";
import { useLibraryAutoLoad } from "./useLibraryAutoLoad.js";

const VIEW_TEXT = Object.freeze({
  loadMore: "更多",
  loadMoreLoading: "加载中…",
  empty: "暂无最近任务",
  emptySearch: "没有匹配的书籍",
});

export function RecentJobsLibrary() {
  const services = useHomeServices();
  const { viewPort, recentJobsStore, actions } = services.library;

  const recentJobs = useStoreSnapshot(recentJobsStore);
  const homeState = useStoreSnapshot(services.stores.homeState);
  const view = useStoreSnapshot(viewPort.store);

  const [confirmingDeleteJobId, setConfirmingDeleteJobId] = useState("");
  const scrollBodyRef = useRef(null);

  const items = Array.isArray(recentJobs.items) ? recentJobs.items : [];
  const hasItems = items.length > 0;
  const isLoading = homeState.recentJobsLoadingState === HOME_LOADING_STATES.LOADING;
  const isErrorState = !hasItems
    && (homeState.recentJobsLoadingState === HOME_LOADING_STATES.ERROR || view.mode === "error");

  const mode = hasItems ? "list" : (isLoading ? "loading" : (isErrorState ? "error" : "empty"));
  const loadMoreLoading = hasItems && isLoading;
  const emptyMessage = view.query.trim() ? VIEW_TEXT.emptySearch : VIEW_TEXT.empty;
  const errorMessage = view.mode === "error" && view.message ? view.message : (homeState.recentJobsError || VIEW_TEXT.empty);

  const summary = buildRecentJobsSummaryViewModel(recentJobs.invocationSummary, items);

  useLibraryAutoLoad({
    scrollBodyRef,
    hasMore: Boolean(recentJobs.hasMore),
    loadMoreLoading,
    viewPort,
  });

  const handleToggleDeleteConfirm = useCallback((jobId) => {
    setConfirmingDeleteJobId(jobId || "");
  }, []);

  function handleLoadMoreClick() {
    viewPort.handlersRef.current.onLoadMore?.();
  }

  return (
    <section id="library-view" className="library-view" aria-label="图书馆">
      <div id="recent-jobs-scroll-body" className="library-scroll-body" ref={scrollBodyRef}>
        <div id="recent-jobs-summary" className="status-panel-note library-summary">{summary.text}</div>
        <div id="recent-jobs-empty" className={`events-empty${mode === "list" ? " hidden" : ""}`}>
          {mode === "loading" ? "正在加载最近任务…" : (mode === "error" ? errorMessage : emptyMessage)}
        </div>
        <div id="library-grid" className="recent-jobs-list library-grid">
          <div id="recent-jobs-list" className={`recent-jobs-list library-grid${mode === "list" ? "" : " hidden"}`}>
            {items.map((item) => (
              <RecentJobCard
                key={item.job_id}
                item={item}
                isConfirmingDelete={confirmingDeleteJobId === item.job_id}
                onSelect={actions.selectJob}
                onDelete={actions.deleteJob}
                onReader={actions.openJobReader}
                onReadSource={actions.openSourceReader}
                onTranslate={actions.translateDocument}
                onToggleDeleteConfirm={handleToggleDeleteConfirm}
              />
            ))}
          </div>
        </div>
        <div className="recent-jobs-more-row">
          <button
            id="load-more-jobs-btn"
            className={`secondary${recentJobs.hasMore ? "" : " hidden"}`}
            type="button"
            disabled={loadMoreLoading}
            onClick={handleLoadMoreClick}
          >
            {loadMoreLoading ? VIEW_TEXT.loadMoreLoading : VIEW_TEXT.loadMore}
          </button>
        </div>
      </div>
    </section>
  );
}

// 使用 handleSearchChange 的搜索输入框自身留在 LibraryBottomBar(HomeApp.jsx)
// 骨架里——图书馆网格与底部搜索栏是同级兄弟节点,不是父子关系(镜像
// partials/main-content.html)。导出这个 hook 供 HomeApp.jsx 复用同一条
// onSearch/query 通道,避免出现两条平行实现。
export function useLibrarySearchBinding() {
  const services = useHomeServices();
  const { viewPort } = services.library;
  const view = useStoreSnapshot(viewPort.store);

  function onSearchChange(event) {
    const value = event.target.value;
    viewPort.store.actions.setQuery(value);
    viewPort.handlersRef.current.onSearch?.(value);
  }

  return { query: view.query, onSearchChange };
}
