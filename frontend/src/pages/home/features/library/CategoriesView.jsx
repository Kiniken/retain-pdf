// "分类"tab 的内容:文件夹卡片网格 + 点开一个文件夹后的书目列表。
//
// 图书馆网格的数据链路完全不动(调研计划「设计决策 2」)——文件夹展开时走
// collection_id → documents(拿 active_job_id)→ job_ids 过滤 library/books
// 这条桥接路径(services.collections.controller.fetchFolderBooks),换回来的
// 数据形状和图书馆首页卡片完全一致,直接复用现成的 RecentJobCard.jsx,不用
// 另外做一套"文件夹详情卡片"渲染,也不会有第二套删除确认气泡状态。

import { useCallback, useEffect, useState } from "react";
import { useHomeServices } from "../../home-services-context.js";
import { useStoreSnapshot } from "../../../../shared/react/use-store.js";
import { RecentJobCard } from "./RecentJobCard.jsx";

export function CategoriesView() {
  const services = useHomeServices();
  const { controller, dialogStore, reloadSignal } = services.collections;
  const { actions } = services.library;
  // CollectionManageDialog 挂在 HomeApp.jsx 顶层,和这个组件是兄弟节点
  // (不是父子),保存/删除后没法直接 prop 回调回来——靠一个共享的版本号信号
  // 桥接:对话框保存成功就 bump 一次,这里订阅到变化就重新拉取列表。
  const { version } = useStoreSnapshot(reloadSignal);

  const [collections, setCollections] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");

  const [openFolder, setOpenFolder] = useState(null);
  const [folderItems, setFolderItems] = useState([]);
  const [folderLoading, setFolderLoading] = useState(false);
  const [folderError, setFolderError] = useState("");
  const [confirmingDeleteJobId, setConfirmingDeleteJobId] = useState("");

  const reload = useCallback(() => {
    setListLoading(true);
    setListError("");
    return controller
      .listCollections()
      .then(({ collections: items = [] } = {}) => {
        setCollections(items);
        // 正在查看的文件夹如果被删了(管理弹窗里点了删除),退回文件夹网格。
        setOpenFolder((current) => {
          if (!current) {
            return current;
          }
          const stillExists = items.some((item) => item.collection_id === current.collection_id);
          return stillExists ? items.find((item) => item.collection_id === current.collection_id) : null;
        });
      })
      .catch((err) => setListError(err?.message || "读取分类失败，请稍后重试。"))
      .finally(() => setListLoading(false));
  }, [controller]);

  useEffect(() => {
    reload();
    // version 变化(对话框保存/删除成功)时重新拉取——不放进 reload 的依赖数组
    // 是因为 reload 本身引用稳定(useCallback([controller])),version 才是
    // 真正驱动"要不要再拉一次"的信号。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reload, version]);

  useEffect(() => {
    if (!openFolder) {
      setFolderItems([]);
      setFolderError("");
      return;
    }
    setFolderLoading(true);
    setFolderError("");
    controller
      .fetchFolderBooks(openFolder.collection_id)
      .then((items) => setFolderItems(items))
      .catch((err) => setFolderError(err?.message || "读取分类内容失败，请稍后重试。"))
      .finally(() => setFolderLoading(false));
  }, [controller, openFolder]);

  const handleToggleDeleteConfirm = useCallback((jobId) => {
    setConfirmingDeleteJobId(jobId || "");
  }, []);

  if (openFolder) {
    return (
      <section id="categories-folder-view" className="library-view categories-view" aria-label={`分类:${openFolder.name}`}>
        <div className="categories-folder-head">
          <button
            id="categories-back-btn"
            type="button"
            className="categories-back-btn"
            onClick={() => setOpenFolder(null)}
          >
            ← 返回分类
          </button>
          <h2>{openFolder.name}</h2>
        </div>
        {folderLoading ? (
          <div className="events-empty">正在加载…</div>
        ) : folderError ? (
          <div className="events-empty">{folderError}</div>
        ) : folderItems.length === 0 ? (
          <div className="events-empty">这个分类还没有书</div>
        ) : (
          <div className="recent-jobs-list library-grid">
            {folderItems.map((item) => (
              <RecentJobCard
                key={item.job_id}
                item={item}
                isConfirmingDelete={confirmingDeleteJobId === item.job_id}
                onSelect={actions.selectJob}
                onDelete={actions.deleteJob}
                onReader={actions.openJobReader}
                onToggleDeleteConfirm={handleToggleDeleteConfirm}
              />
            ))}
          </div>
        )}
      </section>
    );
  }

  return (
    <section id="categories-view" className="library-view categories-view" aria-label="分类">
      <div className="categories-head">
        <button
          id="categories-create-btn"
          type="button"
          className="app-button"
          onClick={() => dialogStore.open(null)}
        >
          新建分类
        </button>
      </div>
      {listLoading ? (
        <div className="events-empty">正在加载分类…</div>
      ) : listError ? (
        <div className="events-empty">{listError}</div>
      ) : collections.length === 0 ? (
        <div className="events-empty">还没有分类，点击"新建分类"给 PDF 分组</div>
      ) : (
        <div id="categories-grid" className="categories-grid">
          {collections.map((collection) => (
            <div key={collection.collection_id} className="category-card">
              <button
                type="button"
                className="category-card-open"
                onClick={() => setOpenFolder(collection)}
              >
                <span className="category-card-name" title={collection.name}>{collection.name}</span>
                <span className="category-card-count">{collection.document_count} 本</span>
              </button>
              <button
                type="button"
                className="category-card-manage"
                aria-label={`管理分类 ${collection.name}`}
                title="管理"
                onClick={() => dialogStore.open(collection)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 8.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Z" stroke="currentColor" strokeWidth="1.65" fill="none" />
                  <path d="M19.1 13.2c.06-.39.09-.79.09-1.2s-.03-.81-.09-1.2l2.02-1.55-1.9-3.29-2.38.96a8.01 8.01 0 0 0-2.08-1.2L14.4 3.2h-3.8l-.36 2.52c-.75.28-1.45.69-2.08 1.2l-2.38-.96-1.9 3.29L5.9 10.8c-.06.39-.09.79-.09 1.2s.03.81.09 1.2l-2.02 1.55 1.9 3.29 2.38-.96c.63.51 1.33.92 2.08 1.2l.36 2.52h3.8l.36-2.52c.75-.28 1.45-.69 2.08-1.2l2.38.96 1.9-3.29-2.02-1.55Z" stroke="currentColor" strokeWidth="1.45" strokeLinejoin="round" fill="none" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
