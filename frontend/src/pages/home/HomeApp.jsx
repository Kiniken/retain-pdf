// home 页 React 编排根(Phase 3a:app-shell / upload / workflow 三域)。
//
// 结构对照 partials/main-content.html + dialogs.html 逐区块镜像:
// - 三域本阶段 React 化:AppShellHeader / 底部操作栏(添加按钮接工作流对话框)/
//   TranslationWorkflowDialog(内含 WorkflowPanel + HeroUpload)/ PageRangeDialog;
// - 其余区块(library-view 网格、status 卡、credentials/glossaries/status-detail/
//   reader 等对话框)3b/dialogs 已陆续接上;剩余占位容器 id/标签契约保留、内容留空。
//   占位自定义元素标签(<recent-jobs-dialog> 等)在新世界不注册定义,惰性无副作用。

import { useState } from "react";
import { HomeServicesProvider } from "./home-services-context.js";
import { useStoreSnapshot } from "../../shared/react/use-store.js";
import { useHomeServices } from "./home-services-context.js";
import { TRANSLATION_WORKFLOW_DIALOG } from "../../js/features/translation-workflow-dialog/contract.js";
import { AppShellHeader } from "./features/app-shell/AppShellHeader.jsx";
import { TranslationWorkflowDialog } from "./features/workflow/TranslationWorkflowDialog.jsx";
import { PageRangeDialog } from "./features/upload/PageRangeDialog.jsx";
import { RecentJobsLibrary, useLibrarySearchBinding } from "./features/library/RecentJobsLibrary.jsx";
import { LibraryTopTabs } from "./features/library/LibraryTopTabs.jsx";
import { CategoriesView } from "./features/library/CategoriesView.jsx";
import { CredentialsDialog } from "./features/credentials/CredentialsDialog.jsx";
import { GlossariesDialog } from "./features/glossaries/GlossariesDialog.jsx";
import { SettingsHubDialog } from "./features/settings/SettingsHubDialog.jsx";
import { StatusDetailDialog } from "./features/status-detail/StatusDetailDialog.jsx";
import { ReaderDialog } from "./features/reader/ReaderDialog.jsx";
import { CollectionManageDialog } from "./features/collections/CollectionManageDialog.jsx";
import { DownloadToastHost } from "../../shared/react/DownloadToastHost.jsx";
// library-search-island 自定义元素的唯一注册点。旧世界由 src/js/components/index.js
// 兜底 side-effect import 注册;该文件随 cutover 删除后,注册链路断了会导致下方
// JSX 里的 <library-search-island> 标签渲染成惰性空标签(数据契约上仍在,但搜索
// 功能静默失效——只有真实浏览器渲染能看出来,jsdom 不会报错)。这里显式接管注册。
import "../../js/islands/library-search/index.js";

function LibraryBottomBar({ showSearch }) {
  const services = useHomeServices();
  const dialog = useStoreSnapshot(services.stores.dialog);
  const open = Boolean(dialog.open);
  const { query, onSearchChange } = useLibrarySearchBinding();

  return (
    <div className="library-bottom-bar" aria-label="主页快捷操作">
      {showSearch ? (
        <div className="library-search-bar" role="search">
          <input
            id="library-search-input"
            type="search"
            autoComplete="off"
            placeholder="搜索书籍、任务或日期"
            aria-label="搜索书籍"
            value={query}
            onChange={onSearchChange}
          />
        </div>
      ) : <div className="library-search-bar-spacer" aria-hidden="true" />}
      <div className="library-bottom-actions" aria-label="快捷操作">
        <button
          id="library-add-pdf-btn"
          type="button"
          className={`library-bottom-action primary${open ? " is-active" : ""}`}
          aria-label="添加 PDF"
          title="添加 PDF"
          aria-controls="translation-workflow-dialog"
          aria-expanded={open ? "true" : "false"}
          data-workflow-open={open
            ? TRANSLATION_WORKFLOW_DIALOG.datasetValues.open
            : TRANSLATION_WORKFLOW_DIALOG.datasetValues.closed}
          data-workflow-mode={dialog.mode}
          onClick={() => services.workflowDialog.requestOpenUpload()}
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <span>添加</span>
        </button>
        <button
          id="app-settings-btn"
          type="button"
          className="library-bottom-action"
          aria-label="设置"
          title="设置"
          aria-controls="app-settings-dialog"
          onClick={() => services.settingsHub.dialogStore.open({ tab: "api" })}
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 8.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Z" stroke="currentColor" strokeWidth="1.65" />
            <path d="M19.1 13.2c.06-.39.09-.79.09-1.2s-.03-.81-.09-1.2l2.02-1.55-1.9-3.29-2.38.96a8.01 8.01 0 0 0-2.08-1.2L14.4 3.2h-3.8l-.36 2.52c-.75.28-1.45.69-2.08 1.2l-2.38-.96-1.9 3.29L5.9 10.8c-.06.39-.09.79-.09 1.2s.03.81.09 1.2l-2.02 1.55 1.9 3.29 2.38-.96c.63.51 1.33.92 2.08 1.2l.36 2.52h3.8l.36-2.52c.75-.28 1.45-.69 2.08-1.2l2.38.96 1.9-3.29-2.02-1.55Z" stroke="currentColor" strokeWidth="1.45" strokeLinejoin="round" />
          </svg>
          <span>设置</span>
        </button>
      </div>
    </div>
  );
}

function HomeShell() {
  // 顶部"图书馆/分类"分栏的激活 tab——纯页面级 UI 态,不建独立 store/不持久化
  // (刷新页面回到"图书馆"是可接受的默认行为)。
  const [activeLibraryTab, setActiveLibraryTab] = useState("library");
  const isLibraryTab = activeLibraryTab === "library";

  return (
    <>
      <main id="app-shell" className="page app-shell">
        <AppShellHeader />
        <LibraryTopTabs active={activeLibraryTab} onChange={setActiveLibraryTab} />
        {isLibraryTab ? (
          <>
            <RecentJobsLibrary />
            {/* 3b recent-jobs:搜索岛(library-search-island)接管 */}
            <library-search-island></library-search-island>
          </>
        ) : (
          <CategoriesView />
        )}
        <button id="open-query-btn" type="button" className="secondary hidden" aria-hidden="true">最近任务</button>
        <LibraryBottomBar showSearch={isLibraryTab} />
        {/* 3b 占位:最近任务对话框 */}
        <recent-jobs-dialog></recent-jobs-dialog>
        <SettingsHubDialog />
        <TranslationWorkflowDialog />
      </main>
      {/* dialogs.html 区块:upload 域的专业翻译对话框 + credentials 域已 React 化,其余占位(3b) */}
      <CredentialsDialog />
      <GlossariesDialog />
      <developer-auth-dialog></developer-auth-dialog>
      <developer-settings-dialog></developer-settings-dialog>
      <PageRangeDialog />
      <StatusDetailDialog />
      <ReaderDialog />
      <CollectionManageDialog />
      <DownloadToastHost />
    </>
  );
}

export function HomeApp({ services }) {
  return (
    <HomeServicesProvider value={services}>
      <HomeShell />
    </HomeServicesProvider>
  );
}
