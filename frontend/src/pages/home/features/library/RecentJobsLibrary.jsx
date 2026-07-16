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

import { useMemo, useRef, useState } from "react";
import { useStoreSnapshot } from "../../../../shared/react/use-store.js";
import { useHomeServices } from "../../home-services-context.js";
import { buildRecentJobsSummaryViewModel } from "../../../../js/features/recent-jobs/summary-view-model.js";
import { HOME_LOADING_STATES } from "../../../../js/features/home/state.js";
import { RecentJobCard } from "./RecentJobCard.jsx";
import { BookListRow } from "./BookListRow.jsx";
import { LibraryToolbar } from "./LibraryToolbar.jsx";
import { LibraryFilterMenu, matchesLibraryFilter } from "./LibraryFilterMenu.jsx";
import { ContinueReadingShelf } from "./ContinueReadingShelf.jsx";
import { isLibraryOnlyItem } from "../../../../js/features/documents-library/document-card-item.js";
import { isRecentJobActive } from "../../../../js/features/recent-jobs/card-presenter.js";
import { useLibraryAutoLoad } from "./useLibraryAutoLoad.js";

// 客户端排序(只排已加载的这几页;/documents 无 sort 参数,和参考项目一样在前端排)。
function sortItems(items, sortMode) {
  const arr = [...items];
  const desc = (key) => (a, b) => `${b?.[key] || ""}`.localeCompare(`${a?.[key] || ""}`);
  switch (sortMode) {
    case "created": return arr.sort(desc("added_at"));
    case "opened": return arr.sort(desc("last_opened_at"));
    case "title":
      return arr.sort((a, b) => `${a?.title || a?.display_name || ""}`.localeCompare(`${b?.title || b?.display_name || ""}`, "zh-CN"));
    case "updated":
    default:
      return arr.sort(desc("updated_at"));
  }
}

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

  const scrollBodyRef = useRef(null);
  const [viewMode, setViewMode] = useState("grid");
  const [sortMode, setSortMode] = useState("updated");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("");

  const items = Array.isArray(recentJobs.items) ? recentJobs.items : [];

  // 标签列表 + 各状态计数(供筛选面板显示,基于已加载项)。
  const { tags, statusCounts } = useMemo(() => {
    const tagSet = new Set();
    const counts = { done: 0, untranslated: 0, active: 0, failed: 0 };
    for (const item of items) {
      (Array.isArray(item.tags) ? item.tags : []).forEach((t) => t && tagSet.add(t));
      if (isLibraryOnlyItem(item)) { counts.untranslated += 1; continue; }
      const s = `${item.status || ""}`.trim();
      if (isRecentJobActive(item)) counts.active += 1;
      else if (s === "succeeded") counts.done += 1;
      else if (s === "failed") counts.failed += 1;
    }
    return { tags: [...tagSet].sort((a, b) => a.localeCompare(b, "zh-CN")), statusCounts: counts };
  }, [items]);

  const visibleItems = useMemo(() => {
    const filtered = (statusFilter === "all" && !tagFilter)
      ? items
      : items.filter((item) => matchesLibraryFilter(item, statusFilter, tagFilter, { isLibraryOnly: isLibraryOnlyItem, isActive: isRecentJobActive }));
    return sortItems(filtered, sortMode);
  }, [items, statusFilter, tagFilter, sortMode]);

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

  function handleLoadMoreClick() {
    viewPort.handlersRef.current.onLoadMore?.();
  }

  // 继续阅读:已翻译 → 对照阅读;否则 → 读原文。
  function handleContinueRead(item) {
    if (`${item.status || ""}`.trim() === "succeeded") {
      actions.openJobReader(`${item.job_id || ""}`.trim());
      return;
    }
    const documentId = `${item.document_id || ""}`.trim();
    if (documentId) {
      actions.openSourceReader(documentId);
    }
  }

  return (
    <section id="library-view" className="library-view" aria-label="图书馆">
      <div id="recent-jobs-scroll-body" className="library-scroll-body" ref={scrollBodyRef}>
        <div id="recent-jobs-summary" className="status-panel-note library-summary">{summary.text}</div>
        <div id="recent-jobs-empty" className={`events-empty${mode === "list" ? " hidden" : ""}`}>
          {mode === "loading" ? "正在加载最近任务…" : (mode === "error" ? errorMessage : emptyMessage)}
        </div>
        {mode === "list" ? <ContinueReadingShelf items={items} onOpen={handleContinueRead} /> : null}
        {mode === "list" ? (
          <LibraryToolbar
            count={visibleItems.length}
            viewMode={viewMode}
            setViewMode={setViewMode}
            sortMode={sortMode}
            setSortMode={setSortMode}
            filterSlot={(
              <LibraryFilterMenu
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                tagFilter={tagFilter}
                setTagFilter={setTagFilter}
                tags={tags}
                statusCounts={statusCounts}
              />
            )}
          />
        ) : null}
        <div id="library-grid" className={viewMode === "list" ? "" : "recent-jobs-list library-grid"}>
          <div
            id="recent-jobs-list"
            className={`${viewMode === "list" ? "flex flex-col gap-1" : "recent-jobs-list library-grid"}${mode === "list" ? "" : " hidden"}`}
          >
            {visibleItems.map((item) => (
              viewMode === "list" ? (
                <BookListRow
                  key={item.job_id}
                  item={item}
                  onSelect={actions.selectJob}
                  onReader={actions.openJobReader}
                  onReadSource={actions.openSourceReader}
                  onOpenDetail={actions.openBookDetail}
                />
              ) : (
                <RecentJobCard
                  key={item.job_id}
                  item={item}
                  onSelect={actions.selectJob}
                  onReader={actions.openJobReader}
                  onReadSource={actions.openSourceReader}
                  onOpenDetail={actions.openBookDetail}
                />
              )
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
