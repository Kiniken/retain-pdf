// 整合顶部导航栏(方案 A,替代原先 AppShellHeader/LibraryTopTabs/
// LibraryBottomBar 三处分离的布局)——logo、图书馆/分类分栏、搜索框、添加/
// 设置按钮全部收进同一条白底导航栏,不再有底部悬浮搜索栏。
//
// 契约 id 全部原样保留(library-search-input/library-add-pdf-btn/
// app-settings-btn 及其 aria-*/data-* 属性),只是从"分散在 app-shell 底部
// fixed 定位的浮动条"挪进"顶部同一行",消费方(测试/其余组件)不用改。

import { useHomeServices } from "../../home-services-context.js";
import { useStoreSnapshot } from "../../../../shared/react/use-store.js";
import { TRANSLATION_WORKFLOW_DIALOG } from "../../../../js/features/translation-workflow-dialog/contract.js";
import { LibraryTopTabs } from "../library/LibraryTopTabs.jsx";
import { useLibrarySearchBinding } from "../library/RecentJobsLibrary.jsx";

export function AppTopBar({ activeTab, onTabChange, showSearch }) {
  const services = useHomeServices();
  const dialog = useStoreSnapshot(services.stores.dialog);
  const open = Boolean(dialog.open);
  const { query, onSearchChange } = useLibrarySearchBinding();

  return (
    <app-shell-header class="app-shell-header">
      <header className="topbar library-topbar">
        <a
          className="hero-repo-link library-brand-link"
          href="https://github.com/wxyhgk/retain-pdf"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img className="hero-repo-logo" src="src/assets/RetainPDF-logo.svg" alt="RetainPDF logo" />
          <span>RetainPDF</span>
        </a>
        <div className="hero-actions hidden" aria-hidden="true">
          <button id="developer-btn" type="button" className="secondary hidden" aria-hidden="true">开发者</button>
          <button id="open-output-btn" type="button" className="secondary hidden">打开输出目录</button>
        </div>
        <LibraryTopTabs active={activeTab} onChange={onTabChange} />
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
      </header>
    </app-shell-header>
  );
}
